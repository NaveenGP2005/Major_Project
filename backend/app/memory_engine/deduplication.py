"""
Deduplication and Canonical Memory Linking.
Implements:
1. Normalized exact key matching.
2. High cosine similarity matching (>= 0.90).
3. Linking new evidence to existing memories vs inserting new cells.
"""
import re
import uuid
from datetime import datetime
from typing import Optional, Tuple
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.models import (
    ConfirmationStatus, LifecycleStatus, MemoryCategory,
    MemoryCell, MemoryEvidenceLink, TrustSource
)
from app.memory_engine.embeddings import compute_cosine_similarity
from app.memory_engine.schemas import ExtractedMemoryItem


def normalize_text_key(text: str) -> str:
    """Lowercase, strip non-alphanumeric, and collapse whitespace."""
    if not text:
        return ""
    clean = re.sub(r'[^\w\s]', '', text.lower())
    return " ".join(clean.split())


def deduplicate_and_store_memory(
    db: Session,
    user_id: uuid.UUID,
    turn_id: Optional[uuid.UUID],
    item: ExtractedMemoryItem,
    embedding: list[float],
    similarity_threshold: float = 0.82
) -> Tuple[MemoryCell, bool]:
    """
    Check for duplicates among user's active/stable memories.
    If match found:
        Increments support_count and attaches a new MemoryEvidenceLink.
    If no match:
        Creates a new canonical MemoryCell and initial MemoryEvidenceLink.
    Returns:
        (MemoryCell, is_new: bool)
    """
    candidate_key = normalize_text_key(item.canonical_content)

    stmt = select(MemoryCell).where(
        MemoryCell.user_id == user_id,
        MemoryCell.lifecycle_status.in_([LifecycleStatus.ACTIVE, LifecycleStatus.STABLE])
    )
    result = db.execute(stmt)
    existing_memories = result.scalars().all()

    matched_memory: Optional[MemoryCell] = None

    for mem in existing_memories:
        # Check 1: Normalized exact text match
        if normalize_text_key(mem.canonical_content) == candidate_key:
            matched_memory = mem
            break

        # Check 2: High vector cosine similarity match
        if mem.embedding and embedding:
            sim = compute_cosine_similarity(mem.embedding, embedding)
            if sim >= similarity_threshold:
                matched_memory = mem
                break

    if matched_memory is not None:
        matched_memory.support_count += 1
        matched_memory.updated_at = datetime.utcnow()

        evidence = MemoryEvidenceLink(
            memory_id=matched_memory.id,
            turn_id=turn_id,
            exact_source_span=item.exact_source_span,
            evidence_type="direct_statement",
            extracted_at=datetime.utcnow()
        )
        db.add(evidence)
        db.flush()
        return matched_memory, False

    new_memory = MemoryCell(
        id=uuid.uuid4(),
        user_id=user_id,
        canonical_content=item.canonical_content,
        entity=item.entity,
        category=item.category,
        scope=item.scope,
        confidence_score=item.confidence,
        validity_score=1.0,
        support_count=1,
        lifecycle_status=LifecycleStatus.ACTIVE,
        confirmation_status=ConfirmationStatus.NOT_REQUIRED,
        trust_source=TrustSource.OWNER,
        embedding=embedding,
        observed_at=datetime.utcnow(),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(new_memory)
    db.flush()

    initial_evidence = MemoryEvidenceLink(
        id=uuid.uuid4(),
        memory_id=new_memory.id,
        turn_id=turn_id,
        exact_source_span=item.exact_source_span,
        evidence_type="direct_statement",
        extracted_at=datetime.utcnow()
    )
    db.add(initial_evidence)
    db.flush()

    return new_memory, True


async def deduplicate_and_store_memory_async(
    db: Session,
    user_id: uuid.UUID,
    turn_id: Optional[uuid.UUID],
    item: ExtractedMemoryItem,
    embedding: list[float],
    similarity_threshold: float = 0.82
) -> Tuple[MemoryCell, bool]:
    """
    Async Stage II Deduplication & Semantic Association.
    Combines:
    1. Normalized exact key matching.
    2. Embedding vector cosine similarity (>= 0.82).
    3. LLM semantic reconciliation (e.g. 21 km is a half marathon, December is winter).
    """
    from app.services.llm_service import llm_service

    candidate_key = normalize_text_key(item.canonical_content)

    stmt = select(MemoryCell).where(
        MemoryCell.user_id == user_id,
        MemoryCell.lifecycle_status.in_([LifecycleStatus.ACTIVE, LifecycleStatus.STABLE])
    )
    result = db.execute(stmt)
    existing_memories = result.scalars().all()

    matched_memory: Optional[MemoryCell] = None

    for mem in existing_memories:
        # Check 1: Normalized exact text match
        if normalize_text_key(mem.canonical_content) == candidate_key:
            matched_memory = mem
            break

        # Check 2: High vector cosine similarity match
        if mem.embedding and embedding:
            sim = compute_cosine_similarity(mem.embedding, embedding)
            if sim >= similarity_threshold:
                matched_memory = mem
                break

    # Check 3: LLM Semantic Association / World Knowledge Reconciliation
    if matched_memory is None and existing_memories:
        existing_dicts = [
            {"id": str(m.id), "canonical_content": m.canonical_content, "category": str(m.category)}
            for m in existing_memories
        ]
        cat_str = item.category.value if hasattr(item.category, "value") else str(item.category)
        matched_id_str = await llm_service.reconcile_memory(
            candidate_content=item.canonical_content,
            candidate_category=cat_str,
            existing_memories=existing_dicts
        )
        if matched_id_str:
            matched_memory = next((m for m in existing_memories if str(m.id) == matched_id_str), None)

    if matched_memory is not None:
        matched_memory.support_count += 1
        matched_memory.updated_at = datetime.utcnow()

        evidence = MemoryEvidenceLink(
            memory_id=matched_memory.id,
            turn_id=turn_id,
            exact_source_span=item.exact_source_span,
            evidence_type="direct_statement",
            extracted_at=datetime.utcnow()
        )
        db.add(evidence)
        db.flush()
        return matched_memory, False

    new_memory = MemoryCell(
        id=uuid.uuid4(),
        user_id=user_id,
        canonical_content=item.canonical_content,
        entity=item.entity,
        category=item.category,
        scope=item.scope,
        confidence_score=item.confidence,
        validity_score=1.0,
        support_count=1,
        lifecycle_status=LifecycleStatus.ACTIVE,
        confirmation_status=ConfirmationStatus.NOT_REQUIRED,
        trust_source=TrustSource.OWNER,
        embedding=embedding,
        observed_at=datetime.utcnow(),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(new_memory)
    db.flush()

    initial_evidence = MemoryEvidenceLink(
        id=uuid.uuid4(),
        memory_id=new_memory.id,
        turn_id=turn_id,
        exact_source_span=item.exact_source_span,
        evidence_type="direct_statement",
        extracted_at=datetime.utcnow()
    )
    db.add(initial_evidence)
    db.flush()

    return new_memory, True

