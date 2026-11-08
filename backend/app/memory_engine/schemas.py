"""
Pydantic schemas for the Memory Engine:
- Stage I LLM extraction
- Deduplication contracts
- Retrieval representations
"""
import uuid
from datetime import datetime
from typing import List, Optional, Any
from pydantic import BaseModel, Field, field_validator

from app.database.models import MemoryCategory, LifecycleStatus, ConfirmationStatus, TrustSource


class ExtractedMemoryItem(BaseModel):
    """Atomic proposition extracted from user dialogue turn."""
    canonical_content: str = Field(
        ...,
        description="Atomic, self-contained factual proposition rewritten in third person (e.g. 'User prefers concise responses'). Avoid unresolved pronouns; prefer 'User'."
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
        ...,
        description="The verbatim substring from the user turn that directly proves this fact."
    )
    temporal_anchor: Optional[str] = Field(
        default=None,
        description="Explicit date/time mentioned (ISO 8601 string or interval), or null if timeless."
    )
    scope: str = Field(
        default="general",
        description="Applicability scope: 'permanent', 'temporary stay', 'academic', 'work', etc."
    )
    confidence: float = Field(
        ge=0.0, le=1.0, default=1.0,
        description="Extractor confidence in factual certainty (1.0 = explicit statement, 0.7 = inferred)."
    )

    @field_validator("category", mode="before")
    @classmethod
    def normalize_category(cls, v: Any) -> Any:
        if isinstance(v, str):
            v_upper = v.upper().strip()
            if v_upper in ["FACT", "PROFILE", "IDENTITY"]:
                return MemoryCategory.PROFILE
            if v_upper in ["PREFERENCE", "CONSTRAINT", "RULE"]:
                return MemoryCategory.PREFERENCE
            if v_upper in ["GOAL", "OBJECTIVE", "PLAN"]:
                return MemoryCategory.GOAL
            if v_upper in ["PROJECT", "TASK"]:
                return MemoryCategory.PROJECT
            if v_upper in ["EVENT", "EXPERIENCE"]:
                return MemoryCategory.EVENT
            return MemoryCategory.OTHER
        return v



class ExtractionResponse(BaseModel):
    """Root container returned by Stage I LLM structured extraction."""
    extracted_memories: List[ExtractedMemoryItem] = Field(
        default_factory=list,
        description="List of extracted durable memories. Empty if the utterance is conversational filler."
    )


class RetrievedMemoryItem(BaseModel):
    """Contract for memories admitted and formatted for the context/assistant."""
    id: uuid.UUID
    canonical_content: str
    category: str
    similarity_score: float
    evidence_span: str
    observed_at: str
    is_preference_or_constraint: bool = False

