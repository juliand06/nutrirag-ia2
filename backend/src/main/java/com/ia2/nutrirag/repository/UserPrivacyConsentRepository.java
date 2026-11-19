package com.ia2.nutrirag.repository;

import com.ia2.nutrirag.model.UserPrivacyConsent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserPrivacyConsentRepository extends JpaRepository<UserPrivacyConsent, String> {
}
