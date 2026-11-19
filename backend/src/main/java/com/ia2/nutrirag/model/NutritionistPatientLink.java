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
@Table(name = "nutritionist_patient_links")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NutritionistPatientLink {

    @Id
    @Column(length = 64)
    private String id;

    @Column(name = "nutritionist_id", nullable = false, length = 64)
    private String nutritionistId;

    @Column(name = "patient_email", nullable = false, length = 160)
    private String patientEmail;

    @Column(name = "patient_name", nullable = false, length = 120)
    private String patientName;

    @Column(name = "assigned_calories")
    private int assignedCalories;

    @Column(name = "assigned_protein")
    private int assignedProtein;

    @Column(name = "assigned_carbs")
    private int assignedCarbs;

    @Column(name = "assigned_fat")
    private int assignedFat;

    @Column(name = "clinical_protocol", length = 255)
    private String clinicalProtocol;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
