"""
API Router for Chat Interaction & Synchronous Memory Pipeline.
"""
import uuid
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session as DBSession

from app.api.schemas import (
    ChatMessageRequest, ChatMessageResponse,
    ExtractedMemoryResponse, MemoryCitation
)
from app.database.models import (
    ConversationTurn, LifecycleStatus, MemoryCategory,
    Session, SpeakerType
)
from app.database.session import get_db
from app.memory_engine.canonical_extractor import extract_canonical_memories
from app.memory_engine.deduplication import deduplicate_and_store_memory, deduplicate_and_store_memory_async
from app.memory_engine.embeddings import get_embedding
from app.memory_engine.prompt_injector import construct_agent_system_prompt
from app.memory_engine.retriever import retrieve_relevant_memories
from app.services.llm_service import llm_service

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])


@router.post("", response_model=ChatMessageResponse)
async def chat_turn(
    payload: ChatMessageRequest,
    db: DBSession = Depends(get_db)
):
    """
    Ingest a user message turn:
    1. Verify session.
    2. Retrieve cross-session memories for this user (Track A + Track B).
    3. Generate personalized response.
    4. Run Stage I canonical memory extraction on the user turn.
    5. Deduplicate and link/insert memories with provenance.
    6. Return response with cited and newly extracted memories.
    """
    session_stmt = select(Session).where(Session.id == payload.session_id)
    session_res = db.execute(session_stmt)
    session_obj = session_res.scalar_one_or_none()
    if not session_obj:
        raise HTTPException(status_code=404, detail="Session not found")

    user_id = session_obj.user_id

    # Get current turn index
    count_stmt = select(func.count(ConversationTurn.id)).where(ConversationTurn.session_id == payload.session_id)
    turn_count_res = db.execute(count_stmt)
    turn_index = turn_count_res.scalar_one() or 0

    # 1. Record User Turn
    user_turn_id = uuid.uuid4()
    user_turn = ConversationTurn(
        id=user_turn_id,
        session_id=payload.session_id,
        turn_index=turn_index,
        speaker_type=SpeakerType.OWNER,
        raw_transcript=payload.message,
        metadata_={},
        timestamp=datetime.utcnow()
    )
    db.add(user_turn)
    db.flush()

    # 2. Retrieve cross-session memories (Two-Track: preferences + semantic)
    query_emb = get_embedding(payload.message)
    recalled_memories = retrieve_relevant_memories(
        db=db,
        user_id=user_id,
        query_text=payload.message,
        query_embedding=query_emb,
        top_k=5,
        similarity_threshold=0.30
    )

    # 3. Construct System Prompt & Call LLM
    system_prompt = construct_agent_system_prompt(recalled_memories)

    past_turns_stmt = (
        select(ConversationTurn)
        .where(ConversationTurn.session_id == payload.session_id)
        .order_by(ConversationTurn.turn_index.asc())
    )
    past_turns_res = db.execute(past_turns_stmt)
    past_turns = past_turns_res.scalars().all()

    messages = [{"role": "system", "content": system_prompt}]
    for t in past_turns:
        role = "user" if t.speaker_type == SpeakerType.OWNER else "assistant"
        messages.append({"role": role, "content": t.raw_transcript})

    assistant_text = await llm_service.generate_response(messages, recalled_memories)

    # 4. Record Assistant Turn
    agent_turn = ConversationTurn(
        id=uuid.uuid4(),
        session_id=payload.session_id,
        turn_index=turn_index + 1,
        speaker_type=SpeakerType.AGENT,
        raw_transcript=assistant_text,
        metadata_={},
        timestamp=datetime.utcnow()
    )
    db.add(agent_turn)
    db.flush()

    # 5. Stage I: Canonical Memory Extraction & Deduplication
    extracted_items = await extract_canonical_memories(payload.message)
    newly_extracted_responses: List[ExtractedMemoryResponse] = []

    for item in extracted_items:
        item_emb = get_embedding(item.canonical_content)
        stored_cell, is_new = await deduplicate_and_store_memory_async(
            db=db,
            user_id=user_id,
            turn_id=user_turn.id,
            item=item,
            embedding=item_emb,
            similarity_threshold=0.82
        )
        cat_str = stored_cell.category.value if hasattr(stored_cell.category, "value") else str(stored_cell.category)
        status_str = stored_cell.lifecycle_status.value if hasattr(stored_cell.lifecycle_status, "value") else str(stored_cell.lifecycle_status)

        newly_extracted_responses.append(
            ExtractedMemoryResponse(
                id=stored_cell.id,
                canonical_content=stored_cell.canonical_content,
                entity=stored_cell.entity,
                category=cat_str,
                source_span=item.exact_source_span,
                confidence=stored_cell.confidence_score,
                lifecycle_status=status_str,
                is_new=is_new
            )
        )

    db.commit()

    citations = [
        MemoryCitation(
            id=m.id,
            canonical_content=m.canonical_content,
            category=m.category,
            similarity_score=m.similarity_score,
            is_preference=m.is_preference_or_constraint
        )
        for m in recalled_memories
    ]

    return ChatMessageResponse(
        assistant_response=assistant_text,
        session_id=payload.session_id,
        turn_id=user_turn.id,
        cited_memories=citations,
        newly_extracted_memories=newly_extracted_responses
    )
