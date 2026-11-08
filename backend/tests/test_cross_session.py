"""
End-to-End Cross-Session Evaluation Test with debug prints.
"""
import uuid
from fastapi.testclient import TestClient


def test_cross_session_memory_retrieval_and_personalization(client: TestClient):
    print("\n--- STEP 1: Creating Session 1 ---", flush=True)
    user_id = str(uuid.uuid4())

    sess1_resp = client.post("/api/v1/sessions", json={
        "user_id": user_id,
        "title": "Session 1: Initial Context"
    })
    print("Session 1 response status:", sess1_resp.status_code, flush=True)
    assert sess1_resp.status_code == 200
    session_1_id = sess1_resp.json()["id"]

    print("--- STEP 2: Sending Chat in Session 1 ---", flush=True)
    chat1_resp = client.post("/api/v1/chat", json={
        "session_id": session_1_id,
        "message": "I am currently prepping for the GATE exam and honestly I really prefer concise bullet-point explanations."
    })
    print("Chat 1 response status:", chat1_resp.status_code, flush=True)
    assert chat1_resp.status_code == 200
    chat1_data = chat1_resp.json()

    extracted = chat1_data["newly_extracted_memories"]
    print("Extracted memories count:", len(extracted), flush=True)
    assert len(extracted) >= 1
    extracted_contents = [e["canonical_content"] for e in extracted]
    assert any("bullet" in c.lower() or "concise" in c.lower() for c in extracted_contents)

    print("--- STEP 3: Inspecting Memories ---", flush=True)
    mem_list_resp = client.get(f"/api/v1/memories?user_id={user_id}")
    assert mem_list_resp.status_code == 200
    memories = mem_list_resp.json()
    assert len(memories) >= 1

    pref_mem = next(m for m in memories if "bullet" in m["canonical_content"].lower() or "concise" in m["canonical_content"].lower())
    assert len(pref_mem["evidence_links"]) >= 1

    print("--- STEP 4: Creating Session 2 ---", flush=True)
    sess2_resp = client.post("/api/v1/sessions", json={
        "user_id": user_id,
        "title": "Session 2: Technical Inquiry"
    })
    assert sess2_resp.status_code == 200
    session_2_id = sess2_resp.json()["id"]

    print("--- STEP 5: Sending Chat in Session 2 ---", flush=True)
    chat2_resp = client.post("/api/v1/chat", json={
        "session_id": session_2_id,
        "message": "Can you explain Dijkstra's algorithm?"
    })
    print("Chat 2 response status:", chat2_resp.status_code, flush=True)
    assert chat2_resp.status_code == 200
    chat2_data = chat2_resp.json()

    cited_ids = [c["id"] for c in chat2_data["cited_memories"]]
    assert pref_mem["id"] in cited_ids

    response_text = chat2_data["assistant_response"]
    assert "-" in response_text or "*" in response_text

    print("--- STEP 6: Deleting Memory ---", flush=True)
    del_resp = client.delete(f"/api/v1/memories/{pref_mem['id']}")
    assert del_resp.status_code == 200

    mem_after_del = client.get(f"/api/v1/memories?user_id={user_id}")
    remaining_ids = [m["id"] for m in mem_after_del.json()]
    assert pref_mem["id"] not in remaining_ids
    print("--- TEST COMPLETE! ---", flush=True)
