package com.ia2.nutrirag.service;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;

/**
 * Requerimiento #3: Guardrail temático de Nutrición, Alimentación y Bienestar.
 * Si el usuario pregunta algo ajeno a la nutrición (programación, política, deportes, matemáticas,
 * o escribe un error común/texto sin sentido), responde con calma e invita a consultar sobre alimentación.
 */
@Service
public class NutritionGuardrailService {

    private static final List<String> NUTRITION_KEYWORDS = List.of(
            "caloria", "calorías", "kcal", "carbohidrato", "proteina", "proteína", "grasa", "lipido", "lípido",
            "fibra", "dieta", "nutricion", "nutrición", "alimento", "comida", "comer", "desayuno", "almuerzo",
            "cena", "merienda", "snack", "fruta", "verdura", "vegetal", "pollo", "carne", "pescado", "huevo",
            "arroz", "avena", "pan", "pasta", "azucar", "azúcar", "glucosa", "insulina", "indice glucemico",
            "peso", "adelgazar", "deficit", "déficit", "superavit", "superávit", "masa muscular", "hipertrofia",
            "hidratacion", "hidratación", "agua", "vitamina", "mineral", "hierro", "calcio", "magnesio",
            "omega", "colesterol", "trigliceridos", "ayuno", "metabolismo", "basal", "tmb", "imc", "salud",
            "bienestar", "digestion", "digestión", "microbiota", "receta", "plato", "porcion", "porción",
            "gramos", "etiqueta", "ultraprocesado", "vegano", "vegetariano", "celiaco", "gluten", "lactosa",
            "pdf", "documento", "plan", "guia", "guía", "expediente", "tabla", "hola", "buenos dias", "buenas"
    );

    private static final List<String> OFF_TOPIC_TRIGGERS = List.of(
            "futbol", "fútbol", "partido", "champions", "politica", "política", "presidente", "elecciones",
            "programar", "java", "python", "javascript", "codigo", "código", "sql", " NullPointerException",
            "404", "500", "videojuego", "pelicula", "película", "criptomoneda", "bitcoin", "trading",
            "ecuacion", "ecuación", "derivada", "integral", "historia", "geografia", "capital de", "chiste",
            "horoscopo", "horóscopo", "clima", "trafico", "tráfico"
    );

    public GuardrailEvaluation evaluateQuery(String rawQuery) {
        if (rawQuery == null || rawQuery.trim().length() < 2) {
            return new GuardrailEvaluation(false,
                    "¡Hola! Parece que el mensaje llegó vacío o incompleto 😊. No te preocupes, estoy aquí para ayudarte con todo lo relacionado con tu **alimentación, cálculo de calorías, carbohidratos, lectura de tus planes nutricionales en PDF o análisis de fotos de tus comidas**. ¿Qué te gustaría consultar hoy?");
        }

        String normalized = rawQuery.toLowerCase(Locale.ROOT);

        boolean hasNutritionTerm = NUTRITION_KEYWORDS.stream().anyMatch(normalized::contains);
        boolean hasOffTopicTerm = OFF_TOPIC_TRIGGERS.stream().anyMatch(normalized::contains);

        if (hasOffTopicTerm && !hasNutritionTerm) {
            return new GuardrailEvaluation(false,
                    "Entiendo tu curiosidad 😊, pero soy **NutriRAG AI**, un asistente especializado exclusivamente en **nutrición, alimentación saludable, control de calorías, macronutrientes y bienestar**. " +
                    "Sobre ese tema no puedo ayudarte, pero con mucho gusto puedo orientarte sobre cuántas calorías y carbohidratos necesitan tus comidas, analizar una foto de tu plato o consultar tus guías nutricionales indexadas. ¿Te gustaría que revisemos alguna comida o meta nutricional?");
        }

        if (!hasNutritionTerm && normalized.split("\\s+").length > 3) {
            return new GuardrailEvaluation(false,
                    "¡Hola! Con toda tranquilidad te comento que mi especialidad está enfocada en **nutrición, calorías, carbohidratos, análisis de comidas y bienestar corporal** 🥗. " +
                    "¿Podrías reformular tu pregunta enfocándola en tu alimentación, tus requerimientos calóricos o los documentos nutricionales que tienes cargados en el sistema?");
        }

        return new GuardrailEvaluation(true, null);
    }

    public record GuardrailEvaluation(boolean allowed, String calmRedirectMessage) {}
}

