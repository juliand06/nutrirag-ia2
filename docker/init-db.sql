-- ============================================================================
-- NutriRAG & Vision AI — Esquema Relacional Completo (PostgreSQL + pgvector)
-- Integra:
-- 1) Base Externa: Productividad Alimenticia por País + Rúbricas Médicas Globales
-- 2) Base Interna Relacional de la Persona: Perfil Biométrico, Condiciones, Comidas, Progreso
-- 3) Base Vectorial RAG: Documentos PDF (sin retener archivo) + Chunks HNSW/GIN
-- 4) Telemetría y Rendimiento de la IA: Gasto de tokens, latencia y enrutamiento
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- ----------------------------------------------------------------------------
-- 1. BASE EXTERNA: PRODUCTIVIDAD ALIMENTICIA POR PAÍS Y RÚBRICAS MÉDICAS GLOBALES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS country_food_productivity (
    country_code VARCHAR(4) PRIMARY KEY,
    country_name VARCHAR(80) NOT NULL,
    productivity_focus TEXT NOT NULL,
    nutritional_plus TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS country_local_foods (
    id SERIAL PRIMARY KEY,
    country_code VARCHAR(4) NOT NULL REFERENCES country_food_productivity(country_code) ON DELETE CASCADE,
    food_name VARCHAR(150) NOT NULL,
    budget_tier VARCHAR(20) NOT NULL CHECK (budget_tier IN ('economico', 'equilibrado', 'amplio')),
    kcal_per_100g INT NOT NULL,
    carbs_g NUMERIC(6,2) NOT NULL,
    protein_g NUMERIC(6,2) NOT NULL,
    fat_g NUMERIC(6,2) NOT NULL,
    nutritional_plus_note TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS clinical_nutrition_rubrics (
    rubric_id VARCHAR(64) PRIMARY KEY,
    condition_label VARCHAR(160) NOT NULL,
    global_authority VARCHAR(120) NOT NULL, -- OMS/FAO, ADA, AHA/DASH, ISSN
    key_clinical_rules TEXT NOT NULL,
    safety_alert_rule TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 2. BASE INTERNA RELACIONAL DE LA PERSONA (PERFIL, SALUD, COMIDAS Y PROGRESO)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users_biometric_profiles (
    user_id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(160) UNIQUE NOT NULL,
    country_code VARCHAR(4) REFERENCES country_food_productivity(country_code),
    budget_tier VARCHAR(20) DEFAULT 'equilibrado',
    sex VARCHAR(24) DEFAULT 'no_especificado',
    age INT DEFAULT 0,
    weight_kg NUMERIC(5,2) DEFAULT 0,
    height_cm NUMERIC(5,2) DEFAULT 0,
    activity_level VARCHAR(24) DEFAULT 'moderado',
    metabolism_type VARCHAR(24) DEFAULT 'equilibrado',
    bmr_kcal INT DEFAULT 0,
    tdee_kcal INT DEFAULT 0,
    bmi NUMERIC(4,1) DEFAULT 0,
    goal_id VARCHAR(40) DEFAULT 'mantenimiento',
    daily_calories_target INT DEFAULT 0,
    target_carbs_g INT DEFAULT 0,
    target_protein_g INT DEFAULT 0,
    target_fat_g INT DEFAULT 0,
    water_goal_ml INT DEFAULT 0,
    physical_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Relación N:M entre Persona y Rúbricas/Condiciones Médicas Globales
CREATE TABLE IF NOT EXISTS user_medical_conditions (
    user_id VARCHAR(64) NOT NULL REFERENCES users_biometric_profiles(user_id) ON DELETE CASCADE,
    rubric_id VARCHAR(64) NOT NULL REFERENCES clinical_nutrition_rubrics(rubric_id) ON DELETE CASCADE,
    activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, rubric_id)
);

-- Registro diario de comidas (manual o escáner multimodal)
CREATE TABLE IF NOT EXISTS daily_meal_logs (
    meal_id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users_biometric_profiles(user_id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL,
    log_date DATE NOT NULL,
    meal_type VARCHAR(32) NOT NULL,
    dish_name VARCHAR(200) NOT NULL,
    total_calories INT NOT NULL,
    carbs_g INT NOT NULL,
    protein_g INT NOT NULL,
    fat_g INT NOT NULL,
    fiber_g INT DEFAULT 0,
    glycemic_load VARCHAR(80),
    source_mode VARCHAR(24) DEFAULT 'manual', -- manual | vision_ai
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seguimiento longitudinal del cuerpo (peso, hidratación y adherencia)
CREATE TABLE IF NOT EXISTS body_progress_logs (
    progress_id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users_biometric_profiles(user_id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    weight_kg NUMERIC(5,2),
    water_ml INT DEFAULT 0,
    adherence_score INT DEFAULT 0,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 3. BASE VECTORIAL RAG (PDFs SIN RETENER ORIGINAL + CHUNKS HNSW/GIN)
-- ----------------------------------------------------------------------------
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_temp_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS document_chunks (
    id VARCHAR(64) PRIMARY KEY,
    document_id VARCHAR(64) NOT NULL REFERENCES nutritional_documents(id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL,
    page_number INT NOT NULL,
    section_title VARCHAR(255),
    chunk_order INT NOT NULL,
    token_count INT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 4. TELEMETRÍA Y RENDIMIENTO DE LA IA (GASTO DE TOKENS, LATENCIA Y MODO)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_performance_telemetry (
    event_id SERIAL PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users_biometric_profiles(user_id) ON DELETE SET NULL,
    tenant_id VARCHAR(64) NOT NULL,
    event_date DATE NOT NULL DEFAULT CURRENT_DATE,
    screen_context VARCHAR(40) NOT NULL, -- summary | meals | chat | documents | profile | copilot
    routing_mode VARCHAR(40) NOT NULL,   -- gemini-comprimido | openai-comprimido | cache-0-tokens | rag-local-0-tokens | guardrail-local-0-tokens
    tokens_used INT DEFAULT 0,
    tokens_saved INT DEFAULT 0,
    latency_ms INT DEFAULT 0,
    knowledge_score_pct INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices de rendimiento y seguridad multi-tenant
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
ON document_chunks USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_document_chunks_fts
ON document_chunks USING gin (to_tsvector('spanish', content));

CREATE INDEX IF NOT EXISTS idx_document_chunks_tenant
ON document_chunks (tenant_id, document_id);

CREATE INDEX IF NOT EXISTS idx_daily_meal_logs_user_date
ON daily_meal_logs (user_id, log_date DESC);

CREATE INDEX IF NOT EXISTS idx_body_progress_user_date
ON body_progress_logs (user_id, log_date DESC);

CREATE INDEX IF NOT EXISTS idx_ai_telemetry_user_date
ON ai_performance_telemetry (user_id, event_date DESC);


-- ----------------------------------------------------------------------------
-- 5. INTEROPERABILIDAD CLÍNICA / HOSPITALARIA Y RÚBRICA DE COORDINACIÓN POR EMAIL
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical_institutions (
    institution_id VARCHAR(64) PRIMARY KEY,
    institution_name VARCHAR(180) NOT NULL,
    institution_type VARCHAR(40) NOT NULL, -- clinica_nutricion | hospital | laboratorio
    country_code VARCHAR(4) REFERENCES country_food_productivity(country_code),
    specialty VARCHAR(120) NOT NULL,
    fhir_endpoint_url VARCHAR(255),
    verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Base extensa de conocimiento clínico/hospitalario ingerido en el motor RAG
CREATE TABLE IF NOT EXISTS hospital_knowledge_corpus (
    corpus_id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) NOT NULL REFERENCES clinical_institutions(institution_id) ON DELETE CASCADE,
    document_id VARCHAR(64) REFERENCES nutritional_documents(id) ON DELETE SET NULL,
    specialty_area VARCHAR(120) NOT NULL,
    evidence_grade VARCHAR(8) DEFAULT 'A', -- A | B | C
    protocol_summary TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expediente clínico real del paciente vinculado mediante su Gmail/correo verificado
CREATE TABLE IF NOT EXISTS patient_clinical_records (
    record_id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users_biometric_profiles(user_id) ON DELETE CASCADE,
    institution_id VARCHAR(64) REFERENCES clinical_institutions(institution_id),
    patient_email VARCHAR(160) NOT NULL,
    consent_granted BOOLEAN DEFAULT FALSE,
    consent_timestamp TIMESTAMP,
    exam_date DATE NOT NULL,
    clinical_weight_kg NUMERIC(5,2),
    fasting_glucose_mg_dl NUMERIC(5,1),
    hba1c_pct NUMERIC(4,2),
    ldl_cholesterol_mg_dl NUMERIC(5,1),
    hdl_cholesterol_mg_dl NUMERIC(5,1),
    triglycerides_mg_dl NUMERIC(5,1),
    hemoglobin_g_dl NUMERIC(4,1),
    blood_pressure_sys INT,
    blood_pressure_dia INT,
    icd10_codes TEXT,
    allergies_text TEXT,
    medications_text TEXT,
    clinician_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rúbrica de coordinación entre datos reales del usuario en la app y sus registros clínicos
CREATE TABLE IF NOT EXISTS clinical_reconciliation_rubric (
    reconciliation_id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users_biometric_profiles(user_id) ON DELETE CASCADE,
    record_id VARCHAR(64) NOT NULL REFERENCES patient_clinical_records(record_id) ON DELETE CASCADE,
    email_match_verified BOOLEAN NOT NULL,
    consent_verified BOOLEAN NOT NULL,
    concordance_score_pct INT NOT NULL,
    discrepancies_summary TEXT,
    auto_synced_conditions TEXT,
    reconciled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patient_clinical_email
ON patient_clinical_records (LOWER(patient_email));

CREATE INDEX IF NOT EXISTS idx_clinical_reconciliation_user
ON clinical_reconciliation_rubric (user_id, reconciled_at DESC);
