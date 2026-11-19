package com.ia2.nutrirag.repository;

import com.ia2.nutrirag.model.NutritionistClinicalNote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NutritionistClinicalNoteRepository extends JpaRepository<NutritionistClinicalNote, String> {
    List<NutritionistClinicalNote> findByLinkIdOrderByCreatedAtDesc(String linkId);
}
