/**
 * API client for interacting with the FastAPI Memory Engine backend.
 * Supports User Authentication (JWT) and Multi-Tenant Conversational Isolation.
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1";

// Default fallback demo user ID (Alex M.) - matches our verified Neon DB user
export const DEFAULT_USER_ID = "80d21b9d-3dcf-4ae2-be46-fc5149b0d7ac";

// ── Auth Storage Helpers ──

export function getStoredAuth() {
  try {
    const token = localStorage.getItem("echo_auth_token");
    const userStr = localStorage.getItem("echo_auth_user");
    if (token && userStr) {
      return { token, user: JSON.parse(userStr) };
    }
  } catch (e) {
    console.error("Failed to read auth from localStorage", e);
  }
  return null;
}

export function setStoredAuth(token, user) {
  try {
    localStorage.setItem("echo_auth_token", token);
    localStorage.setItem("echo_auth_user", JSON.stringify(user));
  } catch (e) {
    console.error("Failed to save auth to localStorage", e);
  }
}

export function clearStoredAuth() {
  try {
    localStorage.removeItem("echo_auth_token");
    localStorage.removeItem("echo_auth_user");
  } catch (e) {
    console.error("Failed to clear auth from localStorage", e);
  }
}

function getAuthHeaders() {
  const auth = getStoredAuth();
  const headers = { "Content-Type": "application/json" };
  if (auth && auth.token) {
    headers["Authorization"] = `Bearer ${auth.token}`;
  }
  return headers;
}

// ── Authentication Endpoints ──

export async function loginUser(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Invalid email or password");
  }
  const data = await res.json();
  setStoredAuth(data.access_token, data.user);
  return data;
}

export async function registerUser(displayName, email, password) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ display_name: displayName, email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Registration failed");
  }
  const data = await res.json();
  setStoredAuth(data.access_token, data.user);
  return data;
}

export async function demoLogin() {
  const res = await fetch(`${API_BASE}/auth/demo-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Demo login failed");
  }
  const data = await res.json();
  setStoredAuth(data.access_token, data.user);
  return data;
}

export async function fetchUserProfile() {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch user profile");
  return await res.json();
}

// ── Session & Chat Endpoints ──

export async function fetchSessions(userId = DEFAULT_USER_ID) {
  const res = await fetch(`${API_BASE}/sessions?user_id=${userId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch sessions");
  return await res.json();
}

export async function createSession(userId = DEFAULT_USER_ID, title = "New Conversation") {
  const res = await fetch(`${API_BASE}/sessions`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ user_id: userId, title, session_type: "chat" }),
  });
  if (!res.ok) throw new Error("Failed to create session");
  return await res.json();
}

export async function fetchSessionTurns(sessionId) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/turns`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch session turns");
  return await res.json();
}

export async function sendChatMessage(sessionId, message) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ session_id: sessionId, message }),
  });
  if (!res.ok) throw new Error("Failed to send message");
  return await res.json();
}

// ── Memory Inspection & Provenance Endpoints ──

export async function fetchMemories(userId = DEFAULT_USER_ID) {
  const res = await fetch(`${API_BASE}/memories?user_id=${userId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch memories");
  return await res.json();
}

export async function deleteMemory(memoryId) {
  const res = await fetch(`${API_BASE}/memories/${memoryId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete memory");
  return await res.json();
}

export async function clearAllMemories(userId = DEFAULT_USER_ID) {
  const res = await fetch(`${API_BASE}/memories?user_id=${userId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to clear memories");
  return await res.json();
}
