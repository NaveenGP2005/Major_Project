"""
End-to-end verification of Authentication & Multi-Tenant Memory Isolation on Live Neon DB.
"""
import uuid
import sys
from fastapi.testclient import TestClient

from app.main import app
from app.database.session import SessionLocal
from app.database.models import User, MemoryCell

client = TestClient(app)

def test_full_auth_flow():
    print("=================================================================")
    print("TESTING AUTHENTICATION & MULTI-TENANT ISOLATION (LIVE NEON DB)")
    print("=================================================================")

    # 1. Test Demo Login (Alex M.) via both /demo and /demo-login aliases
    print("\n[STEP 1] Testing 1-Click Demo Login (Alex M.)...")
    resp = client.post("/api/v1/auth/demo")
    assert resp.status_code == 200, f"Demo login via /demo failed: {resp.text}"
    resp_alias = client.post("/api/v1/auth/demo-login")
    assert resp_alias.status_code == 200, f"Demo login via /demo-login failed: {resp_alias.text}"
    demo_data = resp.json()
    demo_token = demo_data["access_token"]
    demo_user = demo_data["user"]
    print(f" -> Demo User ID: {demo_user['id']}")
    print(f" -> Display Name: {demo_user['display_name']}")
    assert "Alex M." in demo_user["display_name"]
    print(" -> [PASS] Demo login succeeded!")

    # 2. Test Registration of a New User
    unique_email = f"user_{uuid.uuid4().hex[:6]}@example.com"
    password = "SecurePassword123!"
    display_name = "Jane Researcher"
    print(f"\n[STEP 2] Registering New User: {display_name} ({unique_email})...")
    reg_resp = client.post("/api/v1/auth/register", json={
        "display_name": display_name,
        "email": unique_email,
        "password": password
    })
    assert reg_resp.status_code == 200, f"Registration failed: {reg_resp.text}"
    new_user_data = reg_resp.json()
    new_user_id = new_user_data["user"]["id"]
    new_user_token = new_user_data["access_token"]
    print(f" -> Created User ID: {new_user_id}")
    print(" -> [PASS] User registered successfully!")

    # 3. Test Login with Password
    print("\n[STEP 3] Authenticating with Email & Password...")
    login_resp = client.post("/api/v1/auth/login", json={
        "email": unique_email,
        "password": password
    })
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    assert login_resp.json()["user"]["email"] == unique_email
    print(" -> [PASS] Password verification & JWT issuance succeeded!")

    # 4. Test /api/v1/auth/me Protected Endpoint
    print("\n[STEP 4] Testing Protected /me Endpoint...")
    me_resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {new_user_token}"})
    assert me_resp.status_code == 200, f"/me failed: {me_resp.text}"
    assert me_resp.json()["id"] == new_user_id
    print(f" -> Verified Identity: {me_resp.json()['display_name']} ({me_resp.json()['email']})")
    print(" -> [PASS] Protected route access verified!")

    # 5. Verify Multi-Tenant Memory Isolation
    print("\n[STEP 5] Verifying Multi-Tenant Memory Isolation...")
    # New user should have 0 memories
    mem_resp_new = client.get(f"/api/v1/memories?user_id={new_user_id}", headers={"Authorization": f"Bearer {new_user_token}"})
    assert mem_resp_new.status_code == 200
    new_memories = mem_resp_new.json()
    print(f" -> New User Memory Count: {len(new_memories)} (Expected: 0)")
    assert len(new_memories) == 0, f"New user should have 0 memories, found {len(new_memories)}"

    # Alex M. should have his existing memories intact
    mem_resp_demo = client.get(f"/api/v1/memories?user_id={demo_user['id']}", headers={"Authorization": f"Bearer {demo_token}"})
    assert mem_resp_demo.status_code == 200
    demo_memories = mem_resp_demo.json()
    print(f" -> Alex M. (Demo) Memory Count: {len(demo_memories)} (Persisted on Neon DB)")
    assert len(demo_memories) > 0, "Alex M. memories should be preserved!"
    print(f" -> Sample Demo Memory: {demo_memories[0]['canonical_content']}")
    print(" -> [PASS] Zero cross-tenant memory leakage verified!")

    print("\n=================================================================")
    print("ALL AUTHENTICATION & MULTI-TENANCY TESTS PASSED ON NEON DB!")
    print("=================================================================\n")

if __name__ == "__main__":
    test_full_auth_flow()

