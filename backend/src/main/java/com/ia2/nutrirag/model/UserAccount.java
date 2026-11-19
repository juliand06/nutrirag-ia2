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
@Table(name = "user_accounts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserAccount {

    @Id
    @Column(length = 64)
    private String id;

    @Column(nullable = false, unique = true, length = 160)
    private String email;

    @Column(name = "full_name", nullable = false, length = 120)
    private String fullName;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "auth_provider", nullable = false, length = 24)
    private String authProvider; // LOCAL | GOOGLE

    @Column(nullable = false, length = 24)
    private String role; // USER | ADMIN

    @Column(name = "country_code", length = 8)
    private String countryCode;

    @Column(name = "budget_tier", length = 24)
    private String budgetTier;

    @Column(length = 24)
    private String sex;

    private int age;

    @Column(name = "weight_kg")
    private double weightKg;

    @Column(name = "height_cm")
    private double heightCm;

    @Column(name = "activity_level", length = 24)
    private String activityLevel;

    @Column(name = "metabolism_type", length = 24)
    private String metabolismType;

    @Column(length = 40)
    private String goal;

    @Column(name = "daily_calories")
    private int dailyCalories;

    @Column(name = "target_carbs")
    private int targetCarbs;

    @Column(name = "target_protein")
    private int targetProtein;

    @Column(name = "target_fat")
    private int targetFat;

    @Column(name = "water_goal_ml")
    private int waterGoalMl;

    @Column(name = "medical_conditions_csv", columnDefinition = "TEXT")
    private String medicalConditionsCsv;

    @Column(name = "physical_notes", columnDefinition = "TEXT")
    private String physicalNotes;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
