"""
API Router for User Authentication (Registration, Login, Demo Account).
"""
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession

from app.database.models import User, Session as SessionModel
from app.database.session import get_db
from app.services.auth_service import (
    hash_password, verify_password, create_access_token, decode_access_token
)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

DEFAULT_DEMO_USER_ID = uuid.UUID("80d21b9d-3dcf-4ae2-be46-fc5149b0d7ac")


# ── Schemas ──

class RegisterRequest(BaseModel):
    display_name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5, max_length=255, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(..., min_length=6, max_length=128)


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=1)


class UserProfileResponse(BaseModel):
    id: uuid.UUID
    display_name: str
    email: Optional[str]
    memory_enabled: bool


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfileResponse


# ── Dependency for Protected Routes ──

def get_current_user(
    authorization: Optional[str] = Header(None),
    db: DBSession = Depends(get_db)
) -> User:
    """Validate JWT token and return active User."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authentication token"
        )
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Expired or invalid token"
        )
    
    user_id_str = payload["sub"]
    try:
        user_uuid = uuid.UUID(user_id_str)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")

    user = db.query(User).filter(User.id == user_uuid).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


# ── Endpoints ──

@router.post("/register", response_model=AuthResponse)
def register_user(
    payload: RegisterRequest,
    db: DBSession = Depends(get_db)
):
    """Register a new user account with isolated conversational memory."""
    # Check if email is already taken
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists"
        )

    new_user_id = uuid.uuid4()
    hashed = hash_password(payload.password)

    user = User(
        id=new_user_id,
        auth_subject=f"auth_{str(new_user_id)[:8]}",
        display_name=payload.display_name.strip(),
        email=payload.email.lower(),
        hashed_password=hashed,
        memory_enabled=True
    )
    db.add(user)

    # Create initial Session 1 for the new user
    initial_session = SessionModel(
        id=uuid.uuid4(),
        user_id=new_user_id,
        title="Session 1: Getting Started",
        session_type="chat"
    )
    db.add(initial_session)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id), "email": user.email, "name": user.display_name})

    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=UserProfileResponse(
            id=user.id,
            display_name=user.display_name or "User",
            email=user.email,
            memory_enabled=user.memory_enabled
        )
    )


@router.post("/login", response_model=AuthResponse)
def login_user(
    payload: LoginRequest,
    db: DBSession = Depends(get_db)
):
    """Authenticate with email and password."""
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    token = create_access_token({"sub": str(user.id), "email": user.email, "name": user.display_name})

    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=UserProfileResponse(
            id=user.id,
            display_name=user.display_name or "User",
            email=user.email,
            memory_enabled=user.memory_enabled
        )
    )


@router.post("/demo-login", response_model=AuthResponse)
def demo_login(
    db: DBSession = Depends(get_db)
):
    """Instant one-click demo login for academic evaluation (Alex M.)."""
    user = db.query(User).filter(User.id == DEFAULT_DEMO_USER_ID).first()
    if not user:
        user = User(
            id=DEFAULT_DEMO_USER_ID,
            auth_subject="demo_user_80d21b9d",
            display_name="Alex M.",
            email="alex.m@gate-aspirant.org",
            memory_enabled=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Ensure display name matches demo persona
        if user.display_name != "Alex M." or not user.email:
            user.display_name = "Alex M."
            user.email = user.email or "alex.m@gate-aspirant.org"
            db.commit()
            db.refresh(user)

    token = create_access_token({"sub": str(user.id), "email": user.email, "name": user.display_name})

    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=UserProfileResponse(
            id=user.id,
            display_name=user.display_name or "Alex M.",
            email=user.email,
            memory_enabled=user.memory_enabled
        )
    )


@router.get("/me", response_model=UserProfileResponse)
def get_my_profile(
    current_user: User = Depends(get_current_user)
):
    """Retrieve profile of the currently logged-in user."""
    return UserProfileResponse(
        id=current_user.id,
        display_name=current_user.display_name or "User",
        email=current_user.email,
        memory_enabled=current_user.memory_enabled
    )
