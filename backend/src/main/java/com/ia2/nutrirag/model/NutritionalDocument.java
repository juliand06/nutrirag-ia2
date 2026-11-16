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
@Table(name = "nutritional_documents")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NutritionalDocument {

    @Id
    private String id;

    @Column(nullable = false)
    private String tenantId;

    @Column(nullable = false)
    private String ownerUsername;

    @Column(nullable = false)
    private String fileName;

    @Column(nullable = false, length = 64)
    private String sha256Hash;

    private int totalPages;

    private int totalChunks;

    private boolean ocrApplied;

    private String embeddingModel;

    /**
     * Indica que la copia temporal del PDF fue eliminada del servidor tras verificar la indexación.
     * El PDF original permanece únicamente en el computador del cliente (Requerimiento #9).
     */
    private boolean tempFileDeleted;

    private String indexingStatus; // PROCESSING, INDEXED, ERROR

    private LocalDateTime createdAt;

    private LocalDateTime deletedTempAt;
}

