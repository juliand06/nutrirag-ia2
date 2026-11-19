package com.ia2.nutrirag.repository;

import com.ia2.nutrirag.model.NutritionistPatientLink;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NutritionistPatientLinkRepository extends JpaRepository<NutritionistPatientLink, String> {
    List<NutritionistPatientLink> findByNutritionistIdOrderByCreatedAtDesc(String nutritionistId);
}
