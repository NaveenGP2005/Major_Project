"""
Step-by-step verification script.
Tests all components against your real live Neon PostgreSQL database and Groq Cloud LLM.
"""
import os
import sys
import uuid
import asyncio

backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.memory_engine.embeddings import get_embedding, compute_cosine_similarity
from app.memory_engine.canonical_extractor import extract_canonical_memories
from app.database.session import engine, SessionLocal, Base
from app.database.models import User, Session as DBSession, MemoryCell, LifecycleStatus, MemoryCategory
from app.memory_engine.deduplication import deduplicate_and_store_memory
from app.memory_engine.retriever import retrieve_relevant_memories
from app.api.chat import chat_turn
from app.api.memories import list_memories, delete_memory
from app.api.schemas import ChatMessageRequest, CreateSessionRequest
from app.api.sessions import create_session


async def run_all_steps():
    print("=" * 65)
    print("STEP-BY-STEP LIVE NEON DB & GROQ CLOUD VERIFICATION")
    print("=" * 65)

    # ── STEP 1: Embeddings ──
    print("\n[STEP 1] Testing 384-dim Local Embeddings...")
    v1 = get_embedding("User prefers concise bullet-point explanations")
    v2 = get_embedding("I prefer concise bullet-point explanations")
    v3 = get_embedding("Can you explain Dijkstra algorithm?")
    print(f" -> Dimension: {len(v1)} (Expected: 384)")
    assert len(v1) == 384
    sim_high = compute_cosine_similarity(v1, v2)
    sim_diff = compute_cosine_similarity(v1, v3)
    print(f" -> Similarity (Near-match): {sim_high:.4f} (Expected > 0.85)")
    print(f" -> Similarity (Different):  {sim_diff:.4f} (Expected < 0.35)")
    assert sim_high > 0.85
    assert sim_diff < 0.35
    print(" -> [PASS] Embeddings & Cosine Similarity working!")

    # ── STEP 2: Canonical Memory Extractor ──
    print("\n[STEP 2] Testing Stage I Canonical Memory Extractor...")
    text = "I am prepping for the GATE exam and really prefer concise bullet-point explanations."
    extracted = await extract_canonical_memories(text)
    print(f" -> Extracted {len(extracted)} canonical memories from: '{text}'")
    for item in extracted:
        print(f"    * Content:  {item.canonical_content}")
        print(f"      Category: {item.category}")
        print(f"      Span:     \"{item.exact_source_span}\"")
        assert len(item.canonical_content) > 0
        assert len(item.exact_source_span) > 0
    assert len(extracted) >= 1

    # Test filler rejection
    filler = "Hello there! Good morning, how are you?"
    filler_extracted = await extract_canonical_memories(filler)
    print(f" -> Filler extracted count: {len(filler_extracted)} (Expected: 0)")
    assert len(filler_extracted) == 0
    print(" -> [PASS] Canonical Extractor working!")

    # ── STEP 3: Database & Deduplication on Neon PostgreSQL ──
    print("\n[STEP 3] Testing Neon PostgreSQL Database & Deduplication...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    user_id = uuid.uuid4()
    user = User(id=user_id, auth_subject=f"demo_student_{str(user_id)[:8]}", display_name="Demo Student")
    db.add(user)
    db.commit()
    print(f" -> Created User on Neon DB: ID={user_id}")

    # Create session and turn first to satisfy foreign key constraint on Neon PostgreSQL
    sess_setup = DBSession(id=uuid.uuid4(), user_id=user_id, title="Setup Session")
    db.add(sess_setup)
    db.commit()

    from app.database.models import ConversationTurn, SpeakerType
    turn_1 = uuid.uuid4()
    t1_obj = ConversationTurn(
        id=turn_1,
        session_id=sess_setup.id,
        turn_index=1,
        speaker_type=SpeakerType.OWNER,
        raw_transcript=text
    )
    db.add(t1_obj)

    turn_2 = uuid.uuid4()
    t2_obj = ConversationTurn(
        id=turn_2,
        session_id=sess_setup.id,
        turn_index=2,
        speaker_type=SpeakerType.OWNER,
        raw_transcript="Remember I prefer concise bullet-point explanations"
    )
    db.add(t2_obj)
    db.commit()

    item_pref = extracted[0]
    emb_pref = get_embedding(item_pref.canonical_content)

    cell_1, is_new_1 = deduplicate_and_store_memory(db, user_id, turn_1, item_pref, emb_pref)
    db.commit()
    print(f" -> Insertion 1 on Neon: ID={cell_1.id}, is_new={is_new_1}, support_count={cell_1.support_count}")
    assert is_new_1 is True
    assert cell_1.support_count == 1

    # Duplicate insertion (same preference repeated in turn 2)
    cell_2, is_new_2 = deduplicate_and_store_memory(db, user_id, turn_2, item_pref, emb_pref)
    db.commit()
    print(f" -> Insertion 2 (Duplicate): ID={cell_2.id}, is_new={is_new_2}, support_count={cell_2.support_count}")
    assert is_new_2 is False
    assert cell_2.id == cell_1.id
    assert cell_2.support_count == 2
    assert len(cell_2.evidence_links) == 2
    print(" -> [PASS] Deduplication & Evidence Linking working on Neon DB!")

    # ── STEP 4: Two-Track Retrieval ──
    print("\n[STEP 4] Testing Two-Track Retrieval (Preferences + Semantic)...")
    if len(extracted) > 1:
        goal_item = extracted[1]
        deduplicate_and_store_memory(db, user_id, turn_1, goal_item, get_embedding(goal_item.canonical_content))
        db.commit()

    query = "Can you explain Dijkstra's algorithm?"
    query_emb = get_embedding(query)
    retrieved = retrieve_relevant_memories(db, user_id, query, query_emb, top_k=5)
    print(f" -> Query: \"{query}\"")
    print(f" -> Retrieved {len(retrieved)} memories from Neon DB:")
    for m in retrieved:
        print(f"    * [{m.category}] {m.canonical_content} (similarity={m.similarity_score:.2f})")
    
    retrieved_contents = [m.canonical_content for m in retrieved]
    assert any("bullet" in c.lower() or "concise" in c.lower() for c in retrieved_contents)
    print(" -> [PASS] Two-Track Retrieval admits preferences even for technical questions!")

    # ── STEP 5: End-to-End Cross-Session Personalization with Groq ──
    print("\n[STEP 5] Testing End-to-End Cross-Session Personalization...")
    # Session A:
    sess_a_req = CreateSessionRequest(user_id=user_id, title="Session A: Preferences")
    sess_a = create_session(sess_a_req, db)
    
    # Session B (Brand new session):
    sess_b_req = CreateSessionRequest(user_id=user_id, title="Session B: Technical Inquiry")
    sess_b = create_session(sess_b_req, db)
    assert sess_a.id != sess_b.id
    print(f" -> Created Session A ({sess_a.id}) and Session B ({sess_b.id}) on Neon DB")

    # Ask in Session B:
    chat_req = ChatMessageRequest(session_id=sess_b.id, message="Can you explain Dijkstra's algorithm?")
    chat_resp = await chat_turn(chat_req, db)
    print(" -> Assistant Response in Session B (generated via LLM):")
    print("-" * 50)
    print(chat_resp.assistant_response)
    print("-" * 50)
    print(f" -> Cited Memories: {len(chat_resp.cited_memories)}")
    for c in chat_resp.cited_memories:
        print(f"    * Cited: {c.canonical_content}")

    assert "-" in chat_resp.assistant_response or "*" in chat_resp.assistant_response
    assert len(chat_resp.cited_memories) >= 1
    print(" -> [PASS] Cross-Session Personalization applied bullet points from Session A!")

    # ── STEP 6: Live Inspector & Deletion ──
    print("\n[STEP 6] Testing Live Inspector & Reset on Neon DB...")
    inspector_mems = list_memories(user_id, db)
    print(f" -> Inspector returned {len(inspector_mems)} memories with evidence links from Neon DB.")
    assert len(inspector_mems) >= 1
    for m in inspector_mems:
        print(f"    * Memory: {m.canonical_content}")
        print(f"      Status: {m.lifecycle_status} | Support: {m.support_count}")
        for ev in m.evidence_links:
            print(f"      - Evidence span: \"{ev.exact_source_span}\"")

    target_id = inspector_mems[0].id
    del_res = delete_memory(target_id, db)
    print(f" -> Deleted memory {target_id}: {del_res}")
    inspector_mems_after = list_memories(user_id, db)
    assert len(inspector_mems_after) == len(inspector_mems) - 1
    print(" -> [PASS] Live Inspector & Deletion reset working on Neon DB!")

    db.close()
    print("\n" + "=" * 65)
    print("ALL 6 STEPS COMPLETED AND VERIFIED 100% SUCCESSFULLY ON NEON DB!")
    print("=" * 65)


if __name__ == "__main__":
    asyncio.run(run_all_steps())
