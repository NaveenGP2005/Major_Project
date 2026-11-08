import React from "react";
import { Sparkles, CheckCircle2, Plus, CloudCheck, Settings2, Trash2, History, Radio } from "lucide-react";

export default function TopNav({
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  memoryCount = 0,
  onClearMemories,
  isSyncing = false,
}) {
  return (
    <header className="w-full px-6 py-3 flex items-center justify-between sticky top-0 z-50 bg-surface-container-lowest/80 backdrop-blur-md border-b border-outline-variant/20 shadow-sm transition-all">
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

        {/* Profile Avatar */}
        <div className="flex items-center gap-2 pl-1">
          <div className="w-8 h-8 rounded-full ring-1 ring-primary/40 p-0.5 bg-gradient-to-br from-primary-container to-secondary flex items-center justify-center text-xs font-bold text-surface">
            AM
          </div>
          <div className="hidden xl:flex flex-col text-left">
            <span className="text-body-sm font-semibold text-on-surface leading-tight">Alex M.</span>
            <span className="text-label-sm text-on-surface-variant leading-none">GATE Aspirant</span>
          </div>
        </div>
      </div>
    </header>
  );
}

