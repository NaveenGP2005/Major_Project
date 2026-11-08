import React, { useState, useRef, useEffect } from "react";
import MarkdownRenderer from "./MarkdownRenderer";
import {
  Mic,
  ArrowUp,
  Volume2,
  Play,
  Pause,
  Copy,
  ThumbsUp,
  RotateCcw,
  Sparkles,
  CheckCircle,
  ArrowUpRight,
} from "lucide-react";

export default function ChatPanel({
  turns,
  onSendMessage,
  isLoading,
  activeSessionTitle,
  onSelectEvidenceMemory,
}) {
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [playingTurnId, setPlayingTurnId] = useState(null);
  const chatEndRef = useRef(null);

  // Auto-scroll on new turns
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, isLoading]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  // Browser TTS Voice Playback
  const handlePlayVoice = (turnId, text) => {
    if (!("speechSynthesis" in window)) return;

    if (playingTurnId === turnId) {
      window.speechSynthesis.cancel();
      setPlayingTurnId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#`[\]]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.onend = () => setPlayingTurnId(null);
    utterance.onerror = () => setPlayingTurnId(null);

    setPlayingTurnId(turnId);
    window.speechSynthesis.speak(utterance);
  };

  // Browser Speech Recognition for Voice Input
  const handleToggleVoiceInput = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Google Chrome or Edge.");
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => setIsRecording(true);
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsRecording(false);
      };
      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);

      recognition.start();
    } catch (err) {
      console.error("Speech recognition error:", err);
      setIsRecording(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <section className="flex-1 flex flex-col h-full relative overflow-hidden">
      {/* Serene Breadcrumb Top Header */}
      <div className="px-6 lg:px-12 py-3 bg-white/40 dark:bg-surface-container-low/40 border-b border-purple-100/60 dark:border-outline-variant/10 flex items-center justify-between text-xs text-gray-500 dark:text-on-surface-variant backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
          <span className="font-semibold text-gray-800 dark:text-on-surface">
            {activeSessionTitle || "Active Session"}
          </span>
          <span>•</span>
          <span className="text-purple-600 dark:text-primary">Gentle Voice Synthesis</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-gray-400 dark:text-outline">
          <span>Evidence-Grounded Long-Term Memory</span>
        </div>
      </div>

      {/* Main Centered Dialogue Scroll Stream */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-8 flex flex-col items-center">
        <div className="w-full max-w-3xl space-y-8 pb-36">
          {turns.length === 0 && (
            <div className="flex flex-col items-center justify-center h-80 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-purple-100 to-indigo-100 dark:bg-primary-container/20 border border-purple-200/80 dark:border-primary/30 flex items-center justify-center text-purple-600 dark:text-primary shadow-sm">
                <Sparkles className="w-7 h-7 animate-pulse" />
              </div>
              <h3 className="font-serif text-2xl font-medium text-gray-900 dark:text-on-surface">
                Echo is Listening
              </h3>
              <p className="text-sm text-gray-500 dark:text-on-surface-variant max-w-md leading-relaxed">
                Speak or type naturally. Your goals, technical preferences, and constraints will be quietly
                distilled and recalled whenever relevant.
              </p>
            </div>
          )}

          {turns.map((turn, index) => {
            const isUser = turn.speaker_type === "OWNER" || turn.speaker_type === "user";
            const citations = turn.metadata?.cited_memories || [];
            const isPlaying = playingTurnId === turn.id;

            if (isUser) {
              return (
                <div key={turn.id || index} className="flex justify-end items-end space-x-3 group">
                  <div className="max-w-xl">
                    <div className="flex items-center justify-end space-x-2 mb-1.5 px-1">
                      <span className="text-xs font-medium text-gray-500 dark:text-on-surface-variant">
                        Alex M.
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-outline">Spoken Voice</span>
                    </div>

                    <div className="bg-white/85 dark:bg-surface-container-high/90 border border-purple-100/90 dark:border-outline-variant/30 rounded-3xl rounded-br-md p-5 text-gray-800 dark:text-on-surface shadow-sm hover:shadow transition-shadow space-y-3">
                      <p className="text-[15px] font-normal leading-relaxed whitespace-pre-wrap">
                        {turn.raw_transcript}
                      </p>

                      <div className="pt-2 flex items-center justify-between border-t border-purple-100/60 dark:border-outline-variant/20">
                        <div className="flex items-center space-x-2 text-xs text-purple-700 dark:text-primary">
                          <div className="w-5 h-5 rounded-full bg-purple-100 dark:bg-primary/20 flex items-center justify-center">
                            <Mic className="w-3 h-3 text-purple-600 dark:text-primary" />
                          </div>
                          <span className="font-medium text-[11px]">Spoken Voice Note</span>
                        </div>
                        <span className="text-[10px] text-gray-400 dark:text-outline">
                          {turn.timestamp
                            ? new Date(turn.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Just now"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            // Echo Assistant Turn
            return (
              <div key={turn.id || index} className="flex items-start space-x-3.5 mr-auto max-w-2xl w-full">
                {/* Serene Echo Avatar Orb */}
                <div className="flex-shrink-0 mt-1">
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-200 via-indigo-100 to-white dark:from-primary-container dark:to-secondary p-0.5 shadow-sm border border-purple-200/60 dark:border-outline-variant/30 flex items-center justify-center">
                    <div className="w-3.5 h-3.5 rounded-full bg-purple-500 dark:bg-primary animate-pulse"></div>
                  </div>
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex items-center space-x-2 mb-1 px-1">
                    <span className="font-serif text-base font-semibold text-gray-900 dark:text-on-surface">
                      Echo
                    </span>
                    <span className="text-[11px] text-purple-600 dark:text-primary font-medium">
                      Adaptive Synthesis
                    </span>
                  </div>

                  {/* Glass Response Container */}
                  <div className="bg-white/90 dark:bg-surface-container-high/70 border border-purple-100/90 dark:border-outline-variant/30 rounded-3xl rounded-tl-md p-6 shadow-sm hover:shadow-md transition-shadow text-gray-800 dark:text-on-surface space-y-5">
                    {/* Audio Playback Strip */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-purple-50/50 dark:bg-surface-container-lowest/70 border border-purple-100/80 dark:border-outline-variant/20">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handlePlayVoice(turn.id, turn.raw_transcript)}
                          className={`w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-95 shadow-sm ${
                            isPlaying
                              ? "bg-purple-600 text-white"
                              : "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/20"
                          }`}
                        >
                          {isPlaying ? (
                            <Pause className="w-4 h-4 fill-current" />
                          ) : (
                            <Play className="w-4 h-4 ml-0.5 fill-current" />
                          )}
                        </button>
                        <div>
                          <h4 className="text-xs font-semibold text-gray-800 dark:text-on-surface">
                            Spoken Summary
                          </h4>
                          <p className="text-[11px] text-purple-600 dark:text-primary font-medium">
                            {isPlaying ? "Voice Synthesis Playing..." : "Soft Natural Voice"}
                          </p>
                        </div>
                      </div>

                      {/* Animated Harmonic Waveform */}
                      <div className="flex items-center space-x-1 px-3">
                        <span className={`w-1 rounded-full ${isPlaying ? "bg-purple-500 h-5 animate-pulse" : "bg-purple-300 dark:bg-primary/40 h-2.5"}`}></span>
                        <span className={`w-1 rounded-full ${isPlaying ? "bg-purple-600 h-7 animate-pulse" : "bg-purple-400 dark:bg-primary/60 h-4"}`}></span>
                        <span className={`w-1 rounded-full ${isPlaying ? "bg-indigo-500 h-4 animate-pulse" : "bg-purple-300 dark:bg-primary/40 h-2"}`}></span>
                        <span className={`w-1 rounded-full ${isPlaying ? "bg-purple-400 h-6 animate-pulse" : "bg-purple-200 dark:bg-primary/30 h-3"}`}></span>
                      </div>

                      <div className="flex items-center space-x-1.5 text-gray-400">
                        <span className="px-2 py-0.5 text-[11px] font-medium text-purple-700 dark:text-primary bg-purple-100/60 dark:bg-primary/10 rounded-lg">
                          1.0x
                        </span>
                        <Volume2 className="w-4 h-4" />
                      </div>
                    </div>

                    {/* Rich Markdown Response Prose */}
                    <div className="text-[14.5px] leading-relaxed text-gray-700 dark:text-on-surface">
                      <MarkdownRenderer content={turn.raw_transcript} />
                    </div>

                    {/* INTERACTIVE TOUCH PANELS: Quiet, beautiful recalled memory pills */}
                    {citations.length > 0 && (
                      <div className="pt-4 border-t border-purple-100/80 dark:border-outline-variant/20">
                        <div className="flex items-center space-x-1.5 mb-2.5">
                          <Sparkles className="w-3.5 h-3.5 text-purple-500 dark:text-primary" />
                          <span className="text-[11px] font-semibold tracking-wider uppercase text-purple-600 dark:text-primary">
                            Recalled From Long-Term Memory (Touch to Inspect)
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {citations.map((cite, cIdx) => (
                            <button
                              key={cite.id || cIdx}
                              onClick={() => onSelectEvidenceMemory && onSelectEvidenceMemory(cite)}
                              className="group px-3 py-1.5 rounded-xl bg-purple-50/90 dark:bg-primary-container/20 hover:bg-purple-100 dark:hover:bg-primary-container/35 border border-purple-200/70 dark:border-primary/30 text-xs font-medium text-purple-900 dark:text-primary transition-all flex items-center space-x-2 shadow-xs cursor-pointer active:scale-95"
                              title="Touch to reveal verbatim spoken quote evidence"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 group-hover:scale-125 transition-transform"></span>
                              <span className="truncate max-w-[240px]">✦ {cite.canonical_content}</span>
                              <ArrowUpRight className="w-3 h-3 text-purple-400 group-hover:text-purple-700 dark:text-primary transition-colors" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Footer Grounding Assurance & Quiet Tools */}
                    <div className="flex items-center justify-between pt-2 text-xs text-gray-400 dark:text-outline border-t border-purple-50 dark:border-outline-variant/10">
                      <span className="flex items-center space-x-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Grounded in verified spoken memory</span>
                      </span>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleCopy(turn.raw_transcript)}
                          className="p-1.5 hover:text-purple-700 dark:hover:text-primary rounded-lg hover:bg-purple-50 dark:hover:bg-surface-container transition-all"
                          title="Copy response"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handlePlayVoice(turn.id, turn.raw_transcript)}
                          className="p-1.5 hover:text-purple-700 dark:hover:text-primary rounded-lg hover:bg-purple-50 dark:hover:bg-surface-container transition-all"
                          title="Play Spoken Voice"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Assistant Loading Orb */}
          {isLoading && (
            <div className="flex items-center space-x-3 text-purple-600 dark:text-primary p-4 rounded-2xl bg-purple-50/60 dark:bg-surface-container-high/40 max-w-md">
              <div className="w-3 h-3 rounded-full bg-purple-500 animate-ping"></div>
              <span className="text-xs font-medium">
                Distilling concepts & recalling cross-session context...
              </span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* FLOATING CAPSULE INPUT DOCK */}
      <div className="fixed bottom-6 inset-x-0 z-20 flex justify-center px-4 pointer-events-none">
        <form
          onSubmit={handleSubmit}
          className="pointer-events-auto w-full max-w-2xl bg-white/90 dark:bg-surface-container-low/95 backdrop-blur-2xl rounded-full p-2 pl-5 pr-2.5 border border-purple-200/60 dark:border-outline-variant/40 shadow-xl shadow-purple-900/5 flex items-center justify-between space-x-3 transition-all focus-within:ring-2 focus-within:ring-purple-400"
        >
          {/* Text Input */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
            placeholder={
              isRecording
                ? "Listening to your voice..."
                : "Speak softly, or type your question..."
            }
            className="bg-transparent text-sm text-gray-800 dark:text-on-surface placeholder-gray-400 dark:placeholder-outline focus:outline-none flex-1 font-normal"
          />

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {/* Voice Memo Mic Button */}
            <button
              type="button"
              onClick={handleToggleVoiceInput}
              className={`relative p-2.5 rounded-full transition-all flex items-center justify-center ${
                isRecording
                  ? "bg-rose-500 text-white animate-pulse"
                  : "bg-purple-100 hover:bg-purple-200 text-purple-700 dark:bg-surface-container-high dark:text-primary"
              }`}
              title="Record Voice Memo"
            >
              <Mic className="w-4 h-4" />
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white flex items-center justify-center shadow-md shadow-purple-500/25 transition-transform active:scale-95 disabled:opacity-40"
            >
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
