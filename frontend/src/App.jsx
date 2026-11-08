import React, { useState, useEffect, useCallback } from "react";
import TopNav from "./components/TopNav";
import ChatPanel from "./components/ChatPanel";
import MemoryInspector from "./components/MemoryInspector";
import AuthModal from "./components/AuthModal";
import {
  fetchSessions,
  createSession,
  fetchSessionTurns,
  sendChatMessage,
  fetchMemories,
  deleteMemory,
  clearAllMemories,
  getStoredAuth,
  clearStoredAuth,
  demoLogin,
  DEFAULT_USER_ID,
} from "./api";

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const auth = getStoredAuth();
    return auth ? auth.user : null;
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [turns, setTurns] = useState([]);
  const [memories, setMemories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [highlightedMemoryId, setHighlightedMemoryId] = useState(null);

  // Load Memories for the active user
  const refreshMemories = useCallback(async (userId) => {
    if (!userId) return;
    try {
      const data = await fetchMemories(userId);
      setMemories(data);
    } catch (err) {
      console.warn("Could not fetch memories:", err);
    }
  }, []);

  // Load Sessions & initial Turns for a user
  const loadUserData = useCallback(async (user) => {
    if (!user || !user.id) return;
    setIsSyncing(true);
    try {
      const sessionList = await fetchSessions(user.id);
      setSessions(sessionList);

      if (sessionList.length > 0) {
        const firstId = sessionList[0].id;
        setActiveSessionId(firstId);
        const turnData = await fetchSessionTurns(firstId);
        setTurns(turnData);
      } else {
        // Auto create initial Session 1 for this user
        const newSess = await createSession(user.id, "Session 1: Getting Started");
        setSessions([newSess]);
        setActiveSessionId(newSess.id);
        setTurns([]);
      }

      await refreshMemories(user.id);
    } catch (err) {
      console.error("Error loading user data:", err);
    } finally {
      setIsSyncing(false);
    }
  }, [refreshMemories]);

  // Initial mount: load user or auto-login with demo account
  useEffect(() => {
    async function initAuth() {
      let activeUser = currentUser;
      if (!activeUser) {
        try {
          // One-click evaluation preset default
          const res = await demoLogin();
          activeUser = res.user;
          setCurrentUser(activeUser);
        } catch (e) {
          console.warn("Demo auto-login failed, opening auth modal:", e);
          setIsAuthModalOpen(true);
          return;
        }
      }
      await loadUserData(activeUser);
    }
    initAuth();
  }, [loadUserData]);

  // Switch Active Session
  const handleSelectSession = async (sessionId) => {
    setActiveSessionId(sessionId);
    try {
      const turnData = await fetchSessionTurns(sessionId);
      setTurns(turnData);
    } catch (err) {
      console.error("Failed to load session turns:", err);
      setTurns([]);
    }
  };

  // Create New Session
  const handleCreateSession = async () => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    const nextNum = sessions.length + 1;
    const title = nextNum === 2 ? "Session 2: Technical Deep-Dive" : `Session ${nextNum}: Follow-up`;
    try {
      const newSess = await createSession(currentUser.id, title);
      setSessions((prev) => [newSess, ...prev]);
      setActiveSessionId(newSess.id);
      setTurns([]);
    } catch (err) {
      console.error("Failed to create session:", err);
    }
  };

  // Send Chat Message
  const handleSendMessage = async (text) => {
    if (!activeSessionId) return;

    // Optimistically add User Turn
    const optimisticUserTurn = {
      id: "optimistic-" + Date.now(),
      speaker_type: "OWNER",
      raw_transcript: text,
      timestamp: new Date().toISOString(),
      metadata: {},
    };
    setTurns((prev) => [...prev, optimisticUserTurn]);
    setIsLoading(true);

    try {
      const resp = await sendChatMessage(activeSessionId, text);

      // Add Assistant Turn
      const assistantTurn = {
        id: resp.turn_id || "resp-" + Date.now(),
        speaker_type: "AGENT",
        raw_transcript: resp.assistant_response,
        timestamp: new Date().toISOString(),
        metadata: {
          cited_memories: resp.cited_memories || [],
          newly_extracted: resp.newly_extracted_memories || [],
        },
      };

      setTurns((prev) => [...prev, assistantTurn]);

      // Refresh memory inspector to reflect newly extracted / reinforced memories
      if (currentUser) {
        await refreshMemories(currentUser.id);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      const errorTurn = {
        id: "err-" + Date.now(),
        speaker_type: "AGENT",
        raw_transcript:
          "Error contacting memory engine backend. Please check that the backend server is running on port 8000.",
        timestamp: new Date().toISOString(),
        metadata: {},
      };
      setTurns((prev) => [...prev, errorTurn]);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete Individual Memory
  const handleDeleteMemory = async (memoryId) => {
    try {
      await deleteMemory(memoryId);
      setMemories((prev) => prev.filter((m) => m.id !== memoryId));
    } catch (err) {
      console.error("Failed to delete memory:", err);
    }
  };

  // Reset / Clear All Memories for current user
  const handleClearMemories = async () => {
    if (!currentUser) return;
    const confirmName = currentUser.display_name || "the current user";
    if (
      !window.confirm(
        `Are you sure you want to clear all active memories for ${confirmName}? This will reset long-term memory for demonstration purposes.`
      )
    ) {
      return;
    }
    try {
      await clearAllMemories(currentUser.id);
      setMemories([]);
    } catch (err) {
      console.error("Failed to clear memories:", err);
    }
  };

  // Highlight Memory from Citation Click
  const handleHighlightMemory = (memoryId) => {
    setHighlightedMemoryId(memoryId);
    const element = document.getElementById(`memory-${memoryId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    setTimeout(() => {
      setHighlightedMemoryId(null);
    }, 3000);
  };

  // Handle successful Auth (Login / Register / Demo)
  const handleAuthSuccess = async (user) => {
    setCurrentUser(user);
    setIsAuthModalOpen(false);
    setTurns([]);
    setSessions([]);
    await loadUserData(user);
  };

  // Handle Logout
  const handleLogout = () => {
    clearStoredAuth();
    setCurrentUser(null);
    setSessions([]);
    setTurns([]);
    setMemories([]);
    setIsAuthModalOpen(true);
  };

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col font-body-md antialiased selection:bg-primary-container selection:text-on-primary-container relative overflow-x-hidden">
      {/* Ambient Obsidian & Aurora Lighting Blooms */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[650px] h-[650px] rounded-full bg-primary-container/10 blur-[130px]"></div>
        <div className="absolute top-1/4 -right-40 w-[550px] h-[550px] rounded-full bg-tertiary/10 blur-[120px]"></div>
        <div className="absolute -bottom-40 left-1/3 w-[700px] h-[700px] rounded-full bg-secondary-container/10 blur-[140px]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.12),rgba(255,255,255,0))]"></div>
      </div>

      {/* 1. TOP NAVIGATION BAR */}
      <TopNav
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onCreateSession={handleCreateSession}
        memoryCount={memories.length}
        onClearMemories={handleClearMemories}
        isSyncing={isSyncing}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* 2. MAIN SPLIT-SCREEN WORKSPACE */}
      <main className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 max-w-[1920px] w-full mx-auto h-[calc(100vh-4.25rem)] overflow-hidden">
        {/* Left: Chat & Voice Interface */}
        <ChatPanel
          turns={turns}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          activeSessionTitle={activeSession?.title}
          onHighlightMemory={handleHighlightMemory}
        />

        {/* Right: Living Memory & Provenance Inspector */}
        <MemoryInspector
          memories={memories}
          onDeleteMemory={handleDeleteMemory}
          highlightedMemoryId={highlightedMemoryId}
        />
      </main>

      {/* 3. AUTHENTICATION & MULTI-TENANT MODAL */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={currentUser ? () => setIsAuthModalOpen(false) : null}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}
