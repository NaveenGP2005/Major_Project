"""
API Router for Session Management.
"""
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession

from app.api.schemas import CreateSessionRequest, SessionResponse
from app.database.models import Session, User
from app.database.session import get_db

router = APIRouter(prefix="/api/v1/sessions", tags=["sessions"])


@router.post("", response_model=SessionResponse)
def create_session(
    payload: CreateSessionRequest,
    db: DBSession = Depends(get_db)
):
    """Create a new conversational session for a user."""
    user_stmt = select(User).where(User.id == payload.user_id)
    user_res = db.execute(user_stmt)
    user = user_res.scalar_one_or_none()
    if not user:
        user = User(
            id=payload.user_id,
            auth_subject=f"demo_user_{str(payload.user_id)[:8]}",
            display_name="Demo User"
        )
        db.add(user)
        db.flush()

    new_session = Session(
        id=uuid.uuid4(),
        user_id=payload.user_id,
        title=payload.title or "New Conversation",
        session_type=payload.session_type or "chat"
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    return SessionResponse(
        id=new_session.id,
        user_id=new_session.user_id,
        title=new_session.title,
        session_type=new_session.session_type,
        created_at=new_session.created_at
    )


@router.get("", response_model=List[SessionResponse])
def list_sessions(
    user_id: uuid.UUID = Query(...),
    db: DBSession = Depends(get_db)
):
    """List all sessions belonging to a user."""
    stmt = select(Session).where(Session.user_id == user_id).order_by(Session.created_at.desc())
    result = db.execute(stmt)
    sessions = result.scalars().all()

    return [
        SessionResponse(
            id=s.id,
            user_id=s.user_id,
            title=s.title,
            session_type=s.session_type,
            created_at=s.created_at
        )
        for s in sessions
    ]


@router.get("/{session_id}/turns")
def get_session_turns(
    session_id: uuid.UUID,
    db: DBSession = Depends(get_db)
):
    """Retrieve all turns for a given session."""
    from app.database.models import ConversationTurn
    stmt = (
        select(ConversationTurn)
        .where(ConversationTurn.session_id == session_id)
        .order_by(ConversationTurn.turn_index.asc())
    )
    result = db.execute(stmt)
    turns = result.scalars().all()

    return [
        {
            "id": str(t.id),
            "turn_index": t.turn_index,
            "speaker_type": t.speaker_type.value if hasattr(t.speaker_type, "value") else str(t.speaker_type),
            "raw_transcript": t.raw_transcript,
            "metadata": t.metadata_ or {},
            "timestamp": t.timestamp.isoformat() if t.timestamp else None
        }
        for t in turns
    ]

