package com.ia2.nutrirag.repository;

import com.ia2.nutrirag.model.PrivacyAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PrivacyAuditLogRepository extends JpaRepository<PrivacyAuditLog, String> {
    List<PrivacyAuditLog> findByUserIdOrderByCreatedAtDesc(String userId);
}
