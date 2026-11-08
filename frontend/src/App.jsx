import React, { useState, useEffect, useCallback } from "react";
import TopNav from "./components/TopNav";
import ChatPanel from "./components/ChatPanel";
import MemoryInspector from "./components/MemoryInspector";
import {
  fetchSessions,
  createSession,
  fetchSessionTurns,
  sendChatMessage,
  fetchMemories,
  deleteMemory,
  clearAllMemories,
  DEFAULT_USER_ID,
} from "./api";

export default function App() {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [turns, setTurns] = useState([]);
  const [memories, setMemories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [highlightedMemoryId, setHighlightedMemoryId] = useState(null);

  // Load Sessions & Memories on mount
  const refreshMemories = useCallback(async () => {
    try {
      const data = await fetchMemories(DEFAULT_USER_ID);
      setMemories(data);
    } catch (err) {
      console.warn("Could not fetch memories:", err);
    }
  }, []);

  useEffect(() => {
    async function init() {
      setIsSyncing(true);
      try {
        // Fetch sessions
        const sessionList = await fetchSessions(DEFAULT_USER_ID);
        setSessions(sessionList);

        if (sessionList.length > 0) {
          const firstId = sessionList[0].id;
          setActiveSessionId(firstId);
          const turnData = await fetchSessionTurns(firstId);
          setTurns(turnData);
        } else {
          // Auto create Session 1
          const newSess = await createSession(DEFAULT_USER_ID, "Session 1: Introduction & Goals");
          setSessions([newSess]);
          setActiveSessionId(newSess.id);
          setTurns([]);
        }

        // Fetch memories
        await refreshMemories();
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setIsSyncing(false);
      }
    }

    init();
  }, [refreshMemories]);

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
    const nextNum = sessions.length + 1;
    const title = nextNum === 2 ? "Session 2: Technical Deep-Dive" : `Session ${nextNum}: Follow-up`;
    try {
      const newSess = await createSession(DEFAULT_USER_ID, title);
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
      await refreshMemories();
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
    if (!window.confirm("Are you sure you want to clear all active memories for Alex M.? This will reset long-term memory for demonstration purposes.")) {
      return;
    }
    try {
      await clearAllMemories(DEFAULT_USER_ID);
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
    </div>
  );
}
