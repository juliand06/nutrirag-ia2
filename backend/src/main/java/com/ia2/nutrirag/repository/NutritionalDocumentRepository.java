package com.ia2.nutrirag.repository;

import com.ia2.nutrirag.model.NutritionalDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NutritionalDocumentRepository extends JpaRepository<NutritionalDocument, String> {
    List<NutritionalDocument> findByTenantIdOrderByCreatedAtDesc(String tenantId);
}

