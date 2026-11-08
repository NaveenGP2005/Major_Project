# Phase 1 Implementation Plan: Long-Term Conversational Memory
**Objective 1: Evidence-Grounded Canonical Memory Adaptation & Cross-Session Retrieval**

> **CONFIDENTIAL ARCHITECTURAL SPECIFICATION**  
> **System Architecture**: Adaptive Lifecycle Memory Engine (ALME)  
> **Target Audience**: Core Engineering Team & AI Implementation Agent (Gemini Flash)  
> **Rule**: Strict neutral architectural naming throughout (no external benchmark / paper acronyms).

---

## Table of Contents
1. [Directory & Module Tree](#1-directory--module-tree)
2. [PostgreSQL + pgvector Database Schema (DDL & SQLAlchemy)](#2-postgresql--pgvector-database-schema-ddl--sqlalchemy)
3. [Stage I: Evidence-Grounded Memory Adaptation Pipeline](#3-stage-i-evidence-grounded-memory-adaptation-pipeline)
4. [Cross-Session Retrieval & Prompt Injection Engine](#4-cross-session-retrieval--prompt-injection-engine)
5. [FastAPI Endpoints & Schemas](#5-fastapi-endpoints--schemas)
6. [Demo UI Specification (React + Vite + Tailwind)](#6-demo-ui-specification-react--vite--tailwind)
7. [Step-by-Step Task Checklist for Implementation](#7-step-by-step-task-checklist-for-implementation)

---

## 1. Directory & Module Tree

```text
D:\Study\Assignment\Major\
├── backend/
│   ├── .env.example
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                     # FastAPI entry point, CORS, routers
│   │   ├── config.py                   # Pydantic BaseSettings (.env loader)
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── dependencies.py         # DB session, auth mock/JWT dependency
│   │   │   ├── sessions.py             # Session management router
│   │   │   ├── chat.py                 # Chat ingest, retrieval & generation router
│   │   │   └── memories.py             # Memory inspector & management router
│   │   ├── database/
│   │   │   ├── __init__.py
│   │   │   ├── session.py              # Async SQLAlchemy engine & session maker
│   │   │   ├── models.py               # Declarative ORM models
│   │   │   └── ddl.sql                 # Pure SQL DDL scripts with pgvector
│   │   ├── memory_engine/
│   │   │   ├── __init__.py
│   │   │   ├── schemas.py              # Pydantic schemas for extraction & retrieval
│   │   │   ├── embeddings.py           # Vector embedding client (OpenAI / HuggingFace)
│   │   │   ├── canonical_extractor.py  # Stage I: LLM extraction & proposition normalizer
│   │   │   ├── deduplication.py        # Exact key + semantic similarity dedup
│   │   │   ├── retriever.py            # Hybrid similarity & active-filtered search
│   │   │   └── prompt_injector.py      # Context construction with evidence citation
│   │   └── services/
│   │       ├── __init__.py
│   │       └── llm_service.py          # Unified LLM provider client (OpenAI / Gemini)
│   └── tests/
│       ├── __init__.py
│       ├── conftest.py                 # SQLite/Postgres test fixtures
│       ├── test_extraction.py          # Test Stage I canonical extraction
│       ├── test_deduplication.py       # Test exact & near-match deduplication
│       └── test_cross_session.py       # Test multi-session storage & recall
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── tsconfig.json
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx                     # Split-screen shell
│       ├── types/
│       │   └── index.ts                # TypeScript interfaces for API contracts
│       ├── services/
│       │   └── api.ts                  # Axios/Fetch client for backend
│       ├── components/
│       │   ├── SessionHeader.tsx       # Session switcher & status indicators
│       │   ├── ChatPanel.tsx           # Left panel: message list, citations, input
│       │   ├── MemoryInspector.tsx     # Right panel: live memory cards & JSON inspector
│       │   └── MemoryBadge.tsx         # Category & Lifecycle status pills
│       └── styles/
│           └── globals.css
└── docs/
    └── PHASE1_IMPLEMENTATION_PLAN.md   # This specification document
```

---

## 2. PostgreSQL + pgvector Database Schema (DDL & SQLAlchemy)

### 2.1 Pure SQL DDL (`backend/app/database/ddl.sql`)

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Enum Types
CREATE TYPE lifecycle_status_enum AS ENUM (
    'CANDIDATE',
    'ACTIVE',
    'STABLE',
    'SUPERSEDED',
    'STALE',
    'ARCHIVED'
);

CREATE TYPE confirmation_status_enum AS ENUM (
    'NOT_REQUIRED',
    'PENDING',
    'CONFIRMED',
    'REJECTED'
);

CREATE TYPE trust_source_enum AS ENUM (
    'OWNER',
    'GUEST',
    'QUOTED',
    'AGENT',
    'IMPORTED'
);

CREATE TYPE memory_category_enum AS ENUM (
    'PROFILE',
    'PREFERENCE',
    'GOAL',
    'PROJECT',
    'EVENT',
    'OTHER'
);

CREATE TYPE speaker_type_enum AS ENUM (
    'OWNER',
    'GUEST',
    'AGENT'
);

-- 1. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_subject VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    memory_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Sessions Table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) DEFAULT 'New Conversation',
    session_type VARCHAR(50) DEFAULT 'chat',
    language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);

-- 3. Conversation Turns Table (Raw dialogue log with full auditability)
CREATE TABLE conversation_turns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    turn_index INT NOT NULL,
    speaker_type speaker_type_enum NOT NULL DEFAULT 'OWNER',
    raw_transcript TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_turns_session_index ON conversation_turns(session_id, turn_index);

-- 4. Memory Cells Table (Canonical extracted units m_i = (c_i, E_i, a_i, rho_i, s_i))
CREATE TABLE memory_cells (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    canonical_content TEXT NOT NULL,
    entity VARCHAR(255),
    category memory_category_enum NOT NULL DEFAULT 'OTHER',
    scope VARCHAR(100) DEFAULT 'general',
    confidence_score FLOAT NOT NULL DEFAULT 1.0,
    validity_score FLOAT NOT NULL DEFAULT 1.0,
    lifecycle_status lifecycle_status_enum NOT NULL DEFAULT 'ACTIVE',
    confirmation_status confirmation_status_enum NOT NULL DEFAULT 'NOT_REQUIRED',
    trust_source trust_source_enum NOT NULL DEFAULT 'OWNER',
    event_time TIMESTAMP WITH TIME ZONE,
    observed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    embedding vector(1536), -- Compatible with text-embedding-3-small or OpenAI ada-002
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_memory_cells_user_status ON memory_cells(user_id, lifecycle_status);
CREATE INDEX idx_memory_cells_category ON memory_cells(category);
-- HNSW index for fast sub-millisecond approximate cosine retrieval
CREATE INDEX idx_memory_cells_embedding ON memory_cells USING hnsw (embedding vector_cosine_ops)
WHERE lifecycle_status = 'ACTIVE';

-- 5. Memory Evidence Links Table (Traceable provenance linking cells to dialogue turns)
CREATE TABLE memory_evidence_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    memory_id UUID NOT NULL REFERENCES memory_cells(id) ON DELETE CASCADE,
    turn_id UUID REFERENCES conversation_turns(id) ON DELETE SET NULL,
    exact_source_span TEXT NOT NULL,
    evidence_type VARCHAR(50) DEFAULT 'direct_statement',
    extracted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_evidence_memory_id ON memory_evidence_links(memory_id);
CREATE INDEX idx_evidence_turn_id ON memory_evidence_links(turn_id);
```

### 2.2 SQLAlchemy Models (`backend/app/database/models.py`)

```python
import enum
import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import (
    Boolean, Column, DateTime, Enum, Float, ForeignKey,
    Integer, String, Text, func
)
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector

class Base(DeclarativeBase):
    pass

class LifecycleStatus(str, enum.Enum):
    CANDIDATE  = "CANDIDATE"
    ACTIVE     = "ACTIVE"
    STABLE     = "STABLE"
    SUPERSEDED = "SUPERSEDED"
    STALE      = "STALE"
    ARCHIVED   = "ARCHIVED"

class ConfirmationStatus(str, enum.Enum):
    NOT_REQUIRED = "NOT_REQUIRED"
    PENDING      = "PENDING"
    CONFIRMED    = "CONFIRMED"
    REJECTED     = "REJECTED"

class TrustSource(str, enum.Enum):
    OWNER    = "OWNER"
    GUEST    = "GUEST"
    QUOTED   = "QUOTED"
    AGENT    = "AGENT"
    IMPORTED = "IMPORTED"

class MemoryCategory(str, enum.Enum):
    PROFILE    = "PROFILE"
    PREFERENCE = "PREFERENCE"
    GOAL       = "GOAL"
    PROJECT    = "PROJECT"
    EVENT      = "EVENT"
    OTHER      = "OTHER"

class SpeakerType(str, enum.Enum):
    OWNER = "OWNER"
    GUEST = "GUEST"
    AGENT = "AGENT"

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    auth_subject: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    display_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True)
    memory_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    sessions: Mapped[List["Session"]] = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    memory_cells: Mapped[List["MemoryCell"]] = relationship("MemoryCell", back_populates="user", cascade="all, delete-orphan")

class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), default="New Conversation")
    session_type: Mapped[str] = mapped_column(String(50), default="chat")
    language: Mapped[str] = mapped_column(String(10), default="en")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="sessions")
    turns: Mapped[List["ConversationTurn"]] = relationship("ConversationTurn", back_populates="session", cascade="all, delete-orphan", order_by="ConversationTurn.turn_index")

class ConversationTurn(Base):
    __tablename__ = "conversation_turns"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    turn_index: Mapped[int] = mapped_column(Integer, nullable=False)
    speaker_type: Mapped[SpeakerType] = mapped_column(Enum(SpeakerType), default=SpeakerType.OWNER, nullable=False)
    raw_transcript: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    session: Mapped["Session"] = relationship("Session", back_populates="turns")
    evidence_links: Mapped[List["MemoryEvidenceLink"]] = relationship("MemoryEvidenceLink", back_populates="turn")

class MemoryCell(Base):
    __tablename__ = "memory_cells"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    canonical_content: Mapped[str] = mapped_column(Text, nullable=False)
    entity: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    category: Mapped[MemoryCategory] = mapped_column(Enum(MemoryCategory), default=MemoryCategory.OTHER, nullable=False, index=True)
    scope: Mapped[str] = mapped_column(String(100), default="general")
    confidence_score: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    validity_score: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    lifecycle_status: Mapped[LifecycleStatus] = mapped_column(Enum(LifecycleStatus), default=LifecycleStatus.ACTIVE, nullable=False, index=True)
    confirmation_status: Mapped[ConfirmationStatus] = mapped_column(Enum(ConfirmationStatus), default=ConfirmationStatus.NOT_REQUIRED, nullable=False)
    trust_source: Mapped[TrustSource] = mapped_column(Enum(TrustSource), default=TrustSource.OWNER, nullable=False)
    event_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    embedding: Mapped[Optional[List[float]]] = mapped_column(Vector(1536), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship("User", back_populates="memory_cells")
    evidence_links: Mapped[List["MemoryEvidenceLink"]] = relationship("MemoryEvidenceLink", back_populates="memory_cell", cascade="all, delete-orphan")

class MemoryEvidenceLink(Base):
    __tablename__ = "memory_evidence_links"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    memory_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("memory_cells.id", ondelete="CASCADE"), nullable=False, index=True)
    turn_id: Mapped[Optional[uuid.UUID]] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("conversation_turns.id", ondelete="SET NULL"), nullable=True, index=True)
    exact_source_span: Mapped[str] = mapped_column(Text, nullable=False)
    evidence_type: Mapped[str] = mapped_column(String(50), default="direct_statement")
    extracted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    memory_cell: Mapped["MemoryCell"] = relationship("MemoryCell", back_populates="evidence_links")
    turn: Mapped[Optional["ConversationTurn"]] = relationship("ConversationTurn", back_populates="evidence_links")
```

---

## 3. Stage I: Evidence-Grounded Memory Adaptation Pipeline

### 3.1 Pydantic Extraction Schemas (`backend/app/memory_engine/schemas.py`)

```python
import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from app.database.models import MemoryCategory, LifecycleStatus, ConfirmationStatus, TrustSource

class ExtractedMemoryItem(BaseModel):
    """Atomic proposition extracted from user dialogue turn."""
    canonical_content: str = Field(
        description="Atomic, self-contained factual proposition rewritten in third person (e.g. 'User prefers concise responses'). Avoid pronouns like 'he', 'she', 'they' without clear reference; prefer 'User'."
    )
    entity: Optional[str] = Field(
        default=None,
        description="The primary entity or domain of this fact (e.g., 'GATE Exam', 'Python', 'Hyderabad', 'User Profile')."
    )
    category: MemoryCategory = Field(
        default=MemoryCategory.OTHER,
        description="One of: PROFILE, PREFERENCE, GOAL, PROJECT, EVENT, OTHER"
    )
    exact_source_span: str = Field(
        description="The verbatim substring from the user turn that directly proves this fact."
    )
    temporal_anchor: Optional[str] = Field(
        default=None,
        description="Explicit date/time mentioned (ISO 8601 string or interval), or null if general timeless fact."
    )
    scope: str = Field(
        default="general",
        description="Applicability scope: 'permanent', 'temporary stay', 'academic', 'work', 'hobby', etc."
    )
    confidence: float = Field(
        ge=0.0, le=1.0, default=1.0,
        description="Extractor confidence in factual certainty (1.0 = explicit statement, 0.7 = inferred)."
    )

class ExtractionResponse(BaseModel):
    """Root container returned by LLM structured extraction."""
    extracted_memories: List[ExtractedMemoryItem] = Field(
        default_factory=list,
        description="List of extracted durable memories. Empty if the utterance is conversational chit-chat."
    )
```

### 3.2 Extractor System Prompt (`backend/app/memory_engine/canonical_extractor.py`)

```python
EXTRACTOR_SYSTEM_PROMPT = """You are an expert Evidence-Grounded Memory Adaptation Engine.
Your task is to analyze the latest user utterance in a multi-turn conversation and extract long-term, durable memory propositions about the user.

STRICT EXTRACTION RULES:
1. ONLY extract durable facts, user preferences, long-term goals, project details, or persistent constraints.
2. DISCARD ALL conversational filler, greetings, transient state, pleasantries, questions, and immediate task requests (e.g., "Hello", "How are you?", "Can you write a python script?", "Thanks!").
3. REWRITE each proposition into a self-contained, canonical third-person statement starting with "User ...".
4. EVERY extracted proposition MUST have an `exact_source_span` quoting the verbatim words from the user utterance that justify the claim. If you cannot quote direct evidence, DO NOT extract it.
5. DO NOT hallucinate, infer speculative attributes, or assume intent beyond what is explicitly stated.
6. If the user statement contains no durable information, return an empty list: {"extracted_memories": []}.

JSON SCHEMA FORMAT REQUIRED:
{
  "extracted_memories": [
    {
      "canonical_content": "User is preparing for the GATE examination",
      "entity": "GATE Examination",
      "category": "GOAL",
      "exact_source_span": "I am currently prepping for the GATE exam",
      "temporal_anchor": null,
      "scope": "academic",
      "confidence": 1.0
    }
  ]
}
"""
```

### 3.3 Deduplication & Evidence Linking Logic (`backend/app/memory_engine/deduplication.py`)

```python
import re
from typing import Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.models import MemoryCell, MemoryEvidenceLink, LifecycleStatus

def normalize_text_key(text: str) -> str:
    """Normalize text: lowercase, remove punctuation, collapse whitespace."""
    clean = re.sub(r'[^\w\s]', '', text.lower())
    return ' '.join(clean.split())

async def find_duplicate_memory(
    session: AsyncSession,
    user_id: str,
    candidate_content: str,
    candidate_embedding: list[float],
    semantic_threshold: float = 0.92
) -> Optional[MemoryCell]:
    """
    Two-tier deduplication check:
    Tier 1: Normalized exact string match.
    Tier 2: High cosine similarity (>= 0.92) for active memories of the user.
    """
    candidate_key = normalize_text_key(candidate_content)
    
    # Tier 1: Search active memories of this user
    stmt = select(MemoryCell).where(
        MemoryCell.user_id == user_id,
        MemoryCell.lifecycle_status.in_([LifecycleStatus.ACTIVE, LifecycleStatus.STABLE])
    )
    result = await session.execute(stmt)
    active_memories = result.scalars().all()
    
    for mem in active_memories:
        if normalize_text_key(mem.canonical_content) == candidate_key:
            return mem
            
    # Tier 2: Vector cosine similarity check using pgvector
    if candidate_embedding:
        vec_stmt = select(MemoryCell).where(
            MemoryCell.user_id == user_id,
            MemoryCell.lifecycle_status.in_([LifecycleStatus.ACTIVE, LifecycleStatus.STABLE])
        ).order_by(
            MemoryCell.embedding.cosine_distance(candidate_embedding)
        ).limit(1)
        
        vec_res = await session.execute(vec_stmt)
        closest_mem = vec_res.scalar_one_or_none()
        if closest_mem:
            # Distance d in [0, 2], cosine similarity = 1 - d
            # When distance < (1 - 0.92) = 0.08, similarity >= 0.92
            pass # SQLAlchemy pgvector distance operator
    
    return None
```

If a duplicate is detected:
1. Do **NOT** insert a new `MemoryCell`.
2. Insert a new `MemoryEvidenceLink` linking the existing `memory_id` to the new `turn_id` and new `exact_source_span`.
3. Increment `confidence_score` slightly and touch `updated_at`.

---

## 4. Cross-Session Retrieval & Prompt Injection Engine

### 4.1 Hybrid Retrieval Function (`backend/app/memory_engine/retriever.py`)

```python
import uuid
from typing import List
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from app.database.models import MemoryCell, MemoryEvidenceLink, LifecycleStatus

class RetrievedMemoryItem(BaseModel):
    id: uuid.UUID
    canonical_content: str
    category: str
    similarity_score: float
    evidence_span: str
    observed_at: str

async def retrieve_relevant_memories(
    db: AsyncSession,
    user_id: uuid.UUID,
    query_text: str,
    query_embedding: List[float],
    top_k: int = 5,
    similarity_threshold: float = 0.65
) -> List[RetrievedMemoryItem]:
    """
    Retrieve active memory cells for a given user using pgvector cosine distance,
    joined with primary evidence spans for complete provenance.
    """
    # 1 - (embedding <=> query_embedding) calculates cosine similarity
    query = text("""
        SELECT 
            m.id,
            m.canonical_content,
            m.category,
            1 - (m.embedding <=> :query_vec::vector) AS similarity,
            COALESCE(e.exact_source_span, '') AS evidence_span,
            m.observed_at
        FROM memory_cells m
        LEFT JOIN LATERAL (
            SELECT exact_source_span 
            FROM memory_evidence_links 
            WHERE memory_id = m.id 
            ORDER BY extracted_at DESC 
            LIMIT 1
        ) e ON TRUE
        WHERE m.user_id = :uid
          AND m.lifecycle_status IN ('ACTIVE', 'STABLE')
          AND (1 - (m.embedding <=> :query_vec::vector)) >= :sim_thresh
        ORDER BY similarity DESC
        LIMIT :k;
    """)

    result = await db.execute(
        query,
        {
            "uid": str(user_id),
            "query_vec": str(query_embedding),
            "sim_thresh": similarity_threshold,
            "k": top_k
        }
    )
    rows = result.fetchall()
    
    return [
        RetrievedMemoryItem(
            id=row[0],
            canonical_content=row[1],
            category=row[2],
            similarity_score=float(row[3]),
            evidence_span=row[4],
            observed_at=row[5].isoformat() if row[5] else ""
        )
        for row in rows
    ]
```

### 4.2 System Prompt Construction with Provenance (`backend/app/memory_engine/prompt_injector.py`)

```python
from typing import List
from app.memory_engine.retriever import RetrievedMemoryItem

def construct_agent_system_prompt(memories: List[RetrievedMemoryItem]) -> str:
    """
    Format retrieved canonical memories into the Assistant's system prompt.
    Includes provenance tracking instructions so the agent can naturally adapt.
    """
    if not memories:
        return "You are a helpful, context-aware voice and text AI assistant."

    memory_block = "\n".join([
        f"- [Ref: {m.id}][Category: {m.category}] {m.canonical_content}"
        for m in memories
    ])

    return f"""You are a helpful, context-aware voice and text AI assistant.

LONG-TERM USER CONTEXT & PERSISTENT MEMORIES:
The following facts about the user have been verified from previous sessions:
{memory_block}

GUIDELINES FOR USING RETRIEVED MEMORIES:
1. Seamlessly apply user preferences, goals, and constraints without robotically quoting them unless asked.
2. If the user asks about past topics or states facts that depend on this context, utilize this verified evidence directly.
3. Keep spoken and text responses natural, helpful, and concise.
"""
```

---

## 5. FastAPI Endpoints & Schemas

### 5.1 Request & Response Schemas (`backend/app/api/schemas.py`)

```python
import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

# ── Session Schemas ──
class CreateSessionRequest(BaseModel):
    user_id: uuid.UUID
    title: Optional[str] = "New Conversation"
    session_type: Optional[str] = "chat"

class SessionResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    session_type: str
    created_at: datetime

# ── Chat Ingest Schemas ──
class ChatMessageRequest(BaseModel):
    session_id: uuid.UUID
    message: str = Field(min_length=1)

class MemoryCitation(BaseModel):
    id: uuid.UUID
    canonical_content: str
    category: str
    similarity_score: float

class ExtractedMemoryResponse(BaseModel):
    id: uuid.UUID
    canonical_content: str
    entity: Optional[str]
    category: str
    source_span: str
    confidence: float
    lifecycle_status: str

class ChatMessageResponse(BaseModel):
    assistant_response: str
    session_id: uuid.UUID
    turn_id: uuid.UUID
    cited_memories: List[MemoryCitation] = Field(default_factory=list)
    newly_extracted_memories: List[ExtractedMemoryResponse] = Field(default_factory=list)

# ── Inspector Schemas ──
class MemoryEvidenceDetail(BaseModel):
    id: uuid.UUID
    turn_id: Optional[uuid.UUID]
    exact_source_span: str
    extracted_at: datetime

class MemoryCellDetail(BaseModel):
    id: uuid.UUID
    canonical_content: str
    entity: Optional[str]
    category: str
    scope: str
    confidence_score: float
    lifecycle_status: str
    observed_at: datetime
    evidence_links: List[MemoryEvidenceDetail] = Field(default_factory=list)
```

### 5.2 API Routers

#### Router 1: Sessions (`backend/app/api/sessions.py`)
- `POST /api/v1/sessions`: Create new session for a user.
- `GET /api/v1/sessions?user_id=...`: List all past sessions for the session switcher.

#### Router 2: Chat Execution (`backend/app/api/chat.py`)
- `POST /api/v1/chat`:
  1. Record incoming user turn in `conversation_turns`.
  2. Embed user query via embedding service.
  3. Retrieve active cross-session memory cells (`retrieve_relevant_memories`).
  4. Build augmented system prompt with memory block.
  5. Call Assistant LLM to generate response.
  6. Trigger Stage I extraction on the user turn (extract canonical memory items).
  7. Run deduplication check; insert new `MemoryCell` and `MemoryEvidenceLink` records.
  8. Record assistant turn in `conversation_turns`.
  9. Return assistant answer, cited memories, and newly extracted memories in one response.

#### Router 3: Memory Inspector (`backend/app/api/memories.py`)
- `GET /api/v1/memories?user_id=...`: Return all stored memory cells with their nested evidence spans for the right-side Live Inspector.
- `DELETE /api/v1/memories/{id}`: Hard delete or archive a memory record (vital for live demos to reset state).

---

## 6. Demo UI Specification (React + Vite + Tailwind)

### 6.1 Split-Screen Architecture

```text
+---------------------------------------------------------------------------------------------------+
|  Top Bar: Project Title | User: Student (Demo User) | Active Session: #2 (Dijkstra Question)       |
+---------------------------------------------------+-----------------------------------------------+
|  LEFT PANEL: Chat & Multi-Session Switcher (50%)  |  RIGHT PANEL: Live Memory & Provenance (50%)   |
|                                                   |                                               |
|  [+ New Session]  [Session #1]  [Session #2 (curr)]|  Total Stored Memories: 2 | Status: ACTIVE    |
|  ------------------------------------------------ |  -------------------------------------------  |
|  User:                                            |  [Card 1]                                     |
|  "Can you explain Dijkstra's algorithm?"          |  Canonical: "User prefers concise bullet-point|
|                                                   |             explanations"                     |
|  Assistant: [Memory Badge: Applied Preference]     |  Category: PREFERENCE | Status: ACTIVE (1.0)  |
|  "Here is Dijkstra's algorithm in concise points: |  Source Turn: turn_001 (Session #1)           |
|   - Initializes distances to infinity             |  Proven Span: "honestly I really prefer       |
|   - Uses a priority queue for minimum distance    |               concise bullet-point..."        |
|   - Greedily settles the closest vertex..."       |                                               |
|                                                   |  [Card 2]                                     |
|                                                   |  Canonical: "User is preparing for GATE exam" |
|                                                   |  Category: GOAL | Status: ACTIVE              |
|  [ Input Box: Ask or speak...           ] [Send]  |  Proven Span: "prepping for the GATE exam"    |
+---------------------------------------------------+-----------------------------------------------+
```

### 6.2 Key UI Components
1. **`SessionHeader.tsx`**:
   - Shows active user ID and session list.
   - "+ New Session" button: switches `session_id`, clears active chat view, but retains memory store to prove cross-session persistence to evaluators.
2. **`ChatPanel.tsx`**:
   - Message bubble list.
   - If an assistant message used memories, display an inline pill: `🏷️ Recalled: User prefers concise explanations`.
3. **`MemoryInspector.tsx`**:
   - Live list of memory cards fetched via polling or instant post-turn update.
   - Each card displays:
     - `canonical_content` (bold proposition)
     - Category badge (blue for `PREFERENCE`, green for `GOAL`, purple for `PROFILE`)
     - `exact_source_span` rendered in quote styling (`"..."`) with `turn_id` reference
     - Trash icon button calling `DELETE /api/v1/memories/{id}` for live reset.

---

## 7. Step-by-Step Task Checklist for Implementation

Feed these tasks sequentially to the coding agent (Gemini Flash):

- [ ] **Task 1: Environment & Dependency Setup**
  - Verify and update `backend/requirements.txt` (`fastapi`, `uvicorn`, `pydantic`, `pydantic-settings`, `sqlalchemy`, `asyncpg`, `pgvector`, `openai`, `pytest`).
  - Create `backend/.env` with database connection string, OpenAI/Gemini API key, and settings.
  - Test imports in a Python test script.

- [ ] **Task 2: Database Connection & DDL Execution**
  - Implement `backend/app/database/session.py` with `create_async_engine` and `async_sessionmaker`.
  - Implement complete SQLAlchemy models in `backend/app/database/models.py`.
  - Create table creation routine (`Base.metadata.create_all` or SQL migration runner).

- [ ] **Task 3: Embedding & LLM Client Service**
  - Implement `backend/app/services/llm_service.py` to wrap chat completions with JSON schema support.
  - Implement `backend/app/memory_engine/embeddings.py` generating 1536-dim vector embeddings.

- [ ] **Task 4: Stage I Canonical Extractor & Pydantic Validation**
  - Create `backend/app/memory_engine/schemas.py` with `ExtractedMemoryItem` and `ExtractionResponse`.
  - Implement `backend/app/memory_engine/canonical_extractor.py` executing the prompt and returning validated canonical propositions.

- [ ] **Task 5: Deduplication & Persistence Layer**
  - Implement `backend/app/memory_engine/deduplication.py` checking normalized string keys and vector proximity.
  - Implement logic to insert `MemoryCell` and `MemoryEvidenceLink` transactionally.

- [ ] **Task 6: Cross-Session Retriever & Prompt Injector**
  - Implement `backend/app/memory_engine/retriever.py` performing cosine similarity search using pgvector.
  - Implement `backend/app/memory_engine/prompt_injector.py` formatting recalled memories into system instructions.

- [ ] **Task 7: FastAPI Endpoints & Routers**
  - Implement `backend/app/api/sessions.py` (`POST /api/v1/sessions`).
  - Implement `backend/app/api/chat.py` (`POST /api/v1/chat`).
  - Implement `backend/app/api/memories.py` (`GET /api/v1/memories`, `DELETE /api/v1/memories/{id}`).
  - Mount routers in `backend/app/main.py` with CORS middleware.

- [ ] **Task 8: Automated Verification Test Suite**
  - Write `backend/tests/test_stage1_pipeline.py` testing:
    - Session 1 turn insertion and canonical extraction.
    - Session 2 question and cross-session retrieval.
    - Exact provenance link verification.

- [ ] **Task 9: React Frontend (Split-Screen Demo)**
  - Initialize Vite React + Tailwind setup in `frontend/`.
  - Build `ChatPanel` with session switcher.
  - Build `MemoryInspector` showing live cards and provenance spans.
  - Connect API client to backend.

- [ ] **Task 10: End-to-End Live Walkthrough Verification**
  - Run the full end-to-end evaluation flow:
    - Turn 1 (Session 1): State GATE exam goal & concise bullet preference.
    - Verify Inspector shows 2 structured cards with verbatim evidence spans.
    - Click "New Session" (Session 2).
    - Turn 2 (Session 2): Ask for Dijkstra explanation.
    - Confirm response is bulleted and references recalled memory badge.

