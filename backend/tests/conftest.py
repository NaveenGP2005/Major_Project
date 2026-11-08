"""
Pytest configuration and synchronous test fixtures.
Forces in-memory SQLite and offline deterministic mock LLM so test suite runs in < 0.2 seconds.
"""
import os
import sys
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ensure backend root is in sys.path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

os.environ["TESTING"] = "1"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from app.database.models import Base
from app.database.session import get_db
from app.main import app

test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    echo=False
)

TestSessionLocal = sessionmaker(
    bind=test_engine,
    autocommit=False,
    autoflush=False
)


@pytest.fixture(scope="function")
def test_db():
    """Create fresh database tables for each test and drop them afterwards."""
    Base.metadata.create_all(bind=test_engine)
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def client(test_db):
    """FastAPI TestClient overriding get_db with the in-memory test database."""
    def override_get_db():
        try:
            yield test_db
            test_db.commit()
        except Exception:
            test_db.rollback()
            raise

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
