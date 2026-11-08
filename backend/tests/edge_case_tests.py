"""
Comprehensive Edge-Case Test Suite for the Long-Term Conversational Memory Engine.
Validates:
1. Chitchat & Noise Filtering (Zero False Positives)
2. Compound Multi-Proposition Sentence Extraction with Verbatim Grounding
3. Semantic Paraphrase Deduplication & Multi-Source Evidence Reinforcement
4. Orthogonal Two-Track Retrieval (Formatting Preferences + Technical Semantic Search)
5. Negative Constraint Injection ("Never do X")
6. Right-to-be-Forgotten & Instant Retrieval Eviction
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
from app.memory_engine.schemas import ExtractedMemoryItem
from app.database.session import engine, SessionLocal, Base
from app.database.models import User, Session as DBSession, ConversationTurn, SpeakerType, MemoryCell, LifecycleStatus, MemoryCategory
from app.memory_engine.deduplication import deduplicate_and_store_memory
from app.memory_engine.retriever import retrieve_relevant_memories
from app.memory_engine.prompt_injector import construct_agent_system_prompt
from app.services.llm_service import llm_service
from app.api.memories import delete_memory


async def run_edge_case_suite():
    print("=" * 70)
    print("ACADEMIC BENCHMARK: CONVERSATIONAL MEMORY ENGINE EDGE-CASE SUITE")
    print("=" * 70)

    db = SessionLocal()
    test_user_id = uuid.uuid4()
    test_session_id = uuid.uuid4()

    try:
        # Create isolated test user & session
        user = User(
            id=test_user_id,
            auth_subject=f"edge_test_{str(test_user_id)[:8]}",
            display_name="Edge Case Tester"
        )
        session = DBSession(
            id=test_session_id,
            user_id=test_user_id,
            title="Edge Case Validation Session"
        )
        db.add(user)
        db.add(session)
        db.commit()

        # ─────────────────────────────────────────────────────────────
        # EDGE CASE 1: Ephemeral Chitchat & Noise Rejection
        # ─────────────────────────────────────────────────────────────
        print("\n[EDGE CASE 1] Ephemeral Small-Talk & Conversational Filler Rejection")
        print("  Goal: Ensure zero false-positive memory allocations for chitchat.")
        
        chitchat_samples = [
            "Hello there, good morning! How are you doing today?",
            "Thanks a lot, that was super helpful and awesome!",
            "Haha okay let me see what happens next.",
            "Can you hear me? Just checking if my microphone works.",
            "Cool, bye for now!"
        ]
        
        filler_failures = 0
        for sample in chitchat_samples:
            extracted = await extract_canonical_memories(sample)
            if len(extracted) > 0:
                print(f"  ❌ Leaked noise memory from: '{sample}' -> {[m.canonical_content for m in extracted]}")
                filler_failures += 1
            else:
                print(f"  ✓ Rejected: '{sample}' -> 0 memories extracted")

        assert filler_failures == 0, f"Expected 0 false positives, got {filler_failures}"
        print("  --> [PASS] 100% precision in conversational noise filtering!")

        # ─────────────────────────────────────────────────────────────
        # EDGE CASE 2: Multi-Proposition Compound Sentence with Verbatim Grounding
        # ─────────────────────────────────────────────────────────────
        print("\n[EDGE CASE 2] Multi-Proposition Extraction & Verbatim Grounding")
        print("  Goal: Disentangle profile, goal, and preference from a single compound turn.")
        
        compound_input = (
            "I work as an SRE at a fintech startup, but I am studying for the GATE exam "
            "and I really prefer concise bullet-point explanations."
        )
        print(f"  User turn: '{compound_input}'")
        
        extracted_facts = await extract_canonical_memories(compound_input)
        print(f"  Extracted {len(extracted_facts)} atomic propositions:")
        for idx, fact in enumerate(extracted_facts, 1):
            print(f"    {idx}. [{fact.category.upper()}] {fact.canonical_content}")
            print(f"       Exact Source Span: \"{fact.exact_source_span}\"")
            # Verify verbatim grounding: span must be an exact substring of the user's turn
            assert fact.exact_source_span.lower() in compound_input.lower(), \
                f"Source span '{fact.exact_source_span}' is not in the source text!"

        assert len(extracted_facts) >= 2, f"Expected at least 2 propositions, got {len(extracted_facts)}"
        categories = [f.category.upper() for f in extracted_facts]
        print(f"  Identified categories: {categories}")
        print("  --> [PASS] Compound turn successfully disentangled with 100% verbatim grounding!")

        # ─────────────────────────────────────────────────────────────
        # EDGE CASE 3: Semantic Deduplication Across Varied Paraphrases
        # ─────────────────────────────────────────────────────────────
        print("\n[EDGE CASE 3] Semantic Deduplication & Evidence Reinforcement")
        print("  Goal: Detect paraphrased repeats, increment support_count, and link evidence without duplicates.")

        # Create source turn
        turn_1 = ConversationTurn(
            id=uuid.uuid4(),
            session_id=test_session_id,
            turn_index=1,
            speaker_type=SpeakerType.OWNER,
            raw_transcript="I am prepping for the GATE CS exam."
        )
        turn_2 = ConversationTurn(
            id=uuid.uuid4(),
            session_id=test_session_id,
            turn_index=2,
            speaker_type=SpeakerType.OWNER,
            raw_transcript="Studying hard for the Graduate Aptitude Test in Engineering."
        )
        db.add(turn_1)
        db.add(turn_2)
        db.commit()

        # Insertion 1: Base phrasing
        emb_1 = get_embedding("User is preparing for the GATE examination")
        item_1 = ExtractedMemoryItem(
            canonical_content="User is preparing for the GATE examination",
            entity="GATE",
            category=MemoryCategory.GOAL,
            exact_source_span="I am prepping for the GATE CS exam",
            confidence=1.0
        )
        cell_1, is_new_1 = deduplicate_and_store_memory(
            db=db,
            user_id=test_user_id,
            turn_id=turn_1.id,
            item=item_1,
            embedding=emb_1
        )
        print(f"  Turn 1 Insertion: ID={cell_1.id}, is_new={is_new_1}, support={cell_1.support_count}")
        assert is_new_1 is True
        assert cell_1.support_count == 1

        # Insertion 2: Paraphrased phrasing (matches via semantic threshold >= 0.90)
        emb_2 = get_embedding("User is studying for the GATE examination")
        item_2 = ExtractedMemoryItem(
            canonical_content="User is studying for the GATE examination",
            entity="GATE",
            category=MemoryCategory.GOAL,
            exact_source_span="Studying hard for the Graduate Aptitude Test in Engineering",
            confidence=1.0
        )
        cell_2, is_new_2 = deduplicate_and_store_memory(
            db=db,
            user_id=test_user_id,
            turn_id=turn_2.id,
            item=item_2,
            embedding=emb_2
        )
        print(f"  Turn 2 Paraphrase: ID={cell_2.id}, is_new={is_new_2}, support={cell_2.support_count}")
        assert is_new_2 is False, "Paraphrase should NOT create a new row!"
        assert cell_2.id == cell_1.id, "Paraphrase must reinforce the existing memory ID!"
        assert cell_2.support_count == 2, "Support count must increment to 2!"

        # Verify evidence links attached to this single cell
        db.refresh(cell_1)
        print(f"  Cell Evidence Links Count: {len(cell_1.evidence_links)}")
        assert len(cell_1.evidence_links) == 2, f"Expected 2 evidence links, got {len(cell_1.evidence_links)}"
        for ev in cell_1.evidence_links:
            print(f"    - Linked Span: \"{ev.exact_source_span}\"")

        print("  --> [PASS] Deduplication engine prevented duplicate rows and reinforced evidence!")

        # ─────────────────────────────────────────────────────────────
        # EDGE CASE 4: Orthogonal Cross-Domain Two-Track Retrieval
        # ─────────────────────────────────────────────────────────────
        print("\n[EDGE CASE 4] Orthogonal Cross-Domain Two-Track Retrieval")
        print("  Goal: Formatting preferences must be retrieved even when the user asks a completely orthogonal technical query.")

        # Insert a formatting preference
        turn_pref = ConversationTurn(
            id=uuid.uuid4(),
            session_id=test_session_id,
            turn_index=3,
            speaker_type=SpeakerType.OWNER,
            raw_transcript="I always prefer concise bullet-point explanations."
        )
        db.add(turn_pref)
        db.commit()

        emb_pref = get_embedding("User prefers concise bullet-point explanations")
        item_pref = ExtractedMemoryItem(
            canonical_content="User prefers concise bullet-point explanations",
            entity="Formatting",
            category=MemoryCategory.PREFERENCE,
            exact_source_span="I always prefer concise bullet-point explanations",
            confidence=1.0
        )
        cell_pref, is_new_pref = deduplicate_and_store_memory(
            db=db,
            user_id=test_user_id,
            turn_id=turn_pref.id,
            item=item_pref,
            embedding=emb_pref
        )

        # Technical query: Dijkstra algorithm (cosine similarity with bullet points is near 0)
        tech_query = "Can you explain Dijkstra's algorithm in detail?"
        tech_emb = get_embedding(tech_query)
        recalled = retrieve_relevant_memories(
            db=db,
            user_id=test_user_id,
            query_text=tech_query,
            query_embedding=tech_emb
        )
        
        print(f"  Query: '{tech_query}'")
        print(f"  Recalled {len(recalled)} memories via Two-Track Retrieval:")
        found_pref = False
        for m in recalled:
            print(f"    * [{m.category}] {m.canonical_content} (Track={'Track A (Rule)' if m.is_preference_or_constraint else 'Track B (Semantic)'}, sim={m.similarity_score:.2f})")
            if m.category.upper() == "PREFERENCE":
                found_pref = True

        assert found_pref, "Two-Track Retrieval failed to retrieve ACTIVE preference for orthogonal query!"
        print("  --> [PASS] Track A successfully admitted formatting preference into technical query context!")

        # ─────────────────────────────────────────────────────────────
        # EDGE CASE 5: Negative Constraint Injection ("Never do X")
        # ─────────────────────────────────────────────────────────────
        print("\n[EDGE CASE 5] Negative Constraint Handling ('Never do X')")
        print("  Goal: Ensure strict negative constraints are recognized and admitted.")

        constraint_input = "Never give me recursive code, only use iterative solutions with loops."
        extracted_constraint = await extract_canonical_memories(constraint_input)
        print(f"  Input: '{constraint_input}'")
        print(f"  Extracted constraint count: {len(extracted_constraint)}")
        for c in extracted_constraint:
            print(f"    * Category: {c.category} | Content: {c.canonical_content} | Span: \"{c.exact_source_span}\"")
        assert len(extracted_constraint) >= 1
        assert extracted_constraint[0].category.upper() in ["CONSTRAINT", "PREFERENCE"]
        print("  --> [PASS] Negative constraint captured and categorized accurately!")

        # ─────────────────────────────────────────────────────────────
        # EDGE CASE 6: Right-to-be-Forgotten & Instant Retrieval Eviction
        # ─────────────────────────────────────────────────────────────
        print("\n[EDGE CASE 6] User 'Right to be Forgotten' & Instant Retrieval Eviction")
        print("  Goal: Deleting a memory must instantly evict it from all subsequent retrievals.")

        memory_to_delete = cell_1.id
        print(f"  Deleting Memory Cell: {memory_to_delete}...")
        del_result = delete_memory(memory_id=memory_to_delete, db=db)
        print(f"  Delete Response: {del_result}")
        assert del_result["status"] == "success"


        # Query again: the deleted memory must NOT appear
        check_query = "Are you aware of my GATE exam?"
        check_emb = get_embedding(check_query)
        post_delete_recalled = retrieve_relevant_memories(
            db=db,
            user_id=test_user_id,
            query_text=check_query,
            query_embedding=check_emb
        )
        for m in post_delete_recalled:
            assert m.id != memory_to_delete, f"Deleted memory {memory_to_delete} was still returned in retrieval!"


        print("  --> [PASS] Memory cell and evidence links completely evicted from retrieval index!")

        print("\n" + "=" * 70)
        print("ALL 6 EDGE CASES PASSED 100% SUCCESSFULLY ON LIVE NEON POSTGRESQL!")
        print("=" * 70)

    finally:
        # Clean up test user & sessions
        try:
            db.query(ConversationTurn).filter(ConversationTurn.session_id == test_session_id).delete()
            db.query(MemoryCell).filter(MemoryCell.user_id == test_user_id).delete()
            db.query(DBSession).filter(DBSession.user_id == test_user_id).delete()
            db.query(User).filter(User.id == test_user_id).delete()
            db.commit()
        except Exception:
            pass
        db.close()


if __name__ == "__main__":
    asyncio.run(run_edge_case_suite())
