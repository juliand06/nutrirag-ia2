package com.ia2.nutrirag.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "document_chunks")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentChunk {

    @Id
    private String id;

    @Column(nullable = false)
    private String documentId;

    @Column(nullable = false)
    private String documentName;

    @Column(nullable = false)
    private String tenantId;

    private int pageNumber;

    private String sectionTitle;

    private int chunkOrder;

    private int tokenCount;

    @Lob
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    /**
     * Representación vectorial compatible tanto con pgvector (formato '[0.012, -0.043, ...]')
     * como con el modo de respaldo en memoria H2.
     */
    @Lob
    @Column(columnDefinition = "TEXT")
    private String embeddingVectorJson;

    private LocalDateTime createdAt;
}

