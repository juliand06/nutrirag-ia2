package com.ia2.nutrirag.repository;

import com.ia2.nutrirag.model.UserSubscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserSubscriptionRepository extends JpaRepository<UserSubscription, String> {
    Optional<UserSubscription> findByStripeSubscriptionId(String stripeSubscriptionId);
}
