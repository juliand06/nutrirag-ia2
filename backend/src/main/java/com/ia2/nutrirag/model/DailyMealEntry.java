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
@Table(name = "daily_meal_entries")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DailyMealEntry {

    @Id
    @Column(length = 64)
    private String id;

    @Column(name = "user_id", nullable = false, length = 64)
    private String userId;

    @Column(name = "log_date", nullable = false, length = 16)
    private String logDate;

    @Column(name = "log_time", length = 16)
    private String logTime;

    @Column(name = "meal_type", nullable = false, length = 32)
    private String mealType;

    @Column(name = "dish_name", nullable = false, length = 200)
    private String dishName;

    @Column(name = "total_calories", nullable = false)
    private int totalCalories;

    @Column(name = "carbs_grams", nullable = false)
    private int carbsGrams;

    @Column(name = "protein_grams", nullable = false)
    private int proteinGrams;

    @Column(name = "fat_grams", nullable = false)
    private int fatGrams;

    @Column(name = "fiber_grams")
    private int fiberGrams;

    @Column(name = "sodium_mg")
    private int sodiumMg;

    @Column(name = "potassium_mg")
    private int potassiumMg;

    @Column(name = "vitamin_c_mg")
    private int vitaminCMg;

    @Column(name = "quality_score")
    private int qualityScore;

    @Column(name = "nutri_grade", length = 4)
    private String nutriGrade;

    @Column(name = "glycemic_load", length = 80)
    private String glycemicLoad;

    @Column(name = "nutritional_advice", columnDefinition = "TEXT")
    private String nutritionalAdvice;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
