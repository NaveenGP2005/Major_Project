import React, { useState } from "react";
import {
  Sparkles,
  X,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  Brain,
  History,
  Tag,
} from "lucide-react";

export default function MemoryInspector({
  isOpen = false,
  onClose,
  memories = [],
  onDeleteMemory,
  highlightedMemoryId,
}) {
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  const filteredMemories = memories.filter((m) => {
    if (selectedCategory === "ALL") return true;
    return m.category?.toUpperCase() === selectedCategory;
  });

  const getCategoryBadge = (cat) => {
    switch (cat?.toUpperCase()) {
      case "PREFERENCE":
        return {
          label: "PREFERENCE",
          bg: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
        };
      case "GOAL":
        return {
          label: "GOAL",
          bg: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
        };
      case "CONSTRAINT":
        return {
          label: "HEALTH & DIET",
          bg: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
        };
      case "PROFILE":
      default:
        return {
          label: "ABOUT YOU",
          bg: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
        };
    }
  };

  return (
    <>
      {/* Backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#2B2740]/15 dark:bg-black/60 backdrop-blur-[4px] transition-opacity duration-300 animate-in fade-in"
          onClick={onClose}
        />
      )}

      {/* Sliding Drawer matching Stitch "What I remember" */}
      <aside
        className={`fixed top-0 right-0 h-screen w-[390px] max-w-full z-50 flex flex-col justify-between bg-white/90 dark:bg-surface-container-low/95 backdrop-blur-[32px] shadow-[-12px_0_45px_rgba(143,123,232,0.16)] transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Top Header Section */}
        <div className="px-6 pt-7 pb-4 flex-shrink-0 relative border-b border-purple-100/70 dark:border-outline-variant/20">
          <div className="flex items-start justify-between">
            <div className="space-y-1 pr-4">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                <span className="text-[10px] tracking-wider uppercase font-semibold text-purple-700 dark:text-primary">
                  Autonomous Recall
                </span>
              </div>
              <h2 className="font-serif text-2xl text-gray-900 dark:text-on-surface font-normal leading-tight">
                What I remember
              </h2>
              <p className="text-xs text-gray-500 dark:text-on-surface-variant leading-relaxed pt-0.5">
                Living context gathered naturally across your chats.
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/80 dark:bg-surface-container hover:bg-purple-50 dark:hover:bg-surface-container-high shadow-xs flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-on-surface transition-all"
              title="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Sync Stats Pill */}
          <div className="mt-4 flex items-center justify-between px-3.5 py-2 rounded-xl bg-purple-50/70 dark:bg-surface-container/60 text-xs text-gray-700 dark:text-on-surface">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-600 dark:text-primary" />
              <span className="font-semibold">{memories.length} items stored</span>
            </div>
            <span className="text-[11px] text-gray-400 dark:text-outline">Adaptive Sync</span>
          </div>

          {/* Category Filter Pills */}
          <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { id: "ALL", label: "All" },
              { id: "PREFERENCE", label: "Preferences" },
              { id: "GOAL", label: "Goals" },
              { id: "CONSTRAINT", label: "Health" },
              { id: "PROFILE", label: "About" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === tab.id
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-gray-500 dark:text-on-surface-variant hover:text-gray-900 hover:bg-purple-100/60"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Memory Cards Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {filteredMemories.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-gray-400 space-y-2">
              <Sparkles className="w-8 h-8 text-purple-300 animate-pulse" />
              <p className="text-sm font-medium text-gray-600 dark:text-on-surface">No memories in this view</p>
              <p className="text-xs max-w-xs">
                As you speak, your dietary habits, learning preferences, and goals will appear here.
              </p>
            </div>
          ) : (
            filteredMemories.map((m) => {
              const badge = getCategoryBadge(m.category);
              const isHighlighted = highlightedMemoryId === m.id;
              const hasEvidenceLinks = m.evidence_links && m.evidence_links.length > 0;

              return (
                <div
                  key={m.id}
                  id={`memory-${m.id}`}
                  className={`group relative p-4 rounded-[20px] bg-white/80 dark:bg-surface-container-high/70 hover:bg-white dark:hover:bg-surface-container-high backdrop-blur-md shadow-[0_4px_20px_-2px_rgba(143,123,232,0.08)] hover:shadow-[0_8px_24px_-2px_rgba(143,123,232,0.14)] hover:-translate-y-0.5 transition-all duration-200 border border-purple-100/70 dark:border-outline-variant/30 ${
                    isHighlighted ? "ring-2 ring-purple-500" : ""
                  }`}
                >
                  {/* Category Pill & Delete Trigger */}
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${badge.bg}`}
                    >
                      {badge.label}
                    </span>

                    <button
                      onClick={() => onDeleteMemory && onDeleteMemory(m.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-error-container/20 transition-all duration-150 cursor-pointer"
                      title="Forget this memory"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Headline Proposition */}
                  <p className="text-base font-semibold text-gray-900 dark:text-on-surface leading-snug">
                    {m.canonical_content}
                  </p>

                  {/* All Verbatim Spoken Evidence Items (Evidence #1, Evidence #2, ...) */}
                  {hasEvidenceLinks ? (
                    <div className="mt-3 pt-2.5 border-t border-purple-100/70 dark:border-outline-variant/20 space-y-2">
                      {m.evidence_links.map((ev, evIdx) => (
                        <div
                          key={ev.id || evIdx}
                          className="p-2.5 rounded-xl bg-purple-50/70 dark:bg-surface-container/60 border border-purple-100/60 dark:border-outline-variant/30 text-xs"
                        >
                          <div className="flex items-center justify-between text-[10px] font-semibold text-purple-700 dark:text-primary mb-1">
                            <span className="flex items-center gap-1.5 uppercase tracking-wider">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                              Evidence #{evIdx + 1}
                            </span>
                            {ev.extracted_at && (
                              <span className="text-gray-400 dark:text-outline font-normal">
                                {new Date(ev.extracted_at).toLocaleDateString([], {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            )}
                          </div>
                          <p className="italic text-gray-700 dark:text-on-surface-variant font-medium leading-relaxed">
                            “{ev.exact_source_span}”
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    (m.source_span || m.exact_source_span) && (
                      <div className="mt-3 pt-2.5 border-t border-purple-100/70 dark:border-outline-variant/20">
                        <div className="p-2.5 rounded-xl bg-purple-50/70 dark:bg-surface-container/60 border border-purple-100/60 dark:border-outline-variant/30 text-xs">
                          <span className="block text-[10px] font-semibold text-purple-700 dark:text-primary mb-1 uppercase tracking-wider">
                            Evidence #1
                          </span>
                          <p className="italic text-gray-700 dark:text-on-surface-variant font-medium leading-relaxed">
                            “{m.source_span || m.exact_source_span}”
                          </p>
                        </div>
                      </div>
                    )
                  )}

                  {/* Provenance Footer */}
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-400 dark:text-outline">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 dark:text-primary" />
                      <span className="text-[11px] text-gray-500 dark:text-on-surface-variant font-medium">
                        Reinforced {m.support_count || 1} {m.support_count === 1 ? "time" : "times"} · High confidence
                      </span>
                    </div>
                    {hasEvidenceLinks && m.evidence_links.length > 1 && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100/80 dark:bg-primary/20 text-purple-800 dark:text-primary">
                        {m.evidence_links.length} Proofs
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer with Privacy Assurance */}
        <div className="p-4 border-t border-purple-100 dark:border-outline-variant/20 bg-purple-50/50 dark:bg-surface-container-lowest/60 text-center flex-shrink-0">
          <p className="text-xs text-gray-500 dark:text-outline flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Living memory isolated to your account • Neon DB</span>
          </p>
        </div>
      </aside>
    </>
  );
}
