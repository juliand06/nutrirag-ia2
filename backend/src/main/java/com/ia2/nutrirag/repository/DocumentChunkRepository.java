package com.ia2.nutrirag.repository;

import com.ia2.nutrirag.model.DocumentChunk;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentChunkRepository extends JpaRepository<DocumentChunk, String> {

    List<DocumentChunk> findByTenantId(String tenantId);

    List<DocumentChunk> findByDocumentIdOrderByChunkOrderAsc(String documentId);

    /**
     * Consulta nativa para PostgreSQL + pgvector combinando similitud vectorial (<=>)
     * y filtro estricto de tenant (Requerimiento #11 y #12).
     */
    @Query(value = """
            SELECT * FROM document_chunks
            WHERE tenant_id = :tenantId
            ORDER BY CAST(embedding_vector_json AS vector) <=> CAST(:queryVector AS vector)
            LIMIT :topK
            """, nativeQuery = true)
    List<DocumentChunk> findTopKByPgVector(
            @Param("tenantId") String tenantId,
            @Param("queryVector") String queryVector,
            @Param("topK") int topK
    );
}

