package com.ia2.nutrirag.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Endpoints REST de la Plataforma Clínica Nutricional (NutriStudio AI):
 * - Productividad alimenticia por país
 * - Rúbricas médicas globales (OMS, FAO, ADA, AHA/DASH, ISSN, ESPEN, KDIGO, EASL)
 * - Conector real SMART on FHIR R4 (HAPI FHIR / SMART Health IT) con consentimiento informado
 * - Política de gobernanza y ahorro de tokens para uso diario continuo
 */
@RestController
@RequestMapping("/api/platform")
public class ClinicalPlatformController {

    @Value("${nutrirag.fhir.base-url:https://hapi.fhir.org/baseR4}")
    private String configuredFhirBaseUrl;

    @GetMapping("/countries")
    public List<Map<String, Object>> getCountryFoodProductivity() {
        return List.of(
                Map.of("code", "CO", "name", "Colombia", "plus", "Plátano verde (almidón resistente), frijol cargamanto, aguacate Hass, guayaba (228mg Vit C), trucha y huevo."),
                Map.of("code", "MX", "name", "México", "plus", "Maíz nixtamalizado (calcio), frijol negro, nopal (control glucémico), aguacate, amaranto y chía."),
                Map.of("code", "PE", "name", "Perú", "plus", "Quinua real, camote, palta, lentejas y pescados azules ricos en Omega-3 (bonito/caballa)."),
                Map.of("code", "AR", "name", "Argentina", "plus", "Cortes magros, zapallo/calabaza, lentejas, avena arrollada y maní natural."),
                Map.of("code", "CL", "name", "Chile", "plus", "Jurel (Omega-3 accesible), palta Hass, porotos, avena integral y arándanos."),
                Map.of("code", "EC", "name", "Ecuador", "plus", "Chochos (récord de proteína vegetal), plátano verde, quinua, atún y aguacate."),
                Map.of("code", "ES", "name", "España", "plus", "Aceite de oliva virgen extra (AOVE), garbanzos, sardinas/caballa y dieta mediterránea."),
                Map.of("code", "US", "name", "Estados Unidos", "plus", "Yogur griego proteico, pechuga de pavo/pollo, avena, sweet potato y berries congeladas.")
        );
    }

    @GetMapping("/clinical-rubrics")
    public List<Map<String, String>> getGlobalClinicalRubrics() {
        return List.of(
                Map.of("id", "resistencia_insulina_diabetes", "authority", "ADA", "rule", "Orden de ingesta fibra -> proteína -> carbohidratos complejos y carga glucémica baja."),
                Map.of("id", "hipertension_cardiovascular", "authority", "AHA / DASH", "rule", "Sodio < 2,000 mg/día, potasio alto y grasas monoinsaturadas/Omega-3."),
                Map.of("id", "colesterol_trigliceridos", "authority", "AHA / OMS", "rule", "Beta-glucanos (avena), legumbres y reducción de azúcares simples y grasas saturadas."),
                Map.of("id", "higado_graso_metabolico", "authority", "EASL / ESPEN", "rule", "Reducción ponderal gradual 7-10%, cero bebidas azucaradas, patrón mediterráneo y Omega-3."),
                Map.of("id", "salud_renal_kdigo", "authority", "KDIGO", "rule", "Control de sodio y fósforo inorgánico de ultraprocesados, proteína supervisada."),
                Map.of("id", "rendimiento_deportivo", "authority", "ISSN", "rule", "1.6-2.2 g/kg de proteína distribuida en 3-4 tomas y crononutrición peri-entreno.")
        );
    }

    @GetMapping("/token-governance")
    public Map<String, Object> getTokenGovernancePolicy() {
        return Map.of(
                "maxContextTokens", 900,
                "maxOutputTokens", 420,
                "dailyTokenBudgetPerUser", 12000,
                "zeroTokenLayers", List.of("Guardrail pre-LLM", "Caché semántica de consultas", "Motor de seguimiento y menú local"),
                "fallbackStrategy", "Degradación automática a Motor RAG Híbrido local de 0 tokens al alcanzar presupuesto diario"
        );
    }

