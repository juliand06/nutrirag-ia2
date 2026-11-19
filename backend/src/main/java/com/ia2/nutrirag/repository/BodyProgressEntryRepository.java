package com.ia2.nutrirag.repository;

import com.ia2.nutrirag.model.BodyProgressEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BodyProgressEntryRepository extends JpaRepository<BodyProgressEntry, String> {
    List<BodyProgressEntry> findByUserIdOrderByCreatedAtDesc(String userId);
}
