"""
API Router for Memory Inspection and Live Demo Reset.
"""
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession, selectinload

from app.api.schemas import MemoryCellDetail, MemoryEvidenceDetail
from app.database.models import MemoryCell
from app.database.session import get_db

router = APIRouter(prefix="/api/v1/memories", tags=["memories"])


@router.get("", response_model=List[MemoryCellDetail])
def list_memories(
    user_id: uuid.UUID = Query(...),
    db: DBSession = Depends(get_db)
):
    """
    Fetch all memory cells for a user with their nested evidence provenance links.
    Powers the Right-Side Live Memory & Provenance Inspector.
    """
    stmt = (
        select(MemoryCell)
        .options(selectinload(MemoryCell.evidence_links))
        .where(MemoryCell.user_id == user_id)
        .order_by(MemoryCell.created_at.desc())
    )
    result = db.execute(stmt)
    memories = result.scalars().all()

    details: List[MemoryCellDetail] = []
    for m in memories:
        cat_str = m.category.value if hasattr(m.category, "value") else str(m.category)
        status_str = m.lifecycle_status.value if hasattr(m.lifecycle_status, "value") else str(m.lifecycle_status)

        ev_details = [
            MemoryEvidenceDetail(
                id=e.id,
                turn_id=e.turn_id,
                exact_source_span=e.exact_source_span,
                evidence_type=e.evidence_type,
                extracted_at=e.extracted_at
            )
            for e in m.evidence_links
        ]

        details.append(
            MemoryCellDetail(
                id=m.id,
                canonical_content=m.canonical_content,
                entity=m.entity,
                category=cat_str,
                scope=m.scope,
                confidence_score=m.confidence_score,
                validity_score=m.validity_score,
                support_count=m.support_count,
                lifecycle_status=status_str,
                observed_at=m.observed_at,
                evidence_links=ev_details
            )
        )

    return details


@router.delete("")
def clear_all_memories(
    user_id: uuid.UUID = Query(...),
    db: DBSession = Depends(get_db)
):
    """Clear all memory cells for a given user (live reset)."""
    from sqlalchemy import delete
    stmt = delete(MemoryCell).where(MemoryCell.user_id == user_id)
    result = db.execute(stmt)
    db.commit()
    return {"status": "success", "deleted_count": result.rowcount}


@router.delete("/{memory_id}")
def delete_memory(
    memory_id: uuid.UUID,
    db: DBSession = Depends(get_db)
):
    """Delete a memory cell and its cascaded evidence links (for live demo reset)."""
    stmt = select(MemoryCell).where(MemoryCell.id == memory_id)
    res = db.execute(stmt)
    memory = res.scalar_one_or_none()
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")

    db.delete(memory)
    db.commit()
    return {"status": "success", "deleted_id": str(memory_id)}