    @PostMapping("/fhir/reconcile")
    public ResponseEntity<Map<String, Object>> reconcileClinicalRecord(@RequestBody FhirReconcileRequest req) {
        if (!req.consentGranted()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Se requiere consentimiento informado explícito (SMART on FHIR / OAuth2) para conciliar registros clínicos."
            ));
        }

        boolean emailMatched = req.appEmail() != null
                && req.clinicEmail() != null
                && req.appEmail().trim().equalsIgnoreCase(req.clinicEmail().trim());

        int score = emailMatched ? 55 : 35;
        List<String> detectedProtocols = new ArrayList<>();
        List<String> alerts = new ArrayList<>();

        if (req.fastingGlucose() >= 100 || req.hba1c() >= 5.7) {
            detectedProtocols.add("resistencia_insulina_diabetes");
            alerts.add("Glucosa/HbA1c en vigilancia -> activar protocolo ADA.");
        }
        if (req.bloodPressureSys() >= 130) {
            detectedProtocols.add("hipertension_cardiovascular");
            alerts.add("Presión sistólica >= 130 mmHg -> activar protocolo DASH.");
        }
        if (req.ldlCholesterol() >= 130) {
            detectedProtocols.add("colesterol_trigliceridos");
            alerts.add("LDL elevado -> reforzar fibra soluble (avena/legumbres) y Omega-3.");
        }

        double weightDiff = Math.abs(req.appWeightKg() - req.clinicalWeightKg());
        score += weightDiff <= 2.0 ? 20 : 12;
        score += 25;
        score = Math.min(100, score);

        return ResponseEntity.ok(Map.of(
                "emailMatched", emailMatched,
                "consentVerified", true,
                "concordanceScorePct", score,
                "weightDiffKg", Math.round(weightDiff * 10.0) / 10.0,
                "detectedProtocols", detectedProtocols,
                "clinicalAlerts", alerts,
                "reconciledAt", LocalDateTime.now().toString()
        ));
    }

    @PostMapping("/fhir/sandbox-connect")
    public ResponseEntity<Map<String, Object>> connectFhirSandbox(@RequestBody FhirSandboxConnectRequest req) {
        if (!req.consentGranted()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "connected", false,
                    "isRealFhirData", false,
                    "error", "Se requiere consentimiento informado explícito (SMART on FHIR / Ley 1581 / GDPR) antes de consultar un servidor FHIR."
            ));
        }

        String baseUrl = (req.sandboxUrl() != null && !req.sandboxUrl().isBlank()
                ? req.sandboxUrl()
                : configuredFhirBaseUrl).replaceAll("/$", "");
        String patientId = req.patientFhirId() != null ? req.patientFhirId().trim() : "";
        String email = req.email() != null ? req.email().trim().toLowerCase() : "";

        try {
            HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(4)).build();
            String patientQuery = !patientId.isEmpty()
                    ? baseUrl + "/Patient/" + URLEncoder.encode(patientId, StandardCharsets.UTF_8)
                    : baseUrl + "/Patient?email=" + URLEncoder.encode(email, StandardCharsets.UTF_8) + "&_count=1";

            HttpRequest httpReq = HttpRequest.newBuilder()
                    .uri(URI.create(patientQuery))
                    .timeout(Duration.ofSeconds(4))
                    .header("Accept", "application/fhir+json, application/json")
                    .GET()
                    .build();

            HttpResponse<String> resp = client.send(httpReq, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() < 200 || resp.statusCode() >= 300 || !resp.body().contains("\"Patient\"")) {
                return ResponseEntity.ok(Map.of(
                        "connected", false,
                        "isRealFhirData", false,
                        "status", "NO_PATIENT_RECORDS_FOUND",
                        "fhirBaseUrl", baseUrl,
                        "message", "Servidor FHIR R4 consultado, pero sin recurso Patient/Observation real para este identificador. Nunca se generan datos clínicos ficticios."
                ));
            }

            return ResponseEntity.ok(Map.of(
                    "connected", true,
                    "isRealFhirData", true,
                    "status", "CONNECTED_FHIR_R4",
                    "fhirBaseUrl", baseUrl,
                    "rawPatientPreview", resp.body().substring(0, Math.min(350, resp.body().length()))
            ));
        } catch (Exception ex) {
            return ResponseEntity.ok(Map.of(
                    "connected", false,
                    "isRealFhirData", false,
                    "status", "NO_REAL_FHIR_CONNECTION",
                    "fhirBaseUrl", baseUrl,
                    "message", "Sin conexión activa al sandbox SMART on FHIR R4 (" + ex.getMessage() + "). Nunca se muestran datos clínicos ficticios."
            ));
        }
    }

    public record FhirSandboxConnectRequest(
            String patientFhirId,
            String email,
            String sandboxUrl,
            boolean consentGranted
    ) {}

    public record FhirReconcileRequest(
            String appEmail,
            String clinicEmail,
            boolean consentGranted,
            double appWeightKg,
            double clinicalWeightKg,
            double fastingGlucose,
            double hba1c,
            double ldlCholesterol,
            int bloodPressureSys
    ) {}
}
