"""
Prompt Injection Engine.
Formats admitted cross-session memories with provenance metadata into the Assistant's system instructions.
"""
from typing import List
from app.memory_engine.schemas import RetrievedMemoryItem


def construct_agent_system_prompt(memories: List[RetrievedMemoryItem]) -> str:
    """
    Format recalled canonical memories into the Assistant's system prompt.
    """
    base_instructions = """You are a helpful, context-aware AI assistant equipped with an adaptive long-term memory engine.
Your task is to hold natural, intelligent conversations and continuously personalize your responses based on verified user history."""

    if not memories:
        return base_instructions

    memory_lines = []
    for m in memories:
        badge = "[PREFERENCE]" if m.is_preference_or_constraint else f"[{m.category}]"
        memory_lines.append(f"- {badge} {m.canonical_content} (Memory ID: {m.id})")

    memory_block = "\n".join(memory_lines)

    return f"""{base_instructions}

LONG-TERM USER CONTEXT & PERSISTENT MEMORIES (Admitted from Previous Sessions):
{memory_block}

USAGE GUIDELINES:
1. Seamlessly adapt your answers to user preferences and goals (e.g. formatting as bullet points if preferred).
2. Do NOT robotically recite "According to your memory..." unless specifically asked.
3. Keep spoken and text responses natural, concise, and focused.
"""

