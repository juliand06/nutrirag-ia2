package com.ia2.nutrirag;

import com.ia2.nutrirag.service.NutritionGuardrailService;
import com.ia2.nutrirag.service.SensitiveDataCryptoService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class NutriRagSecurityAndGuardrailTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private NutritionGuardrailService guardrailService;

    @Autowired
    private SensitiveDataCryptoService cryptoService;

    @Test
    void healthEndpointIsPublic() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void protectedEndpointRequiresJwt() throws Exception {
        mockMvc.perform(get("/api/me/profile"))
                .andExpect(status().isForbidden());
    }

    @Test
    void registerAndLoginReturnJwtTokens() throws Exception {
        String registerPayload = """
                {
                  "name": "Test User",
                  "email": "test.jwt@nutristudio.com",
                  "password": "Password123!",
                  "country": "CO"
                }
                """;
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value("test.jwt@nutristudio.com"));
    }

    @Test
    void hybridGuardrailAllowsNutritionAndBlocksOffTopic() {
        assertTrue(guardrailService.evaluateQuery("¿Cuántas calorías y proteínas tiene la pechuga de pollo?").allowed());
        assertFalse(guardrailService.evaluateQuery("¿Cómo corrijo un NullPointerException en javascript?").allowed());
    }

    @Test
    void sensitiveDataAesGcmRoundTripWorks() {
        String note = "Nota clínica SOAP: Glucosa ayunas 94 mg/dL, buena tolerancia a fibra.";
        String encrypted = cryptoService.encrypt(note);
        assertTrue(encrypted.startsWith("v1:"));
        assertNotEquals(note, encrypted);
        assertEquals(note, cryptoService.decrypt(encrypted));
    }

    @Test
    void fhirSandboxRejectsWithoutExplicitConsentAndProtectsBilling() throws Exception {
        mockMvc.perform(post("/api/platform/fhir/sandbox-connect")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"patientFhirId\":\"example\",\"consentGranted\":false}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.isRealFhirData").value(false));

        mockMvc.perform(get("/api/billing/subscription"))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/nutritionist/patients"))
                .andExpect(status().isForbidden());
    }
}
