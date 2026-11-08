"""
Unit tests for Deduplication & Evidence Linking.
"""
import uuid
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database.models import MemoryCategory, MemoryCell, User
from app.memory_engine.deduplication import deduplicate_and_store_memory
from app.memory_engine.embeddings import get_embedding
from app.memory_engine.schemas import ExtractedMemoryItem


def test_deduplication_and_evidence_linking(test_db: Session):
    user_id = uuid.uuid4()
    turn_1 = uuid.uuid4()
    turn_2 = uuid.uuid4()

    user = User(id=user_id, auth_subject="test_user_dedup")
    test_db.add(user)
    test_db.flush()

    item_1 = ExtractedMemoryItem(
        canonical_content="User prefers concise bullet-point explanations",
        entity="Response Style",
        category=MemoryCategory.PREFERENCE,
        exact_source_span="I really prefer concise bullet-point explanations",
        confidence=1.0
    )
    emb_1 = get_embedding(item_1.canonical_content)

    cell_1, is_new_1 = deduplicate_and_store_memory(
        db=test_db,
        user_id=user_id,
        turn_id=turn_1,
        item=item_1,
        embedding=emb_1
    )
    test_db.commit()

    assert is_new_1 is True
    assert cell_1.support_count == 1

    item_2 = ExtractedMemoryItem(
        canonical_content="User prefers concise bullet-point explanations",
        entity="Response Style",
        category=MemoryCategory.PREFERENCE,
        exact_source_span="Remember I prefer concise bullet-point explanations",
        confidence=1.0
    )
    emb_2 = get_embedding(item_2.canonical_content)

    cell_2, is_new_2 = deduplicate_and_store_memory(
        db=test_db,
        user_id=user_id,
        turn_id=turn_2,
        item=item_2,
        embedding=emb_2
    )
    test_db.commit()

    assert is_new_2 is False
    assert cell_2.id == cell_1.id
    assert cell_2.support_count == 2

    stmt = (
        select(MemoryCell)
        .options(selectinload(MemoryCell.evidence_links))
        .where(MemoryCell.user_id == user_id)
    )
    res = test_db.execute(stmt)
    all_cells = res.scalars().all()

    assert len(all_cells) == 1
    assert len(all_cells[0].evidence_links) == 2
    spans = [e.exact_source_span for e in all_cells[0].evidence_links]
    assert "I really prefer concise bullet-point explanations" in spans
    assert "Remember I prefer concise bullet-point explanations" in spans
