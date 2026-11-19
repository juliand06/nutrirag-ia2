package com.ia2.nutrirag.repository;

import com.ia2.nutrirag.model.DailyMealEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DailyMealEntryRepository extends JpaRepository<DailyMealEntry, String> {
    List<DailyMealEntry> findByUserIdOrderByCreatedAtDesc(String userId);
    List<DailyMealEntry> findByUserIdAndLogDateOrderByCreatedAtDesc(String userId, String logDate);
}
