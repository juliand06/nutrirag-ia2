package com.ia2.nutrirag.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_privacy_consents")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserPrivacyConsent {

    @Id
    @Column(name = "user_id", length = 64)
    private String userId;

    @Column(name = "essential_biometric", nullable = false)
    private boolean essentialBiometric;

    @Column(name = "smart_on_fhir_clinical", nullable = false)
    private boolean smartOnFhirClinical;

    @Column(name = "ai_rag_memory", nullable = false)
    private boolean aiRagMemory;

    @Column(name = "nutritionist_sharing", nullable = false)
    private boolean nutritionistSharing;

    @Column(name = "anonymous_product_analytics", nullable = false)
    private boolean anonymousProductAnalytics;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
