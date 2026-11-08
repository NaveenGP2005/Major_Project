import React from "react";
import {
  MessageSquare,
  Plus,
  Sparkles,
  X,
} from "lucide-react";

export default function SessionSidebar({
  sessions = [],
  activeSessionId,
  onSelectSession,
  onCreateSession,
  memoryCount = 0,
  currentUser = null,
  isOpen = true,
  onClose,
}) {
  return (
    <aside
      className={`h-full flex-shrink-0 bg-white/80 dark:bg-surface-container-lowest/80 backdrop-blur-xl border-r border-purple-100/70 dark:border-outline-variant/20 flex flex-col justify-between transition-all duration-300 ease-in-out z-20 ${
        isOpen
          ? "w-64 lg:w-72 opacity-100 translate-x-0"
          : "w-0 min-w-0 opacity-0 -translate-x-full overflow-hidden border-r-0 pointer-events-none p-0"
      }`}
    >
      {/* Top Header & New Session CTA */}
      <div className="p-4 border-b border-purple-100/60 dark:border-outline-variant/15 space-y-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-gray-500 dark:text-on-surface-variant">
              Conversations
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-primary/20 text-purple-700 dark:text-primary">
              {sessions.length} {sessions.length === 1 ? "Session" : "Sessions"}
            </span>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-on-surface hover:bg-purple-100/60 dark:hover:bg-surface-container transition-colors cursor-pointer"
                title="Collapse sidebar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Primary New Session Button */}
        <button
          onClick={onCreateSession}
          className="w-full py-2.5 px-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm shadow-purple-500/20 active:scale-[0.98] transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Conversation</span>
        </button>
      </div>

      {/* Scrollable Sessions List */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1.5">
        {sessions.map((sess, idx) => {
          const isActive = sess.id === activeSessionId;
          const displayTitle = sess.title || `Session ${idx + 1}`;

          return (
            <button
              key={sess.id}
              onClick={() => onSelectSession(sess.id)}
              className={`w-full text-left p-3 rounded-2xl transition-all flex items-start gap-3 group cursor-pointer ${
                isActive
                  ? "bg-purple-100/80 dark:bg-surface-container-high text-purple-950 dark:text-primary font-semibold shadow-xs border border-purple-200/80 dark:border-outline-variant/40"
                  : "text-gray-600 dark:text-on-surface-variant hover:text-gray-900 dark:hover:text-on-surface hover:bg-purple-50/60 dark:hover:bg-surface-container border border-transparent"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                  isActive
                    ? "bg-purple-600 text-white"
                    : "bg-purple-50 dark:bg-surface-container text-purple-600 dark:text-outline group-hover:bg-purple-100"
                }`}
              >
                <MessageSquare className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs font-semibold truncate leading-snug">
                    {displayTitle}
                  </p>
                  {isActive && (
                    <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse shrink-0"></span>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 dark:text-outline truncate mt-0.5">
                  {sess.created_at
                    ? new Date(sess.created_at).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                      })
                    : `Session #${sessions.length - idx}`}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom Memory Status Card */}
      <div className="p-3 border-t border-purple-100/60 dark:border-outline-variant/15 bg-purple-50/40 dark:bg-surface-container-lowest/60 flex-shrink-0">
        <div className="p-3 rounded-xl bg-white/80 dark:bg-surface-container-high/60 border border-purple-100/60 dark:border-outline-variant/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-primary" />
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold text-gray-800 dark:text-on-surface">
                Memory Active
              </span>
              <span className="text-[10px] text-gray-500 dark:text-outline">
                {memoryCount} Grounded Facts
              </span>
            </div>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>
      </div>
    </aside>
  );
}
