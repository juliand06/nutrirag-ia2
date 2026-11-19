-- Flyway Migration V2: Portal de Nutricionistas, Suscripciones Stripe, Privacidad GDPR/Ley 1581 y Auditoria

CREATE TABLE IF NOT EXISTS user_subscriptions (
    user_id VARCHAR(64) PRIMARY KEY REFERENCES user_accounts(id) ON DELETE CASCADE,
    plan_tier VARCHAR(16) NOT NULL DEFAULT 'FREE',
    stripe_customer_id VARCHAR(120),
    stripe_subscription_id VARCHAR(120),
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    current_period_end VARCHAR(32),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_privacy_consents (
    user_id VARCHAR(64) PRIMARY KEY REFERENCES user_accounts(id) ON DELETE CASCADE,
    essential_biometric BOOLEAN NOT NULL DEFAULT TRUE,
    smart_on_fhir_clinical BOOLEAN NOT NULL DEFAULT FALSE,
    ai_rag_memory BOOLEAN NOT NULL DEFAULT TRUE,
    nutritionist_sharing BOOLEAN NOT NULL DEFAULT FALSE,
    anonymous_product_analytics BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS privacy_audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    actor_email VARCHAR(160),
    action VARCHAR(80) NOT NULL,
    details TEXT,
    ip_hash VARCHAR(64),
    integrity_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS nutritionist_patient_links (
    id VARCHAR(64) PRIMARY KEY,
    nutritionist_id VARCHAR(64) NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    patient_email VARCHAR(160) NOT NULL,
    patient_name VARCHAR(120) NOT NULL,
    assigned_calories INT DEFAULT 2000,
    assigned_protein INT DEFAULT 130,
    assigned_carbs INT DEFAULT 215,
    assigned_fat INT DEFAULT 65,
    clinical_protocol VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS nutritionist_clinical_notes (
    id VARCHAR(64) PRIMARY KEY,
    link_id VARCHAR(64) NOT NULL REFERENCES nutritionist_patient_links(id) ON DELETE CASCADE,
    author_email VARCHAR(160),
    soap_note_encrypted TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS nutritionist_chat_messages (
    id VARCHAR(64) PRIMARY KEY,
    link_id VARCHAR(64) NOT NULL REFERENCES nutritionist_patient_links(id) ON DELETE CASCADE,
    sender_role VARCHAR(24) NOT NULL,
    sender_name VARCHAR(120) NOT NULL,
    message_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON privacy_audit_logs (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_nutri_links_owner ON nutritionist_patient_links (nutritionist_id);
CREATE INDEX IF NOT EXISTS idx_nutri_notes_link ON nutritionist_clinical_notes (link_id);
CREATE INDEX IF NOT EXISTS idx_nutri_chat_link ON nutritionist_chat_messages (link_id);
