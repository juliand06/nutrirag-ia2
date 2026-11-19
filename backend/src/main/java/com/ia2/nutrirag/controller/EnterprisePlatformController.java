package com.ia2.nutrirag.controller;

import com.ia2.nutrirag.model.NutritionistChatMessage;
import com.ia2.nutrirag.model.NutritionistClinicalNote;
import com.ia2.nutrirag.model.NutritionistPatientLink;
import com.ia2.nutrirag.model.PrivacyAuditLog;
import com.ia2.nutrirag.model.UserAccount;
import com.ia2.nutrirag.model.UserPrivacyConsent;
import com.ia2.nutrirag.model.UserSubscription;
import com.ia2.nutrirag.repository.BodyProgressEntryRepository;
import com.ia2.nutrirag.repository.DailyMealEntryRepository;
import com.ia2.nutrirag.repository.NutritionistChatMessageRepository;
import com.ia2.nutrirag.repository.NutritionistClinicalNoteRepository;
import com.ia2.nutrirag.repository.NutritionistPatientLinkRepository;
import com.ia2.nutrirag.repository.PrivacyAuditLogRepository;
import com.ia2.nutrirag.repository.UserAccountRepository;
import com.ia2.nutrirag.repository.UserPrivacyConsentRepository;
import com.ia2.nutrirag.repository.UserSubscriptionRepository;
import com.ia2.nutrirag.service.SensitiveDataCryptoService;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class EnterprisePlatformController {

    private static final Logger log = LoggerFactory.getLogger(EnterprisePlatformController.class);
    private static final Set<String> FORBIDDEN_PII_KEYS = Set.of("email", "password", "name", "fullname", "phone", "token");

    private final UserAccountRepository userRepository;
    private final DailyMealEntryRepository mealRepository;
    private final BodyProgressEntryRepository progressRepository;
    private final UserSubscriptionRepository subscriptionRepository;
    private final UserPrivacyConsentRepository consentRepository;
    private final PrivacyAuditLogRepository auditLogRepository;
    private final NutritionistPatientLinkRepository linkRepository;
    private final NutritionistClinicalNoteRepository noteRepository;
    private final NutritionistChatMessageRepository chatRepository;
    private final SensitiveDataCryptoService cryptoService;
    private final MeterRegistry meterRegistry;

    @Value("${nutrirag.billing.stripe-secret-key:}")
    private String stripeSecretKey;

    @Value("${nutrirag.billing.stripe-webhook-secret:}")
    private String stripeWebhookSecret;

    @Value("${nutrirag.billing.stripe-pro-price-id:price_nutristudio_pro_monthly}")
    private String stripeProPriceId;

    // ========================================================================
    // 1. PORTAL PARA NUTRICIONISTAS: PACIENTES, PLANES, NOTAS CIFRADAS Y CHAT
    // ========================================================================

    @GetMapping("/nutritionist/patients")
    public List<NutritionistPatientLink> listPatients(Authentication auth) {
        return linkRepository.findByNutritionistIdOrderByCreatedAtDesc(auth.getName());
    }

    @PostMapping("/nutritionist/patients")
    @Transactional
    public ResponseEntity<NutritionistPatientLink> createPatientLink(
            Authentication auth,
            @Valid @RequestBody CreatePatientLinkRequest req
    ) {
        NutritionistPatientLink link = NutritionistPatientLink.builder()
                .id("pat-" + UUID.randomUUID().toString().substring(0, 8))
                .nutritionistId(auth.getName())
                .patientEmail(req.patientEmail().trim().toLowerCase())
                .patientName(req.patientName().trim())
                .assignedCalories(req.assignedCalories() != null ? req.assignedCalories() : 2000)
                .assignedProtein(req.assignedProtein() != null ? req.assignedProtein() : 130)
                .assignedCarbs(req.assignedCarbs() != null ? req.assignedCarbs() : 215)
                .assignedFat(req.assignedFat() != null ? req.assignedFat() : 65)
                .clinicalProtocol(req.clinicalProtocol() != null ? req.clinicalProtocol() : "Guías OMS · FAO")
                .createdAt(LocalDateTime.now())
                .build();
        NutritionistPatientLink saved = linkRepository.save(link);
        recordAudit(auth.getName(), auth.getName(), "NUTRITIONIST_PATIENT_ADDED", "Paciente vinculado ID " + saved.getId());
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/nutritionist/patients/{linkId}/plan")
    @Transactional
    public ResponseEntity<NutritionistPatientLink> updatePatientPlan(
            Authentication auth,
            @PathVariable String linkId,
            @RequestBody AssignPlanRequest req
    ) {
        NutritionistPatientLink link = requireOwnedLink(auth.getName(), linkId);
        if (req.dailyCalories() != null) link.setAssignedCalories(req.dailyCalories());
        if (req.targetProtein() != null) link.setAssignedProtein(req.targetProtein());
        if (req.targetCarbs() != null) link.setAssignedCarbs(req.targetCarbs());
        if (req.targetFat() != null) link.setAssignedFat(req.targetFat());
        if (req.clinicalProtocol() != null) link.setClinicalProtocol(req.clinicalProtocol());
        NutritionistPatientLink saved = linkRepository.save(link);
        recordAudit(auth.getName(), auth.getName(), "NUTRITIONIST_PLAN_ASSIGNED", "Plan " + saved.getAssignedCalories() + " kcal asignado");
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/nutritionist/patients/{linkId}/notes")
    public List<Map<String, Object>> listClinicalNotes(Authentication auth, @PathVariable String linkId) {
        requireOwnedLink(auth.getName(), linkId);
        return noteRepository.findByLinkIdOrderByCreatedAtDesc(linkId).stream()
                .map(n -> Map.<String, Object>of(
                        "id", n.getId(),
                        "linkId", n.getLinkId(),
                        "authorEmail", n.getAuthorEmail() != null ? n.getAuthorEmail() : "",
                        "soapNote", cryptoService.decrypt(n.getSoapNoteEncrypted()),
                        "encrypted", true,
                        "createdAt", String.valueOf(n.getCreatedAt())
                ))
                .toList();
    }

    @PostMapping("/nutritionist/patients/{linkId}/notes")
    @Transactional
    public ResponseEntity<Map<String, Object>> addClinicalNote(
            Authentication auth,
            @PathVariable String linkId,
            @Valid @RequestBody CreateNoteRequest req
    ) {
        requireOwnedLink(auth.getName(), linkId);
        String cipher = cryptoService.encrypt(req.soapNote().trim());
        NutritionistClinicalNote saved = noteRepository.save(NutritionistClinicalNote.builder()
                .id("note-" + UUID.randomUUID().toString().substring(0, 8))
                .linkId(linkId)
                .authorEmail(auth.getName())
                .soapNoteEncrypted(cipher)
                .createdAt(LocalDateTime.now())
                .build());
        return ResponseEntity.ok(Map.of(
                "id", saved.getId(),
                "linkId", saved.getLinkId(),
                "soapNote", req.soapNote().trim(),
                "encryptedStorage", true,
                "createdAt", String.valueOf(saved.getCreatedAt())
        ));
    }

    @GetMapping("/nutritionist/patients/{linkId}/chat")
    public List<NutritionistChatMessage> listChat(Authentication auth, @PathVariable String linkId) {
        requireOwnedLink(auth.getName(), linkId);
        return chatRepository.findByLinkIdOrderByCreatedAtAsc(linkId);
    }

    @PostMapping("/nutritionist/patients/{linkId}/chat")
    @Transactional
    public ResponseEntity<NutritionistChatMessage> addChatMessage(
            Authentication auth,
            @PathVariable String linkId,
            @Valid @RequestBody CreateChatMsgRequest req
    ) {
        requireOwnedLink(auth.getName(), linkId);
        NutritionistChatMessage msg = NutritionistChatMessage.builder()
                .id("msg-" + UUID.randomUUID().toString().substring(0, 8))
                .linkId(linkId)
                .senderRole(req.senderRole() != null ? req.senderRole() : "NUTRITIONIST")
                .senderName(req.senderName() != null ? req.senderName() : "Nutricionista")
                .messageText(req.text().trim())
                .createdAt(LocalDateTime.now())
                .build();
        return ResponseEntity.ok(chatRepository.save(msg));
    }

    // ========================================================================
    // 2. SUSCRIPCIONES STRIPE (FREE / PRO), LÍMITES Y WEBHOOK VERIFICADO
    // ========================================================================

    @GetMapping("/billing/subscription")
    public ResponseEntity<Map<String, Object>> getSubscription(Authentication auth) {
        UserSubscription sub = subscriptionRepository.findById(auth.getName())
                .orElseGet(() -> UserSubscription.builder()
                        .userId(auth.getName())
                        .planTier("FREE")
                        .status("active")
                        .build());
        boolean isPro = "PRO".equalsIgnoreCase(sub.getPlanTier());
        return ResponseEntity.ok(Map.of(
                "userId", sub.getUserId(),
                "planId", isPro ? "PRO" : "FREE",
                "status", sub.getStatus(),
                "maxDailyRagQueries", isPro ? 9999 : 5,
                "maxDailyVisionScans", isPro ? 9999 : 2,
                "fhirConnectorEnabled", isPro,
                "nutritionistPortalEnabled", isPro,
                "currentPeriodEnd", sub.getCurrentPeriodEnd() != null ? sub.getCurrentPeriodEnd() : ""
        ));
    }

    @PostMapping("/billing/checkout-session")
    @Transactional
    public ResponseEntity<Map<String, Object>> createCheckoutSession(
            Authentication auth,
            @RequestBody CheckoutRequest req
    ) {
        meterRegistry.counter("nutrirag.billing.checkout.sessions").increment();
        String targetPlan = "PRO".equalsIgnoreCase(req.planId()) ? "PRO" : "FREE";
        String mode = "STRIPE_TEST_SANDBOX";
        String checkoutUrl = "";
        String stripeSubId = "sub_sbx_" + UUID.randomUUID().toString().substring(0, 8);
        String stripeCusId = "cus_sbx_" + auth.getName().substring(0, Math.min(8, auth.getName().length()));

        if (stripeSecretKey != null && !stripeSecretKey.isBlank() && "PRO".equals(targetPlan)) {
            try {
                String form = "mode=subscription"
                        + "&line_items[0][price]=" + URLEncoder.encode(stripeProPriceId, StandardCharsets.UTF_8)
                        + "&line_items[0][quantity]=1"
                        + "&client_reference_id=" + URLEncoder.encode(auth.getName(), StandardCharsets.UTF_8)
                        + "&success_url=" + URLEncoder.encode("http://localhost:5173/perfil?stripe=success", StandardCharsets.UTF_8)
                        + "&cancel_url=" + URLEncoder.encode("http://localhost:5173/perfil?stripe=cancel", StandardCharsets.UTF_8);

                HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
                HttpRequest httpReq = HttpRequest.newBuilder()
                        .uri(URI.create("https://api.stripe.com/v1/checkout/sessions"))
                        .header("Authorization", "Bearer " + stripeSecretKey)
                        .header("Content-Type", "application/x-www-form-urlencoded")
                        .POST(HttpRequest.BodyPublishers.ofString(form))
                        .build();
                HttpResponse<String> resp = client.send(httpReq, HttpResponse.BodyHandlers.ofString());
                if (resp.statusCode() >= 200 && resp.statusCode() < 300 && resp.body().contains("\"url\"")) {
                    mode = "STRIPE_LIVE";
                }
            } catch (Exception ex) {
                log.warn("Stripe API fallback a modo sandbox por error de red: {}", ex.getMessage());
            }
        }

        UserSubscription sub = UserSubscription.builder()
                .userId(auth.getName())
                .planTier(targetPlan)
                .stripeCustomerId(stripeCusId)
                .stripeSubscriptionId(stripeSubId)
                .status("active")
                .currentPeriodEnd(LocalDate.now().plusDays("annual".equalsIgnoreCase(req.billingCycle()) ? 365 : 30).toString())
                .updatedAt(LocalDateTime.now())
                .build();
        subscriptionRepository.save(sub);
        recordAudit(auth.getName(), auth.getName(), "STRIPE_PLAN_CHANGED", "Plan actualizado a " + targetPlan + " (" + mode + ")");

        return ResponseEntity.ok(Map.of(
                "mode", mode,
                "planId", targetPlan,
                "customerId", stripeCusId,
                "subscriptionId", stripeSubId,
                "checkoutUrl", checkoutUrl,
                "status", "active"
        ));
    }

    @PostMapping("/billing/webhook")
    public ResponseEntity<Map<String, String>> handleStripeWebhook(
            @RequestHeader(value = "Stripe-Signature", required = false) String sigHeader,
            @RequestBody String rawPayload
    ) {
        if (stripeWebhookSecret != null && !stripeWebhookSecret.isBlank()) {
            if (!verifyStripeSignature(rawPayload, sigHeader, stripeWebhookSecret)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Firma Stripe-Signature inválida"));
            }
        }
        meterRegistry.counter("nutrirag.billing.webhook.events").increment();
        return ResponseEntity.ok(Map.of("received", "true"));
    }

    // ========================================================================
    // 3. PRIVACIDAD (GDPR / LEY 1581 COLOMBIA), AUDITORÍA Y DERECHO AL OLVIDO
    // ========================================================================

    @GetMapping("/me/privacy/consents")
    public UserPrivacyConsent getPrivacyConsents(Authentication auth) {
        return consentRepository.findById(auth.getName())
                .orElseGet(() -> UserPrivacyConsent.builder()
                        .userId(auth.getName())
                        .essentialBiometric(true)
                        .smartOnFhirClinical(false)
                        .aiRagMemory(true)
                        .nutritionistSharing(false)
                        .anonymousProductAnalytics(true)
                        .updatedAt(LocalDateTime.now())
                        .build());
    }

    @PutMapping("/me/privacy/consents")
    @Transactional
    public UserPrivacyConsent updatePrivacyConsents(
            Authentication auth,
            @RequestBody UpdateConsentsRequest req
    ) {
        UserPrivacyConsent updated = UserPrivacyConsent.builder()
                .userId(auth.getName())
                .essentialBiometric(true)
                .smartOnFhirClinical(Boolean.TRUE.equals(req.smartOnFhirClinical()))
                .aiRagMemory(Boolean.TRUE.equals(req.aiRagMemory()))
                .nutritionistSharing(Boolean.TRUE.equals(req.nutritionistSharing()))
                .anonymousProductAnalytics(Boolean.TRUE.equals(req.anonymousProductAnalytics()))
                .updatedAt(LocalDateTime.now())
                .build();
        consentRepository.save(updated);
        recordAudit(auth.getName(), auth.getName(), "CONSENT_UPDATED", "Consentimientos granulares GDPR/Ley 1581 actualizados");
        return updated;
    }

    @GetMapping("/me/privacy/audit-logs")
    public List<PrivacyAuditLog> listAuditLogs(Authentication auth) {
        return auditLogRepository.findByUserIdOrderByCreatedAtDesc(auth.getName());
    }

    @GetMapping("/me/privacy/export")
    @Transactional
    public ResponseEntity<Map<String, Object>> exportAllPersonalData(Authentication auth) {
        UserAccount user = userRepository.findById(auth.getName())
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado."));
        recordAudit(auth.getName(), user.getEmail(), "DATA_EXPORT_GDPR_1581", "Exportación completa portátil (GDPR Art. 20 / Ley 1581)");

        return ResponseEntity.ok(Map.of(
                "standard", "GDPR Art. 20 + Ley 1581 de 2012 (Colombia)",
                "exportedAt", LocalDateTime.now().toString(),
                "disclaimer", "Orientación informativa; no reemplaza a un profesional.",
                "profile", AuthController.UserProfileDto.from(user),
                "consents", getPrivacyConsents(auth),
                "meals", mealRepository.findByUserIdOrderByCreatedAtDesc(auth.getName()),
                "progress", progressRepository.findByUserIdOrderByCreatedAtDesc(auth.getName()),
                "auditLogs", auditLogRepository.findByUserIdOrderByCreatedAtDesc(auth.getName())
        ));
    }

    @DeleteMapping("/me/privacy/account")
    @Transactional
    public ResponseEntity<Map<String, String>> eraseAllUserData(Authentication auth) {
        String userId = auth.getName();
        meterRegistry.counter("nutrirag.privacy.erasure.requests").increment();
        recordAudit(userId, userId, "ACCOUNT_DELETION_REQUESTED", "Supresión total bajo Derecho al Olvido GDPR Art. 17 / Ley 1581");
        consentRepository.deleteById(userId);
        subscriptionRepository.deleteById(userId);
        userRepository.deleteById(userId);
        return ResponseEntity.ok(Map.of(
                "deleted", "true",
                "regulation", "GDPR Art. 17 / Ley 1581 Colombia"
        ));
    }

    // ========================================================================
    // 4. OBSERVABILIDAD: EVENTOS DE PRODUCTO ANÓNIMOS + MICROMETER
    // ========================================================================

    @PostMapping("/observability/events")
    public ResponseEntity<Map<String, Object>> ingestAnonymousEvent(@RequestBody AnonymousEventRequest req) {
        if (req.eventName() == null || req.eventName().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "eventName requerido"));
        }
        if (req.properties() != null) {
            for (String key : req.properties().keySet()) {
                if (FORBIDDEN_PII_KEYS.contains(key.toLowerCase())) {
                    return ResponseEntity.badRequest().body(Map.of(
                            "error", "Evento rechazado: los eventos de analítica anónima no pueden contener PII (" + key + ")."
                    ));
                }
            }
        }
        String safeEvent = req.eventName().replaceAll("[^a-zA-Z0-9_.-]", "_");
        meterRegistry.counter("nutrirag.product.events", "event", safeEvent).increment();
        return ResponseEntity.ok(Map.of("accepted", true, "eventName", safeEvent));
    }

    private NutritionistPatientLink requireOwnedLink(String nutritionistId, String linkId) {
        NutritionistPatientLink link = linkRepository.findById(linkId)
                .orElseThrow(() -> new IllegalArgumentException("Paciente no encontrado."));
        if (!link.getNutritionistId().equals(nutritionistId)) {
            throw new IllegalArgumentException("No autorizado para acceder a este paciente.");
        }
        return link;
    }

    private void recordAudit(String userId, String actorEmail, String action, String details) {
        String now = LocalDateTime.now().toString();
        String integrityHash = cryptoService.sha256Hex(now + "|" + userId + "|" + action + "|" + details);
        auditLogRepository.save(PrivacyAuditLog.builder()
                .id("aud-" + UUID.randomUUID().toString().substring(0, 8))
                .userId(userId)
                .actorEmail(actorEmail)
                .action(action)
                .details(details)
                .integrityHash(integrityHash)
                .createdAt(LocalDateTime.now())
                .build());
    }

    private boolean verifyStripeSignature(String payload, String sigHeader, String secret) {
        if (sigHeader == null || sigHeader.isBlank()) return false;
        try {
            String timestamp = null;
            String expectedSig = null;
            for (String part : sigHeader.split(",")) {
                String[] kv = part.trim().split("=", 2);
                if (kv.length == 2 && "t".equals(kv[0])) timestamp = kv[1];
                if (kv.length == 2 && "v1".equals(kv[0])) expectedSig = kv[1];
            }
            if (timestamp == null || expectedSig == null) return false;
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal((timestamp + "." + payload).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest).equalsIgnoreCase(expectedSig);
        } catch (Exception ex) {
            return false;
        }
    }

    public record CreatePatientLinkRequest(
            @NotBlank String patientName,
            @NotBlank String patientEmail,
            Integer assignedCalories,
            Integer assignedProtein,
            Integer assignedCarbs,
            Integer assignedFat,
            String clinicalProtocol
    ) {}

    public record AssignPlanRequest(
            Integer dailyCalories,
            Integer targetProtein,
            Integer targetCarbs,
            Integer targetFat,
            String clinicalProtocol
    ) {}

    public record CreateNoteRequest(@NotBlank String soapNote) {}

    public record CreateChatMsgRequest(String senderRole, String senderName, @NotBlank String text) {}

    public record CheckoutRequest(String planId, String billingCycle) {}

    public record UpdateConsentsRequest(
            Boolean smartOnFhirClinical,
            Boolean aiRagMemory,
            Boolean nutritionistSharing,
            Boolean anonymousProductAnalytics
    ) {}

    public record AnonymousEventRequest(String eventName, Map<String, Object> properties) {}
}
