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
@Table(name = "user_subscriptions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSubscription {

    @Id
    @Column(name = "user_id", length = 64)
    private String userId;

    @Column(name = "plan_tier", nullable = false, length = 16)
    private String planTier;

    @Column(name = "stripe_customer_id", length = 120)
    private String stripeCustomerId;

    @Column(name = "stripe_subscription_id", length = 120)
    private String stripeSubscriptionId;

    @Column(nullable = false, length = 32)
    private String status;

    @Column(name = "current_period_end", length = 32)
    private String currentPeriodEnd;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
