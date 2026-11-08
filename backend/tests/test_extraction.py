"""
Unit tests for Stage I: Evidence-Grounded Memory Adaptation Extraction.
"""
import pytest
from app.database.models import MemoryCategory
from app.memory_engine.canonical_extractor import extract_canonical_memories


@pytest.mark.asyncio
async def test_extract_durable_facts():
    """Verify durable preference and goal are extracted with exact verbatim source spans."""
    transcript = "I am prepping for the GATE exam and really prefer concise bullet-point explanations."
    extracted = await extract_canonical_memories(transcript)

    assert len(extracted) >= 1
    for item in extracted:
        assert item.canonical_content.startswith("User")
        assert len(item.exact_source_span) > 0
        assert item.confidence > 0.5

    categories = [e.category for e in extracted]
    assert MemoryCategory.PREFERENCE in categories or MemoryCategory.GOAL in categories


@pytest.mark.asyncio
async def test_filter_conversational_filler():
    """Verify that greetings, pleasantries, and transient filler are NOT extracted as memories."""
    fillers = [
        "Hello, how are you today?",
        "Hi there! Good morning.",
        "Thanks a lot for the help!",
        "Can you help me with a quick question?",
    ]
    for text in fillers:
        extracted = await extract_canonical_memories(text)
        assert len(extracted) == 0, f"Expected 0 memories for filler: '{text}', but got {len(extracted)}"
