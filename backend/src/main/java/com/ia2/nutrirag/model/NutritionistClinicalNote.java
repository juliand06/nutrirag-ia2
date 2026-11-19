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
@Table(name = "nutritionist_clinical_notes")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NutritionistClinicalNote {

    @Id
    @Column(length = 64)
    private String id;

    @Column(name = "link_id", nullable = false, length = 64)
    private String linkId;

    @Column(name = "author_email", length = 160)
    private String authorEmail;

    @Column(name = "soap_note_encrypted", nullable = false, columnDefinition = "TEXT")
    private String soapNoteEncrypted;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
