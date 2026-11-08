"""
Unit tests for Two-Track Memory Retrieval.
"""
import uuid
from sqlalchemy.orm import Session

from app.database.models import LifecycleStatus, MemoryCategory, MemoryCell, User
from app.memory_engine.embeddings import get_embedding
from app.memory_engine.retriever import retrieve_relevant_memories


def test_two_track_retrieval_preferences_and_semantic(test_db: Session):
    user_id = uuid.uuid4()

    user = User(id=user_id, auth_subject="test_retriever_user")
    test_db.add(user)

    # 1. Formatting preference (Track A)
    pref_content = "User prefers concise bullet-point explanations"
    pref_cell = MemoryCell(
        id=uuid.uuid4(),
        user_id=user_id,
        canonical_content=pref_content,
        category=MemoryCategory.PREFERENCE,
        lifecycle_status=LifecycleStatus.ACTIVE,
        embedding=get_embedding(pref_content)
    )
    test_db.add(pref_cell)

    # 2. Domain Goal (Track B)
    goal_content = "User is studying graph algorithms like Dijkstra and Bellman-Ford"
    goal_cell = MemoryCell(
        id=uuid.uuid4(),
        user_id=user_id,
        canonical_content=goal_content,
        category=MemoryCategory.GOAL,
        lifecycle_status=LifecycleStatus.ACTIVE,
        embedding=get_embedding(goal_content)
    )
    test_db.add(goal_cell)
    test_db.commit()

    query = "Can you explain Dijkstra's algorithm?"
    query_emb = get_embedding(query)

    retrieved = retrieve_relevant_memories(
        db=test_db,
        user_id=user_id,
        query_text=query,
        query_embedding=query_emb,
        top_k=5
    )

    contents = [m.canonical_content for m in retrieved]

    # Verify Track A guaranteed admission: The formatting preference must be admitted!
    assert pref_content in contents, "Preference from Track A must be admitted regardless of query topic!"

    # Verify Track B semantic admission: The graph algorithms memory should also be recalled
    assert goal_content in contents, "Graph algorithms memory from Track B must be recalled for Dijkstra query!"
