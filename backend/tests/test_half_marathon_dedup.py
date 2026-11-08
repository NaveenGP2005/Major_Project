import os
import sys
import uuid
import asyncio

backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.database.session import SessionLocal
from app.database.models import User, Session as DBSession, ConversationTurn, SpeakerType, MemoryCell
from app.memory_engine.schemas import ExtractedMemoryItem, MemoryCategory
from app.memory_engine.embeddings import get_embedding
from app.memory_engine.deduplication import deduplicate_and_store_memory_async

async def test_live_dedup():
    db = SessionLocal()
    test_user_id = uuid.uuid4()
    test_sess_id = uuid.uuid4()
    
    try:
        user = User(id=test_user_id, auth_subject=f"test_{str(test_user_id)[:8]}", display_name="Test Runner")
        sess = DBSession(id=test_sess_id, user_id=test_user_id, title="Running Test")
        turn_1 = ConversationTurn(id=uuid.uuid4(), session_id=test_sess_id, turn_index=1, speaker_type=SpeakerType.OWNER, raw_transcript="training for my first half marathon this winter")
        turn_2 = ConversationTurn(id=uuid.uuid4(), session_id=test_sess_id, turn_index=2, speaker_type=SpeakerType.OWNER, raw_transcript="Running 21 kilometers in the cold this December is going to be brutal!")
        db.add_all([user, sess, turn_1, turn_2])
        db.commit()

        # Step 1: Initial marathon statement
        item_1 = ExtractedMemoryItem(
            canonical_content="User is training for their first half marathon this winter",
            entity="Half Marathon",
            category=MemoryCategory.GOAL,
            exact_source_span="training for my first half marathon this winter",
            confidence=1.0
        )
        cell_1, is_new_1 = await deduplicate_and_store_memory_async(
            db=db,
            user_id=test_user_id,
            turn_id=turn_1.id,
            item=item_1,
            embedding=get_embedding(item_1.canonical_content)
        )
        db.commit()
        print(f"Step 1: Cell ID={cell_1.id}, is_new={is_new_1}, support={cell_1.support_count}, evidence count={len(cell_1.evidence_links)}")
        assert is_new_1 is True
        assert cell_1.support_count == 1

        # Step 2: Paraphrased statement using distance and month
        item_2 = ExtractedMemoryItem(
            canonical_content="User plans to run 21 kilometers in December despite cold conditions",
            entity="Half Marathon",
            category=MemoryCategory.GOAL,
            exact_source_span="Running 21 kilometers in the cold this December",
            confidence=1.0
        )
        cell_2, is_new_2 = await deduplicate_and_store_memory_async(
            db=db,
            user_id=test_user_id,
            turn_id=turn_2.id,
            item=item_2,
            embedding=get_embedding(item_2.canonical_content)
        )
        db.commit()
        db.refresh(cell_1)
        print(f"Step 2: Cell ID={cell_2.id}, is_new={is_new_2}, support={cell_2.support_count}, evidence count={len(cell_1.evidence_links)}")
        for idx, ev in enumerate(cell_1.evidence_links, 1):
            print(f"  - Evidence #{idx}: \"{ev.exact_source_span}\"")

        assert is_new_2 is False, "Step 2 should NOT create a new cell!"
        assert cell_2.id == cell_1.id, "Step 2 must match Cell 1!"
        assert cell_2.support_count == 2, f"Expected support_count=2, got {cell_2.support_count}"
        assert len(cell_1.evidence_links) == 2, f"Expected 2 evidence links, got {len(cell_1.evidence_links)}"
        print("--> [VERIFIED] Stage II Semantic Association successfully reinforced existing card with Evidence #2!")

    finally:
        db.query(ConversationTurn).filter(ConversationTurn.session_id == test_sess_id).delete()
        db.query(MemoryCell).filter(MemoryCell.user_id == test_user_id).delete()
        db.query(DBSession).filter(DBSession.user_id == test_user_id).delete()
        db.query(User).filter(User.id == test_user_id).delete()
        db.commit()
        db.close()

if __name__ == "__main__":
    asyncio.run(test_live_dedup())

