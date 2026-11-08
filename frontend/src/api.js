/**
 * API client for interacting with the FastAPI Memory Engine backend.
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1";

// Demo user ID (Alex M.) - matches our verified Neon DB user
export const DEFAULT_USER_ID = "80d21b9d-3dcf-4ae2-be46-fc5149b0d7ac";

export async function fetchSessions(userId = DEFAULT_USER_ID) {
  const res = await fetch(`${API_BASE}/sessions?user_id=${userId}`);
  if (!res.ok) throw new Error("Failed to fetch sessions");
  return await res.json();
}

export async function createSession(userId = DEFAULT_USER_ID, title = "New Conversation") {
  const res = await fetch(`${API_BASE}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, title, session_type: "chat" }),
  });
  if (!res.ok) throw new Error("Failed to create session");
  return await res.json();
}

export async function fetchSessionTurns(sessionId) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/turns`);
  if (!res.ok) throw new Error("Failed to fetch session turns");
  return await res.json();
}

export async function sendChatMessage(sessionId, message) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, message }),
  });
  if (!res.ok) throw new Error("Failed to send message");
  return await res.json();
}

export async function fetchMemories(userId = DEFAULT_USER_ID) {
  const res = await fetch(`${API_BASE}/memories?user_id=${userId}`);
  if (!res.ok) throw new Error("Failed to fetch memories");
  return await res.json();
}

export async function deleteMemory(memoryId) {
  const res = await fetch(`${API_BASE}/memories/${memoryId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete memory");
  return await res.json();
}

export async function clearAllMemories(userId = DEFAULT_USER_ID) {
  const res = await fetch(`${API_BASE}/memories?user_id=${userId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to clear memories");
  return await res.json();
}

