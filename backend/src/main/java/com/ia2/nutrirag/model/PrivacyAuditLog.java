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
@Table(name = "privacy_audit_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrivacyAuditLog {

    @Id
    @Column(length = 64)
    private String id;

    @Column(name = "user_id", nullable = false, length = 64)
    private String userId;

    @Column(name = "actor_email", length = 160)
    private String actorEmail;

    @Column(nullable = false, length = 80)
    private String action;

    @Column(columnDefinition = "TEXT")
    private String details;

    @Column(name = "ip_hash", length = 64)
    private String ipHash;

    @Column(name = "integrity_hash", nullable = false, length = 64)
    private String integrityHash;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
