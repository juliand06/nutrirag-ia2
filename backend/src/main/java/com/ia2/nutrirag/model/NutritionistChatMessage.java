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
@Table(name = "nutritionist_chat_messages")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NutritionistChatMessage {

    @Id
    @Column(length = 64)
    private String id;

    @Column(name = "link_id", nullable = false, length = 64)
    private String linkId;

    @Column(name = "sender_role", nullable = false, length = 24)
    private String senderRole;

    @Column(name = "sender_name", nullable = false, length = 120)
    private String senderName;

    @Column(name = "message_text", nullable = false, columnDefinition = "TEXT")
    private String messageText;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
