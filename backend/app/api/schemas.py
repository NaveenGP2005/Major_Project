"""
API request and response schemas for Phase 1 endpoints.
"""
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


# ── Chat Turn Schemas ──

class ChatMessageRequest(BaseModel):
    session_id: uuid.UUID
    message: str = Field(..., min_length=1)


class MemoryCitation(BaseModel):
    id: uuid.UUID
    canonical_content: str
    category: str
    similarity_score: float
    is_preference: bool = False


class ExtractedMemoryResponse(BaseModel):
    id: uuid.UUID
    canonical_content: str
    entity: Optional[str]
    category: str
    source_span: str
    confidence: float
    lifecycle_status: str
    is_new: bool = True


class ChatMessageResponse(BaseModel):
    assistant_response: str
    session_id: uuid.UUID
    turn_id: uuid.UUID
    cited_memories: List[MemoryCitation] = Field(default_factory=list)
    newly_extracted_memories: List[ExtractedMemoryResponse] = Field(default_factory=list)


# ── Memory Inspector Schemas ──

class MemoryEvidenceDetail(BaseModel):
    id: uuid.UUID
    turn_id: Optional[uuid.UUID]
    exact_source_span: str
    evidence_type: str
    extracted_at: datetime


class MemoryCellDetail(BaseModel):
    id: uuid.UUID
    canonical_content: str
    entity: Optional[str]
    category: str
    scope: str
    confidence_score: float
    validity_score: float
    support_count: int
    lifecycle_status: str
    observed_at: datetime
    evidence_links: List[MemoryEvidenceDetail] = Field(default_factory=list)

