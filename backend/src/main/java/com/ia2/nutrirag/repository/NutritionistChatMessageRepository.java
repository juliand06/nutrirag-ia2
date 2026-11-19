package com.ia2.nutrirag.repository;

import com.ia2.nutrirag.model.NutritionistChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NutritionistChatMessageRepository extends JpaRepository<NutritionistChatMessage, String> {
    List<NutritionistChatMessage> findByLinkIdOrderByCreatedAtAsc(String linkId);
}
