import React, { useState, useEffect, useCallback } from "react";
import TopNav from "./components/TopNav";
import ChatPanel from "./components/ChatPanel";
import MemoryInspector from "./components/MemoryInspector";
import EvidenceModal from "./components/EvidenceModal";
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
} from "./api";

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const auth = getStoredAuth();
    return auth ? auth.user : null;
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Luminous Light Mode by default for a serene, uncluttered look
  const [isDarkMode, setIsDarkMode] = useState(false);

  // On-demand drawers and modals (Touch-to-reveal)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeEvidenceMemory, setActiveEvidenceMemory] = useState(null);

  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [turns, setTurns] = useState([]);
  const [memories, setMemories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedMemoryId, setHighlightedMemoryId] = useState(null);

  // Sync dark class on documentElement
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [isDarkMode]);

  // Load Memories for active user
  const refreshMemories = useCallback(async (userId) => {
    if (!userId) return;
    try {
      const data = await fetchMemories(userId);
      setMemories(data);
    } catch (err) {
      console.warn("Could not fetch memories:", err);
    }
  }, []);

  // Load Sessions & Turns for user
  const loadUserData = useCallback(
    async (user) => {
      if (!user || !user.id) return;
      try {
        const sessionList = await fetchSessions(user.id);
        setSessions(sessionList);

        if (sessionList.length > 0) {
          const firstId = sessionList[0].id;
          setActiveSessionId(firstId);
          const turnData = await fetchSessionTurns(firstId);
          setTurns(turnData);
        } else {
          const newSess = await createSession(user.id, "Session 1: Introduction & Goals");
          setSessions([newSess]);
          setActiveSessionId(newSess.id);
          setTurns([]);
        }

        await refreshMemories(user.id);
      } catch (err) {
        console.error("Error loading user data:", err);
      }
    },
    [refreshMemories]
  );

  // Initial mount: load user or auto-login with demo account
  useEffect(() => {
    async function initAuth() {
      let activeUser = currentUser;
      if (!activeUser) {
        try {
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
    const title =
      nextNum === 2 ? "Session 2: Technical Deep-Dive" : `Session ${nextNum}: Follow-up`;
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

  // Reset / Clear All Memories
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

  // Handle touch on a recalled memory citation pill in chat
  const handleSelectEvidenceMemory = (citation) => {
    // Find the full memory cell if available in our memories list
    const found = memories.find((m) => m.id === citation.id);
    setActiveEvidenceMemory(found || citation);
  };

  const handleAuthSuccess = async (user) => {
    setCurrentUser(user);
    setIsAuthModalOpen(false);
    setTurns([]);
    setSessions([]);
    await loadUserData(user);
  };

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
    <div className="bg-[#FAF8F5] dark:bg-surface text-gray-900 dark:text-on-surface min-h-screen flex flex-col font-sans antialiased relative overflow-hidden transition-colors duration-300">
      {/* Ambient Luminous Mist Backdrops */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Soft pastel blooms for light mode */}
        <div className="absolute -top-32 -left-20 w-[30rem] h-[30rem] bg-purple-200/50 dark:bg-primary-container/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/4 -right-32 w-[32rem] h-[32rem] bg-indigo-100/60 dark:bg-tertiary/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 left-1/3 w-[36rem] h-[36rem] bg-pink-100/40 dark:bg-secondary-container/10 rounded-full blur-3xl"></div>
      </div>

      {/* 1. TOP BAR */}
      <TopNav
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onCreateSession={handleCreateSession}
        memoryCount={memories.length}
        onClearMemories={handleClearMemories}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)}
        isDrawerOpen={isDrawerOpen}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
      />

      {/* 2. MAIN CENTERED CHAT VIEW */}
      <main className="relative z-10 flex-1 flex h-[calc(100vh-4.25rem)] overflow-hidden">
        <ChatPanel
          turns={turns}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          activeSessionTitle={activeSession?.title}
          onSelectEvidenceMemory={handleSelectEvidenceMemory}
        />
      </main>

      {/* 3. TOUCH-TO-REVEAL EVIDENCE MODAL */}
      <EvidenceModal
        memory={activeEvidenceMemory}
        isOpen={!!activeEvidenceMemory}
        onClose={() => setActiveEvidenceMemory(null)}
        onDelete={handleDeleteMemory}
        onOpenDrawer={() => {
          setActiveEvidenceMemory(null);
          setIsDrawerOpen(true);
        }}
      />

      {/* 4. COLLAPSIBLE LIVING MEMORY DRAWER (Slides in on demand) */}
      <MemoryInspector
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        memories={memories}
        onDeleteMemory={handleDeleteMemory}
        highlightedMemoryId={highlightedMemoryId}
      />

      {/* 5. MULTI-TENANT AUTH MODAL */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={currentUser ? () => setIsAuthModalOpen(false) : null}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}
