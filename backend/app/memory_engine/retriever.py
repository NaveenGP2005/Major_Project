"""
Two-Track Memory Retriever.
Solves the naive RAG failure mode by combining:
- Track A (Persistent Preferences & Constraints): Always admits active preferences/constraints for the user.
- Track B (Semantic Associative Recall): Top-k cosine similarity matches against the user query.
"""
import uuid
from typing import Dict, List
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database.models import LifecycleStatus, MemoryCategory, MemoryCell
from app.memory_engine.embeddings import compute_cosine_similarity
from app.memory_engine.schemas import RetrievedMemoryItem


def retrieve_relevant_memories(
    db: Session,
    user_id: uuid.UUID,
    query_text: str,
    query_embedding: List[float],
    top_k: int = 5,
    similarity_threshold: float = 0.30
) -> List[RetrievedMemoryItem]:
    """
    Two-track memory retrieval:
    1. Track A: Fetches all ACTIVE/STABLE memories under PREFERENCE or constraint.
    2. Track B: Computes cosine similarity over all other ACTIVE/STABLE memories and takes top-k.
    3. Merges Track A and Track B, avoiding duplicates.
    """
    stmt = (
        select(MemoryCell)
        .options(selectinload(MemoryCell.evidence_links))
        .where(
            MemoryCell.user_id == user_id,
            MemoryCell.lifecycle_status.in_([LifecycleStatus.ACTIVE, LifecycleStatus.STABLE])
        )
    )
    result = db.execute(stmt)
    all_active_memories = result.scalars().all()

    if not all_active_memories:
        return []

    track_a_items: Dict[uuid.UUID, RetrievedMemoryItem] = {}
    track_b_candidates: List[tuple[float, MemoryCell]] = []

    preference_categories = {MemoryCategory.PREFERENCE, "PREFERENCE", "preference", "constraint"}

    for mem in all_active_memories:
        cat_str = mem.category.value if hasattr(mem.category, "value") else str(mem.category)

        # Track A: Always include preferences/constraints
        if mem.category in preference_categories or cat_str.upper() == "PREFERENCE":
            latest_span = mem.evidence_links[-1].exact_source_span if mem.evidence_links else ""
            track_a_items[mem.id] = RetrievedMemoryItem(
                id=mem.id,
                canonical_content=mem.canonical_content,
                category=cat_str,
                similarity_score=1.0,
                evidence_span=latest_span,
                observed_at=mem.observed_at.isoformat() if mem.observed_at else "",
                is_preference_or_constraint=True
            )
            continue

        # Track B: Compute cosine similarity for non-preference memories
        if mem.embedding and query_embedding:
            sim = compute_cosine_similarity(mem.embedding, query_embedding)
            if sim >= similarity_threshold:
                track_b_candidates.append((sim, mem))

    track_b_candidates.sort(key=lambda x: x[0], reverse=True)
    selected_track_b = track_b_candidates[:top_k]

    merged_results: List[RetrievedMemoryItem] = list(track_a_items.values())

    for sim, mem in selected_track_b:
        if mem.id not in track_a_items:
            cat_str = mem.category.value if hasattr(mem.category, "value") else str(mem.category)
            latest_span = mem.evidence_links[-1].exact_source_span if mem.evidence_links else ""
            merged_results.append(RetrievedMemoryItem(
                id=mem.id,
                canonical_content=mem.canonical_content,
                category=cat_str,
                similarity_score=float(sim),
                evidence_span=latest_span,
                observed_at=mem.observed_at.isoformat() if mem.observed_at else "",
                is_preference_or_constraint=False
            ))

    return merged_results
