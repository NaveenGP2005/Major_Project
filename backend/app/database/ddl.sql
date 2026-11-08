-- ==============================================================================
-- Pure PostgreSQL + pgvector DDL Script (384-dimensional Embeddings)
-- Target: Free Cloud PostgreSQL (e.g. Neon.tech / Supabase / Local Docker)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Enums
DO $$ BEGIN
    CREATE TYPE lifecycle_status_enum AS ENUM (
        'CANDIDATE', 'ACTIVE', 'STABLE', 'SUPERSEDED', 'STALE', 'ARCHIVED'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE confirmation_status_enum AS ENUM (
        'NOT_REQUIRED', 'PENDING', 'CONFIRMED', 'REJECTED'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE trust_source_enum AS ENUM (
        'OWNER', 'GUEST', 'QUOTED', 'AGENT', 'IMPORTED'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE memory_category_enum AS ENUM (
        'PROFILE', 'PREFERENCE', 'GOAL', 'PROJECT', 'EVENT', 'OTHER'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE speaker_type_enum AS ENUM (
        'OWNER', 'GUEST', 'AGENT'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_subject VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    memory_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) DEFAULT 'New Conversation',
    session_type VARCHAR(50) DEFAULT 'chat',
    language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- 3. Conversation Turns Table
CREATE TABLE IF NOT EXISTS conversation_turns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    turn_index INT NOT NULL,
    speaker_type speaker_type_enum NOT NULL DEFAULT 'OWNER',
    raw_transcript TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_turns_session_index ON conversation_turns(session_id, turn_index);

-- 4. Memory Cells Table (384-dim for all-MiniLM-L6-v2)
CREATE TABLE IF NOT EXISTS memory_cells (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    canonical_content TEXT NOT NULL,
    entity VARCHAR(255),
    category memory_category_enum NOT NULL DEFAULT 'OTHER',
    scope VARCHAR(100) DEFAULT 'general',
    confidence_score FLOAT NOT NULL DEFAULT 1.0,
    validity_score FLOAT NOT NULL DEFAULT 1.0,
    support_count INT NOT NULL DEFAULT 1,
    lifecycle_status lifecycle_status_enum NOT NULL DEFAULT 'ACTIVE',
    confirmation_status confirmation_status_enum NOT NULL DEFAULT 'NOT_REQUIRED',
    trust_source trust_source_enum NOT NULL DEFAULT 'OWNER',
    event_time TIMESTAMP WITH TIME ZONE,
    observed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    embedding vector(384),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memory_cells_user_status ON memory_cells(user_id, lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_memory_cells_category ON memory_cells(category);

-- HNSW index for sub-millisecond approximate cosine retrieval
CREATE INDEX IF NOT EXISTS idx_memory_cells_embedding_hnsw 
ON memory_cells USING hnsw (embedding vector_cosine_ops)
WHERE lifecycle_status = 'ACTIVE';

-- 5. Memory Evidence Links Table
CREATE TABLE IF NOT EXISTS memory_evidence_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    memory_id UUID NOT NULL REFERENCES memory_cells(id) ON DELETE CASCADE,
    turn_id UUID REFERENCES conversation_turns(id) ON DELETE SET NULL,
    exact_source_span TEXT NOT NULL,
    evidence_type VARCHAR(50) DEFAULT 'direct_statement',
    extracted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_evidence_memory_id ON memory_evidence_links(memory_id);
CREATE INDEX IF NOT EXISTS idx_evidence_turn_id ON memory_evidence_links(turn_id);

