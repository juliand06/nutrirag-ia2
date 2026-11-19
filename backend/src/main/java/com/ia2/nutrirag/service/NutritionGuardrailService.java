package com.ia2.nutrirag.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Guardrail Híbrido Nutricional (LLM Semántico + Heurística Calibrada):
 * Evita falsos positivos/negativos clasificando la intención con el LLM configurado
 * en el servidor (OpenAI/Gemini) y usando una capa semántica determinista rápida
 * como primera verificación y respaldo sin latencia.
 */
@Service
@Slf4j
public class NutritionGuardrailService {

    @Value("${nutrirag.ai.provider:DEMO}")
    private String aiProvider;

    @Value("${nutrirag.ai.openai-api-key:}")
    private String openAiApiKey;

    @Value("${nutrirag.ai.gemini-api-key:}")
    private String geminiApiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    private static final List<String> CLEAR_NUTRITION_SIGNALS = List.of(
            "caloria", "kcal", "carbohidrato", "proteina", "grasa", "fibra", "dieta", "nutricion",
            "alimento", "comida", "desayuno", "almuerzo", "cena", "merienda", "agua", "hidratacion",
            "peso", "metabolismo", "tmb", "imc", "glucosa", "insulina", "colesterol", "hipertension",
            "anemia", "hierro", "vitamina", "omega", "menu", "plato", "receta", "ayuno", "salud"
    );

    private static final List<String> CLEAR_OFF_TOPIC_SIGNALS = List.of(
            "champions", "partido de futbol", "elecciones", "presidente", "nullpointerexception",
            "javascript", "python", "compilar", "bitcoin", "criptomoneda", "trading", "videojuego",
            "derivada", "integral", "horoscopo"
    );

    public GuardrailEvaluation evaluateQuery(String rawQuery) {
        if (rawQuery == null || rawQuery.trim().length() < 2) {
            return new GuardrailEvaluation(false,
                    "Tu mensaje llegó vacío o incompleto. Cuéntame sobre tu alimentación, calorías, metas o comidas y con gusto te ayudo. (Orientación informativa; no reemplaza a un profesional).");
        }

        String normalized = rawQuery.toLowerCase(Locale.ROOT);
        boolean hasClearNutrition = CLEAR_NUTRITION_SIGNALS.stream().anyMatch(normalized::contains);
        boolean hasClearOffTopic = CLEAR_OFF_TOPIC_SIGNALS.stream().anyMatch(normalized::contains);

        // 1. Casos inequívocos: respuesta instantánea sin costo LLM
        if (hasClearNutrition && !hasClearOffTopic) {
            return new GuardrailEvaluation(true, null);
        }
        if (hasClearOffTopic && !hasClearNutrition) {
            return new GuardrailEvaluation(false, buildCalmRedirect());
        }

        // 2. Casos ambiguos: clasificación semántica con el LLM del servidor (evita falsos positivos/negativos)
        Boolean llmDecision = classifyIntentWithLlm(rawQuery);
        if (llmDecision != null) {
            return llmDecision
                    ? new GuardrailEvaluation(true, null)
                    : new GuardrailEvaluation(false, buildCalmRedirect());
        }

        // 3. Respaldo heurístico equilibrado para frases cortas o saludos
        if (normalized.split("\\s+").length <= 3) {
            return new GuardrailEvaluation(true, null);
        }
        return new GuardrailEvaluation(false, buildCalmRedirect());
    }

    @SuppressWarnings("unchecked")
    private Boolean classifyIntentWithLlm(String query) {
        try {
            String classifierPrompt = "Clasifica si la siguiente consulta pertenece al dominio de nutrición, alimentación, salud metabólica, ejercicio o bienestar físico. Responde SOLO con ALLOW o BLOCK.\nConsulta: " + query;

            if ("OPENAI".equalsIgnoreCase(aiProvider) && openAiApiKey != null && !openAiApiKey.isBlank()) {
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                headers.setBearerAuth(openAiApiKey.trim());
                Map<String, Object> body = Map.of(
                        "model", "gpt-4o-mini",
                        "max_tokens", 8,
                        "temperature", 0,
                        "messages", List.of(Map.of("role", "user", "content", classifierPrompt))
                );
                ResponseEntity<Map> res = restTemplate.postForEntity(
                        "https://api.openai.com/v1/chat/completions",
                        new HttpEntity<>(body, headers),
                        Map.class
                );
                if (res.getStatusCode().is2xxSuccessful() && res.getBody() != null) {
                    String text = res.getBody().toString().toUpperCase(Locale.ROOT);
                    return text.contains("ALLOW");
                }
            }

            if ("GEMINI".equalsIgnoreCase(aiProvider) && geminiApiKey != null && !geminiApiKey.isBlank()) {
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                Map<String, Object> body = Map.of(
                        "generationConfig", Map.of("maxOutputTokens", 8, "temperature", 0),
                        "contents", List.of(Map.of("parts", List.of(Map.of("text", classifierPrompt))))
                );
                ResponseEntity<Map> res = restTemplate.postForEntity(
                        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=" + geminiApiKey.trim(),
                        new HttpEntity<>(body, headers),
                        Map.class
                );
                if (res.getStatusCode().is2xxSuccessful() && res.getBody() != null) {
                    String text = res.getBody().toString().toUpperCase(Locale.ROOT);
                    return text.contains("ALLOW");
                }
            }
        } catch (Exception ex) {
            log.debug("Fallback guardrail determinista tras error LLM: {}", ex.getMessage());
        }
        return null;
    }

    private String buildCalmRedirect() {
        return "Con mucho gusto te ayudo, pero mi especialidad es exclusivamente **nutrición, alimentación saludable, calorías, hábitos y bienestar físico**. ¿Qué comida, meta o consulta nutricional te gustaría revisar hoy? *(Orientación informativa; no reemplaza a un profesional).*";
    }

    public record GuardrailEvaluation(boolean allowed, String calmRedirectMessage) {}
}
