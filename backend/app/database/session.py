"""
Database session and connection management.
Seamlessly connects to Neon.tech PostgreSQL (with pgvector) or local SQLite.
"""
import logging
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings
from app.database.models import Base

logger = logging.getLogger(__name__)

effective_url = settings.get_effective_db_url()

connect_args = {}
if "sqlite" in effective_url:
    connect_args["check_same_thread"] = False
elif "neon.tech" in effective_url:
    # Use direct IP address to ensure reliability across campus Wi-Fi networks
    connect_args["hostaddr"] = "34.194.137.112"

engine = create_engine(
    effective_url,
    echo=False,
    connect_args=connect_args,
)

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)


def init_db() -> None:
    """Initialize database tables safely."""
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        logger.warning(f"Database initialization warning: {e}")


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency for obtaining a database session."""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
