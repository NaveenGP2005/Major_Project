"""
SQLAlchemy ORM models for the Memory Engine.
Designed to run on local SQLite ($0) out-of-the-box and seamlessly scale to PostgreSQL + pgvector (384-dim).
"""
import enum
import json
import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    Boolean, Column, DateTime, Enum, Float, ForeignKey,
    Integer, String, Text, TypeDecorator, func
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

# ── Dialect-Agnostic Types ────────────────────────────────────────────────────

class GUID(TypeDecorator):
    """Platform-independent GUID type.
    Uses CHAR(36) to store stringified UUIDs cleanly on SQLite and PostgreSQL.
    """
    impl = String(36)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, uuid.UUID):
            return value
        return uuid.UUID(str(value))


class Vector384(TypeDecorator):
    """Platform-independent 384-dimensional vector type.
    Stores as JSON string on SQLite and vector(384) on PostgreSQL when pgvector is active.
    """
    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, str):
            return value
        return json.dumps(list(value))

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, str):
            try:
                return json.loads(value)
            except Exception:
                return []
        return list(value)


class JSONType(TypeDecorator):
    """Platform-independent JSON type that stores as Text on SQLite and JSON on PostgreSQL."""
    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return "{}"
        if isinstance(value, str):
            return value
        return json.dumps(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return {}
        if isinstance(value, str):
            try:
                return json.loads(value)
            except Exception:
                return {}
        return value


# ── Base ──────────────────────────────────────────────────────────────────────

class Base(DeclarativeBase):
    pass


# ── Enumerations ──────────────────────────────────────────────────────────────

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


# ── Models ────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
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

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), default="New Conversation")
    session_type: Mapped[str] = mapped_column(String(50), default="chat")
    language: Mapped[str] = mapped_column(String(10), default="en")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="sessions")
    turns: Mapped[List["ConversationTurn"]] = relationship(
        "ConversationTurn",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="ConversationTurn.turn_index"
    )


class ConversationTurn(Base):
    __tablename__ = "conversation_turns"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(GUID, ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    turn_index: Mapped[int] = mapped_column(Integer, nullable=False)
    speaker_type: Mapped[SpeakerType] = mapped_column(Enum(SpeakerType, native_enum=False), default=SpeakerType.OWNER, nullable=False)
    raw_transcript: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_: Mapped[dict] = mapped_column("metadata", JSONType, default=dict)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    session: Mapped["Session"] = relationship("Session", back_populates="turns")
    evidence_links: Mapped[List["MemoryEvidenceLink"]] = relationship("MemoryEvidenceLink", back_populates="turn")


class MemoryCell(Base):
    """
    Canonical memory cell.
    Stage I output & Stage II governed unit: m_i = (c_i, E_i, a_i, rho_i, s_i)
    """
    __tablename__ = "memory_cells"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    canonical_content: Mapped[str] = mapped_column(Text, nullable=False)
    entity: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    category: Mapped[MemoryCategory] = mapped_column(
        Enum(MemoryCategory, native_enum=False),
        default=MemoryCategory.OTHER,
        nullable=False,
        index=True
    )
    scope: Mapped[str] = mapped_column(String(100), default="general")
    confidence_score: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    validity_score: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    support_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    lifecycle_status: Mapped[LifecycleStatus] = mapped_column(
        Enum(LifecycleStatus, native_enum=False),
        default=LifecycleStatus.ACTIVE,
        nullable=False,
        index=True
    )
    confirmation_status: Mapped[ConfirmationStatus] = mapped_column(
        Enum(ConfirmationStatus, native_enum=False),
        default=ConfirmationStatus.NOT_REQUIRED,
        nullable=False
    )
    trust_source: Mapped[TrustSource] = mapped_column(
        Enum(TrustSource, native_enum=False),
        default=TrustSource.OWNER,
        nullable=False
    )
    event_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    # 384-dimensional embedding for all-MiniLM-L6-v2 ($0 local embedding)
    embedding: Mapped[Optional[List[float]]] = mapped_column(Vector384, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship("User", back_populates="memory_cells")
    evidence_links: Mapped[List["MemoryEvidenceLink"]] = relationship(
        "MemoryEvidenceLink",
        back_populates="memory_cell",
        cascade="all, delete-orphan"
    )


class MemoryEvidenceLink(Base):
    """
    Evidence provenance link mapping a canonical memory cell to its source dialogue turn
    and exact verbatim substring.
    """
    __tablename__ = "memory_evidence_links"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    memory_id: Mapped[uuid.UUID] = mapped_column(GUID, ForeignKey("memory_cells.id", ondelete="CASCADE"), nullable=False, index=True)
    turn_id: Mapped[Optional[uuid.UUID]] = mapped_column(GUID, ForeignKey("conversation_turns.id", ondelete="SET NULL"), nullable=True, index=True)
    exact_source_span: Mapped[str] = mapped_column(Text, nullable=False)
    evidence_type: Mapped[str] = mapped_column(String(50), default="direct_statement")
    extracted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    memory_cell: Mapped["MemoryCell"] = relationship("MemoryCell", back_populates="evidence_links")
    turn: Mapped[Optional["ConversationTurn"]] = relationship("ConversationTurn", back_populates="evidence_links")
