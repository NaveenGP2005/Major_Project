import React, { useState } from "react";
import {
  Sparkles,
  X,
  Trash2,
  Volume2,
  ShieldCheck,
  CheckCircle2,
  FolderLock,
  ArrowRight,
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

  const getCategoryTheme = (cat) => {
    switch (cat?.toUpperCase()) {
      case "PREFERENCE":
        return {
          label: "Preference",
          badge: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-primary/20 dark:text-primary-fixed dark:border-primary/30",
          cardBorder: "border-purple-200/70 hover:border-purple-300 dark:border-outline-variant/30",
          dot: "bg-purple-500",
        };
      case "GOAL":
        return {
          label: "Goal",
          badge: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-secondary-container/20 dark:text-secondary dark:border-secondary/30",
          cardBorder: "border-indigo-200/70 hover:border-indigo-300 dark:border-outline-variant/30",
          dot: "bg-indigo-500",
        };
      case "PROFILE":
      case "FACT":
        return {
          label: "Profile",
          badge: "bg-teal-100 text-teal-800 border-teal-200 dark:bg-tertiary-container/20 dark:text-tertiary dark:border-tertiary/30",
          cardBorder: "border-teal-200/70 hover:border-teal-300 dark:border-outline-variant/30",
          dot: "bg-teal-500",
        };
      case "CONSTRAINT":
        return {
          label: "Constraint",
          badge: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30",
          cardBorder: "border-amber-200/70 hover:border-amber-300 dark:border-outline-variant/30",
          dot: "bg-amber-500",
        };
      default:
        return {
          label: cat || "Fact",
          badge: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-surface-container dark:text-on-surface-variant dark:border-outline-variant/30",
          cardBorder: "border-gray-200 dark:border-outline-variant/30",
          dot: "bg-gray-400",
        };
    }
  };

  return (
    <>
      {/* Backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 dark:bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          onClick={onClose}
        />
      )}

      {/* Sliding Glass Drawer */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[430px] bg-white/95 dark:bg-surface-container-low/95 border-l border-purple-200/70 dark:border-outline-variant/30 shadow-2xl backdrop-blur-2xl flex flex-col transform transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Top subtle highlight line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500"></div>

        {/* Drawer Header */}
        <div className="p-6 border-b border-purple-100 dark:border-outline-variant/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-purple-100 dark:bg-primary-container/20 text-purple-600 dark:text-primary flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg font-semibold text-gray-900 dark:text-on-surface">
                  Living Memory
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 dark:bg-primary/20 text-purple-700 dark:text-primary">
                  {memories.length} Grounded Facts
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-on-surface-variant">
                Learned across your spoken conversations
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-purple-50 dark:hover:bg-surface-container-high text-gray-400 hover:text-gray-700 dark:hover:text-on-surface flex items-center justify-center transition-colors"
            title="Close Drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category Filter Tabs */}
        <div className="px-6 py-3 border-b border-purple-100/60 dark:border-outline-variant/10 flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: "ALL", label: "All" },
            { id: "PREFERENCE", label: "Preferences" },
            { id: "GOAL", label: "Goals" },
            { id: "PROFILE", label: "Profile" },
            { id: "CONSTRAINT", label: "Constraints" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === tab.id
                  ? "bg-purple-600 text-white shadow-sm shadow-purple-500/20"
                  : "text-gray-500 dark:text-on-surface-variant hover:text-gray-800 dark:hover:text-on-surface hover:bg-purple-50 dark:hover:bg-surface-container"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Memory Cards Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {filteredMemories.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-gray-400 dark:text-on-surface-variant space-y-2">
              <Sparkles className="w-8 h-8 text-purple-300 dark:text-primary/40 animate-pulse" />
              <p className="text-sm font-medium text-gray-600 dark:text-on-surface">No memories in this view</p>
              <p className="text-xs max-w-xs">
                As you speak, key preferences and commitments are automatically distilled and grounded here.
              </p>
            </div>
          ) : (
            filteredMemories.map((m) => {
              const theme = getCategoryTheme(m.category);
              const isHighlighted = highlightedMemoryId === m.id;

              return (
                <div
                  key={m.id}
                  id={`memory-${m.id}`}
                  className={`p-4 rounded-2xl bg-white/90 dark:bg-surface-container-high/70 border ${
                    theme.cardBorder
                  } shadow-xs hover:shadow-md transition-all space-y-3 ${
                    isHighlighted ? "ring-2 ring-purple-500 scale-[1.01]" : ""
                  }`}
                >
                  {/* Category Badge & Delete Trigger */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${theme.badge}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`}></span>
                      {theme.label}
                    </span>

                    <button
                      onClick={() => onDeleteMemory && onDeleteMemory(m.id)}
                      className="text-gray-300 hover:text-rose-500 dark:text-outline dark:hover:text-error p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-error-container/20 transition-colors"
                      title="Forget this memory"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Canonical Proposition */}
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-on-surface leading-snug">
                    {m.canonical_content}
                  </h4>

                  {/* Verbatim Quote Spans */}
                  {m.evidence_links && m.evidence_links.length > 0 && (
                    <div className="p-3 rounded-xl bg-purple-50/60 dark:bg-surface-container-lowest/60 border border-purple-100/60 dark:border-outline-variant/20 space-y-1.5">
                      <p className="text-xs italic text-gray-700 dark:text-on-surface-variant">
                        "{m.evidence_links[0].exact_source_span}"
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-purple-700 dark:text-primary font-medium pt-1">
                        <span className="flex items-center gap-1">
                          <Volume2 className="w-3 h-3" />
                          <span>Spoken Origin Grounding</span>
                        </span>
                        {m.evidence_links.length > 1 && (
                          <span className="text-gray-400 dark:text-outline">
                            +{m.evidence_links.length - 1} more mentions
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer with Quiet Privacy Assurance */}
        <div className="p-4 border-t border-purple-100 dark:border-outline-variant/20 bg-purple-50/40 dark:bg-surface-container-lowest/60 text-center">
          <p className="text-xs text-gray-500 dark:text-outline flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Privately stored on Neon PostgreSQL • Isolated to your account</span>
          </p>
        </div>
      </aside>
    </>
  );
}
