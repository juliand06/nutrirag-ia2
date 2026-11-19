-- Flyway Migration V1: Esquema Relacional + Auth JWT + pgvector para NutriStudio AI
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS user_accounts (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(160) UNIQUE NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    auth_provider VARCHAR(24) NOT NULL DEFAULT 'LOCAL',
    role VARCHAR(24) NOT NULL DEFAULT 'USER',
    country_code VARCHAR(8) DEFAULT 'CO',
    budget_tier VARCHAR(24) DEFAULT 'equilibrado',
    sex VARCHAR(24) DEFAULT 'no_especificado',
    age INT DEFAULT 0,
    weight_kg DOUBLE PRECISION DEFAULT 0,
    height_cm DOUBLE PRECISION DEFAULT 0,
    activity_level VARCHAR(24) DEFAULT 'moderado',
    metabolism_type VARCHAR(24) DEFAULT 'equilibrado',
    goal VARCHAR(40) DEFAULT 'mantenimiento',
    daily_calories INT DEFAULT 0,
    target_carbs INT DEFAULT 0,
    target_protein INT DEFAULT 0,
    target_fat INT DEFAULT 0,
    water_goal_ml INT DEFAULT 2000,
    medical_conditions_csv TEXT,
    physical_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    token VARCHAR(512) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS daily_meal_entries (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    log_date VARCHAR(16) NOT NULL,
    log_time VARCHAR(16),
    meal_type VARCHAR(32) NOT NULL,
    dish_name VARCHAR(200) NOT NULL,
    total_calories INT NOT NULL,
    carbs_grams INT NOT NULL,
    protein_grams INT NOT NULL,
    fat_grams INT NOT NULL,
    fiber_grams INT DEFAULT 0,
    sodium_mg INT DEFAULT 0,
    potassium_mg INT DEFAULT 0,
    vitamin_c_mg INT DEFAULT 0,
    quality_score INT DEFAULT 80,
    nutri_grade VARCHAR(4) DEFAULT 'A',
    glycemic_load VARCHAR(80),
    nutritional_advice TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS body_progress_entries (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    log_date VARCHAR(16) NOT NULL,
    weight_kg DOUBLE PRECISION,
    water_ml INT DEFAULT 0,
    note VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS nutritional_documents (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    owner_username VARCHAR(100) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    sha256_hash VARCHAR(64) NOT NULL,
    total_pages INT NOT NULL,
    total_chunks INT NOT NULL,
    ocr_applied BOOLEAN DEFAULT FALSE,
    embedding_model VARCHAR(100) NOT NULL,
    temp_file_deleted BOOLEAN DEFAULT TRUE,
    indexing_status VARCHAR(32) DEFAULT 'INDEXED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_temp_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS document_chunks (
    id VARCHAR(64) PRIMARY KEY,
    document_id VARCHAR(64) NOT NULL REFERENCES nutritional_documents(id) ON DELETE CASCADE,
    document_name VARCHAR(255),
    tenant_id VARCHAR(64) NOT NULL,
    page_number INT NOT NULL,
    section_title VARCHAR(255),
    chunk_order INT NOT NULL,
    token_count INT NOT NULL,
    content TEXT NOT NULL,
    embedding_vector_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_daily_meal_entries_user_date ON daily_meal_entries (user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_body_progress_entries_user_date ON body_progress_entries (user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_document_chunks_tenant ON document_chunks (tenant_id, document_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens (token);
