import os
import sys
import asyncio
import json

backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.services.llm_service import llm_service


async def test_reconcile():
    existing = [
        {"id": "goal-1", "canonical_content": "User is training for their first half marathon this winter", "category": "GOAL"}
    ]
    candidate = "User plans to run 21 kilometers in December despite cold conditions"
    
    prompt = f"""You are an advanced conversational memory deduplication & reconciliation engine.
Given the user's existing active memories and a new candidate fact:

Existing Memories:
{json.dumps(existing, indent=2)}

New Candidate Fact:
"{candidate}"

Determine if this new candidate fact refers to the same underlying topic/goal/preference/profile as an existing memory (e.g. 21 km is a half marathon, December is winter).
Return JSON:
{{
  "is_duplicate_or_reinforcement": true or false,
  "matched_memory_id": "goal-1" or null,
  "confidence": 0.95,
  "reason": "short explanation"
}}
"""
    from app.config import settings
    model = settings.LLM_MODEL or settings.GROQ_MODEL
    res = await llm_service.groq_client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"}
    )

    print("Groq Reconciliation Result:\n", res.choices[0].message.content)

if __name__ == "__main__":
    asyncio.run(test_reconcile())
