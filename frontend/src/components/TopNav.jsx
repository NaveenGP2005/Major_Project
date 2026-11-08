import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  CheckCircle2,
  Plus,
  CloudCheck,
  Settings2,
  Trash2,
  Radio,
  User,
  LogOut,
  UserCheck,
  ChevronDown,
  LogIn,
} from "lucide-react";

export default function TopNav({
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  memoryCount = 0,
  onClearMemories,
  isSyncing = false,
  currentUser = null,
  onOpenAuthModal,
  onLogout,
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="w-full px-6 py-3 flex items-center justify-between sticky top-0 z-40 bg-surface-container-lowest/80 backdrop-blur-md border-b border-outline-variant/20 shadow-sm transition-all">
      {/* Brand Identity with Glowing Living Status Core */}
      <div className="flex items-center gap-4">
        <div className="relative flex items-center justify-center w-9 h-9">
          <div className="absolute inset-0 rounded-full bg-secondary/20 animate-pulse-halo"></div>
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-secondary-container via-primary-container to-tertiary animate-breathe-core flex items-center justify-center shadow-lg shadow-secondary/30">
            <Radio className="w-3.5 h-3.5 text-surface font-bold animate-pulse" />
          </div>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-title-md font-bold text-on-surface tracking-tight">Echo</span>
            <span className="text-label-sm text-outline px-1.5 py-0.5 rounded bg-surface-container border border-outline-variant/30">
              v3.2
            </span>
          </div>
          <span className="text-body-sm text-on-surface-variant flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary inline-block animate-ping"></span>
            Adaptive Voice Agent
          </span>
        </div>

        {/* Memory Core Active Pill */}
        <div className="hidden xl:flex items-center gap-2 ml-3 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/25">
          <span className="w-2 h-2 rounded-full bg-secondary"></span>
          <span className="font-label-sm text-secondary font-medium tracking-wide">
            Memory Core Active • {memoryCount} Grounded Facts
          </span>
        </div>
      </div>

      {/* Center: Fluid Session Switcher Pill Tabs */}
      <nav className="hidden md:flex items-center gap-1 bg-surface-container-low/90 p-1 rounded-full border border-outline-variant/30 max-w-xl overflow-x-auto">
        {sessions.map((sess, idx) => {
          const isActive = sess.id === activeSessionId;
          return (
            <button
              key={sess.id}
              onClick={() => onSelectSession(sess.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full transition-all text-body-sm font-medium whitespace-nowrap ${
                isActive
                  ? "bg-surface-container-high/90 text-primary border-b-2 border-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container/40"
              }`}
            >
              {idx === 0 && <CheckCircle2 className="w-3.5 h-3.5 text-secondary" />}
              {isActive && <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>}
              <span className="truncate max-w-[150px]">{sess.title || `Session ${idx + 1}`}</span>
              {isActive && (
                <span className="px-1.5 py-0.2 bg-primary/20 text-primary-fixed rounded text-label-sm ml-1">
                  Live
                </span>
              )}
            </button>
          );
        })}

        {/* New Session CTA */}
        <button
          onClick={onCreateSession}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-on-surface-variant hover:text-on-surface border border-dashed border-outline-variant/40 hover:border-primary/40 transition-colors text-body-sm whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ New Session</span>
        </button>
      </nav>

      {/* Right Side Actions & Profile Cluster */}
      <div className="flex items-center gap-3">
        {/* Synced to Edge status */}
        <div className="hidden lg:flex items-center gap-1.5 text-label-sm text-tertiary bg-tertiary/10 px-2.5 py-1 rounded-full border border-tertiary/20">
          <CloudCheck className="w-3.5 h-3.5" />
          <span>{isSyncing ? "Syncing Neon..." : "Synced to Edge"}</span>
        </div>

        {/* Audio Routing */}
        <button
          className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/40 transition-all active:scale-95"
          title="Audio Input Routing: Lossless 48kHz"
        >
          <Settings2 className="w-4 h-4" />
        </button>

        {/* Destructive Clear Memories Action */}
        <button
          onClick={onClearMemories}
          className="p-2 rounded-lg text-outline hover:text-error hover:bg-error-container/20 transition-all active:scale-95 group"
          title="Clear Memory Buffer (Reset)"
        >
          <Trash2 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
        </button>

        <div className="h-5 w-px bg-outline-variant/30"></div>

        {/* User Account & Profile Cluster */}
        {currentUser ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 pl-1 py-1 pr-2 rounded-full hover:bg-surface-container-high/50 transition-all cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-full ring-1 ring-primary/40 p-0.5 bg-gradient-to-br from-primary-container to-secondary flex items-center justify-center text-xs font-bold text-surface shadow-sm">
                {getInitials(currentUser.display_name)}
              </div>
              <div className="hidden xl:flex flex-col text-left">
                <span className="text-body-sm font-semibold text-on-surface leading-tight">
                  {currentUser.display_name || "User"}
                </span>
                <span className="text-label-sm text-on-surface-variant leading-none truncate max-w-[130px]">
                  {currentUser.email || "Active User"}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-outline transition-transform ${profileOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Profile Dropdown Menu */}
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-surface-container-low/95 border border-outline-variant/30 rounded-2xl p-2 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="p-3 border-b border-outline-variant/20 mb-1">
                  <p className="text-body-sm font-bold text-on-surface">{currentUser.display_name}</p>
                  <p className="text-label-sm text-on-surface-variant truncate">{currentUser.email}</p>
                  <span className="inline-flex items-center gap-1 mt-1 text-label-sm px-2 py-0.5 rounded-full bg-secondary/15 text-secondary">
                    <UserCheck className="w-3 h-3" />
                    Isolated Memory Active
                  </span>
                </div>

                <button
                  onClick={() => {
                    setProfileOpen(false);
                    onOpenAuthModal();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-body-sm text-on-surface hover:bg-surface-container-high rounded-xl transition-colors text-left"
                >
                  <User className="w-4 h-4 text-primary" />
                  <span>Switch Account / Sign In</span>
                </button>

                <button
                  onClick={() => {
                    setProfileOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-body-sm text-error hover:bg-error-container/20 rounded-xl transition-colors text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenAuthModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 text-body-sm font-semibold transition-all active:scale-95"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}
