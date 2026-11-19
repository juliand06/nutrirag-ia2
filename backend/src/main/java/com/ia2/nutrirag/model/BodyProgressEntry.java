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
@Table(name = "body_progress_entries")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BodyProgressEntry {

    @Id
    @Column(length = 64)
    private String id;

    @Column(name = "user_id", nullable = false, length = 64)
    private String userId;

    @Column(name = "log_date", nullable = false, length = 16)
    private String logDate;

    @Column(name = "weight_kg")
    private Double weightKg;

    @Column(name = "water_ml")
    private Integer waterMl;

    @Column(length = 255)
    private String note;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
