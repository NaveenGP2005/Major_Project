import React from "react";
import { Sparkles, X, Trash2, ArrowUpRight, Volume2, ShieldCheck } from "lucide-react";

export default function EvidenceModal({
  memory,
  isOpen,
  onClose,
  onDelete,
  onOpenDrawer,
}) {
  if (!isOpen || !memory) return null;

  const isPref = memory.category?.toUpperCase() === "PREFERENCE" || memory.is_preference;
  const quoteSpan =
    memory.source_span ||
    (memory.evidence_links && memory.evidence_links.length > 0
      ? memory.evidence_links[0].exact_source_span
      : null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-lg w-full bg-white/90 dark:bg-surface-container-low/95 border border-purple-200/80 dark:border-outline-variant/40 rounded-3xl p-6 shadow-2xl backdrop-blur-2xl text-gray-900 dark:text-on-surface transform transition-all animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle top edge gradient */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400 via-indigo-400 to-pink-400 rounded-t-3xl"></div>

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-purple-100 dark:border-outline-variant/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-primary-container/30 text-purple-600 dark:text-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-primary/15 text-purple-700 dark:text-primary border border-purple-200/60 dark:border-primary/30">
                {memory.category || "Long-Term Memory"}
              </span>
              <p className="text-xs text-gray-500 dark:text-on-surface-variant mt-0.5">
                Spoken Audio Provenance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-purple-50 dark:hover:bg-surface-container-high text-gray-400 hover:text-gray-700 dark:hover:text-on-surface flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 space-y-3.5">
          <div>
            <span className="text-xs font-semibold text-gray-500 dark:text-outline uppercase tracking-wider">
              Recalled Fact
            </span>
            <p className="text-base font-medium text-gray-900 dark:text-on-surface mt-1 leading-snug">
              {memory.canonical_content}
            </p>
          </div>

          {/* Verbatim Spoken Evidence Quote */}
          {quoteSpan && (
            <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-surface-container-high/60 border border-purple-100 dark:border-outline-variant/30 space-y-2">
              <span className="text-[11px] font-semibold text-purple-700 dark:text-primary flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5" />
                <span>Verbatim Spoken Evidence</span>
              </span>
              <p className="text-sm italic text-gray-700 dark:text-on-surface-variant leading-relaxed">
                "{quoteSpan}"
              </p>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-on-surface-variant">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Grounded from conversation • Isolated to your account</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-purple-100 dark:border-outline-variant/20 flex items-center justify-between">
          <button
            onClick={() => {
              if (onDelete) onDelete(memory.id);
              onClose();
            }}
            className="flex items-center gap-1.5 text-xs font-medium text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-error-container/20 px-3 py-1.5 rounded-xl transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Forget this memory</span>
          </button>

          <button
            onClick={() => {
              onClose();
              if (onOpenDrawer) onOpenDrawer();
            }}
            className="flex items-center gap-1 text-xs font-semibold text-purple-700 dark:text-primary hover:bg-purple-50 dark:hover:bg-surface-container-high px-3 py-1.5 rounded-xl transition-colors"
          >
            <span>Open Living Memory</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

