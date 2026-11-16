-- Habilitar la extensión pgvector para almacenamiento y búsqueda de embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabla de expedientes/documentos nutricionales indexados (el PDF original NO se conserva)
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

-- Tabla de fragmentos (chunks) con vector de 1536 dimensiones (OpenAI text-embedding-3-small)
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

-- Índice vectorial HNSW para similitud coseno rápida en pgvector
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
ON document_chunks USING hnsw (embedding vector_cosine_ops);

-- Índice GIN para búsqueda textual híbrida (Full-Text Search en español)
CREATE INDEX IF NOT EXISTS idx_document_chunks_fts
ON document_chunks USING gin (to_tsvector('spanish', content));

-- Índice de seguridad multi-tenant
CREATE INDEX IF NOT EXISTS idx_document_chunks_tenant
ON document_chunks (tenant_id, document_id);

