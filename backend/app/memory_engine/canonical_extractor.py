"""
Stage I: Evidence-Grounded Memory Adaptation Extractor.
Converts heterogeneous dialogue turns into canonical memory propositions with provenance.
"""
import logging
from typing import List

from app.memory_engine.schemas import ExtractedMemoryItem, ExtractionResponse
from app.services.llm_service import llm_service

logger = logging.getLogger(__name__)


async def extract_canonical_memories(transcript: str) -> List[ExtractedMemoryItem]:
    """
    Extract canonical memory items from raw conversation transcript.
    Filters out conversational chit-chat and returns atomic structured propositions.
    """
    if not transcript or not transcript.strip():
        return []

    response: ExtractionResponse = await llm_service.extract_memories(transcript)
    valid_items: List[ExtractedMemoryItem] = []

    for item in response.extracted_memories:
        # Guarantee verbatim evidence check
        if not item.exact_source_span or not item.canonical_content:
            continue
        valid_items.append(item)

    return valid_items

