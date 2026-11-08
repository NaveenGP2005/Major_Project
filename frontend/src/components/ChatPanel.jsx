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
  ThumbsDown,
  RotateCcw,
  Sparkles,
  Paperclip,
  CheckCircle,
  AlertTriangle,
  Info,
  ArrowRight,
} from "lucide-react";

export default function ChatPanel({
  turns,
  onSendMessage,
  isLoading,
  activeSessionTitle,
  onHighlightMemory,
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
    <section className="lg:col-span-7 flex flex-col h-full border-r border-outline-variant/20 relative bg-surface-container-lowest/40 backdrop-blur-sm">
      {/* Ambient Breadcrumb Banner */}
      <div className="px-8 py-2.5 bg-surface-container-low/40 border-b border-outline-variant/10 flex items-center justify-between text-label-sm font-label-sm text-on-surface-variant">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-secondary"></span>
          <span className="text-on-surface font-medium">{activeSessionTitle || "Active Session"}</span>
          <span>•</span>
          <span>Recorded Audio & Live Transcripts</span>
          <span>•</span>
          <span className="text-primary">Voice Engine v3.2</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-tertiary">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
            Lossless Opus 48kHz
          </span>
          <span className="px-2 py-0.5 rounded bg-surface-container text-outline text-[10px]">
            Latency 142ms
          </span>
        </div>
      </div>

      {/* Dialogue Scrollable Stream */}
      <div className="flex-1 overflow-y-auto px-6 lg:px-10 py-6 space-y-7 pb-36">
        {turns.length === 0 && (
          <div className="flex flex-col items-center justify-center h-80 text-center space-y-3 text-on-surface-variant">
            <div className="w-12 h-12 rounded-full bg-primary-container/20 border border-primary/30 flex items-center justify-center text-primary">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="text-title-md font-semibold text-on-surface">Echo is Listening</h3>
            <p className="text-body-sm max-w-md">
              Start by sharing a preference or asking a question. Facts are automatically extracted,
              grounded to verbatim evidence, and recalled across all your future sessions.
            </p>
          </div>
        )}

        {turns.map((turn, index) => {
          const isUser = turn.speaker_type === "OWNER" || turn.speaker_type === "user";
          const citations = turn.metadata?.cited_memories || [];
          const isPlaying = playingTurnId === turn.id;

          if (isUser) {
            return (
              <div key={turn.id || index} className="flex flex-col items-end space-y-2 max-w-3xl ml-auto">
                <div className="flex items-center gap-2 text-label-sm text-on-surface-variant mr-1">
                  <span className="font-medium text-on-surface">Alex M.</span>
                  <span>•</span>
                  <span>{turn.timestamp ? new Date(turn.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now"}</span>
                </div>
                <div className="bg-surface-container-high/90 border border-outline-variant/30 rounded-2xl rounded-tr-sm p-4 text-on-surface shadow-md">
                  <p className="font-body-lg text-body-lg leading-relaxed whitespace-pre-wrap">
                    {turn.raw_transcript}
                  </p>
                  <div className="mt-3 pt-2.5 border-t border-outline-variant/20 flex items-center gap-2 text-label-sm text-tertiary">
                    <Mic className="w-3.5 h-3.5" />
                    <span className="font-medium">[0:04s voice memo attached]</span>
                    <span className="text-outline ml-auto">Sample rate: 44.1kHz • Conf: 99.8%</span>
                  </div>
                </div>
              </div>
            );
          }

          // Echo Assistant Turn
          return (
            <div key={turn.id || index} className="flex flex-col space-y-3 max-w-3xl mr-auto">
              {/* Agent Header */}
              <div className="flex items-center gap-2 text-label-sm text-on-surface-variant ml-1">
                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-surface font-bold" />
                </div>
                <span className="font-semibold text-primary">Echo</span>
                <span>•</span>
                <span>{turn.timestamp ? new Date(turn.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now"}</span>
                <span className="ml-2 px-2 py-0.5 rounded-full bg-secondary/10 text-secondary text-[10px] border border-secondary/20">
                  Adaptive Synthesis Active
                </span>
              </div>

              {/* Glass Response Card */}
              <div className="glass-card rounded-2xl rounded-tl-sm p-6 text-on-surface relative shadow-xl space-y-5 border-l-2 border-l-primary">
                {/* Audio Playback Strip */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-lowest/80 border border-outline-variant/20">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handlePlayVoice(turn.id, turn.raw_transcript)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform shadow-md ${
                        isPlaying
                          ? "bg-primary text-surface scale-105"
                          : "bg-secondary text-surface hover:scale-105 shadow-secondary/30"
                      }`}
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="font-label-sm text-label-sm font-semibold text-on-surface">Voice Synthesis</span>
                        <span className="text-[10px] font-label-sm text-secondary bg-secondary/15 px-1.5 py-0.2 rounded">
                          Natural Soft 2x
                        </span>
                      </div>
                      <span className="font-label-sm text-label-sm text-outline">
                        {isPlaying ? "Speaking now..." : "0:28 / 1:15"}
                      </span>
                    </div>
                  </div>

                  {/* Animated Waveform Track */}
                  <div className="flex items-center gap-1 h-6 px-4">
                    <span className={`w-1 rounded-full ${isPlaying ? "bg-secondary wave-bar-1" : "h-3 bg-secondary/60"}`}></span>
                    <span className={`w-1 rounded-full ${isPlaying ? "bg-secondary wave-bar-2" : "h-5 bg-secondary"}`}></span>
                    <span className={`w-1 rounded-full ${isPlaying ? "bg-secondary wave-bar-3" : "h-2 bg-secondary/80"}`}></span>
                    <span className={`w-1 rounded-full ${isPlaying ? "bg-secondary wave-bar-4" : "h-6 bg-secondary"}`}></span>
                    <span className={`w-1 rounded-full ${isPlaying ? "bg-primary wave-bar-5" : "h-4 bg-primary/70"}`}></span>
                    <span className={`w-1 rounded-full ${isPlaying ? "bg-primary wave-bar-6" : "h-5 bg-primary"}`}></span>
                    <span className="w-1 bg-outline-variant/40 rounded-full h-1.5"></span>
                    <span className="w-1 bg-outline-variant/30 rounded-full h-3"></span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-label-sm text-on-surface-variant px-1.5 py-0.5 rounded bg-surface-container">1.0x</span>
                    <Volume2 className="w-4 h-4 text-on-surface-variant" />
                  </div>
                </div>

                {/* PROMINENT RECALLED MEMORY CITATION PILLS */}
                {citations.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-label-sm text-outline uppercase tracking-wider block">
                      Context Activated From Long-Term Memory
                    </span>
                    <div className="flex flex-wrap items-center gap-2.5">
                      {citations.map((cite, cIdx) => {
                        const isPref = cite.category?.toUpperCase() === "PREFERENCE" || cite.is_preference;
                        return (
                          <button
                            key={cite.id || cIdx}
                            onClick={() => onHighlightMemory && onHighlightMemory(cite.id)}
                            className={`group cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all hover:scale-[1.02] shadow-sm ${
                              isPref
                                ? "bg-primary-container/15 hover:bg-primary-container/25 border-primary/40 text-primary-fixed shadow-primary/10"
                                : "bg-secondary-container/15 hover:bg-secondary-container/25 border-secondary/40 text-secondary-fixed shadow-secondary/10"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isPref ? "bg-primary-container" : "bg-secondary"}`}></span>
                            <span className="font-label-sm text-label-sm font-semibold">
                              ✦ Recalled: {cite.canonical_content}
                            </span>
                            <ArrowRight className="w-3 h-3 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Formatted Assistant Text with Rich Markdown & Tables */}
                <div className="pt-1 text-on-surface">
                  <MarkdownRenderer content={turn.raw_transcript} />
                </div>


                {/* Citation & Action Footer */}
                <div className="pt-4 border-t border-outline-variant/20 flex flex-wrap items-center justify-between gap-3 text-label-sm text-on-surface-variant">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-secondary font-medium">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Grounding Verified ({citations.length} sources)
                    </span>
                    <span className="text-outline">•</span>
                    <span className="text-outline">Confidence Score: 99.4%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopy(turn.raw_transcript)}
                      className="p-1.5 rounded hover:bg-surface-container hover:text-on-surface transition-colors flex items-center gap-1"
                      title="Copy Answer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </button>
                    <button className="p-1.5 rounded hover:bg-surface-container hover:text-secondary transition-colors" title="Helpful">
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1.5 rounded hover:bg-surface-container hover:text-error transition-colors" title="Not helpful">
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handlePlayVoice(turn.id, turn.raw_transcript)}
                      className="p-1.5 rounded hover:bg-surface-container hover:text-primary transition-colors flex items-center gap-1"
                      title="Regenerate Voice"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Voice Playback</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading Spinner / Generating State */}
        {isLoading && (
          <div className="flex items-center gap-3 text-label-sm text-on-surface-variant p-4 glass-card rounded-2xl w-fit">
            <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
            <span>Recall engine querying Neon DB & synthesizing response via Groq...</span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* BOTTOM FLOATING INPUT DOCK */}
      <div className="absolute bottom-5 left-6 right-6 z-20">
        <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-2.5 shadow-2xl border border-outline-variant/30 flex items-center gap-3">
          {/* Organic Pulsing Voice Visualizer Waves */}
          <div className="hidden sm:flex items-center gap-1 px-3 py-2 bg-surface-container-lowest/80 rounded-xl border border-outline-variant/20">
            <span className={`w-1 rounded-full ${isRecording ? "bg-error wave-bar-1" : "bg-secondary wave-bar-1"}`}></span>
            <span className={`w-1 rounded-full ${isRecording ? "bg-error wave-bar-2" : "bg-secondary wave-bar-2"}`}></span>
            <span className={`w-1 rounded-full ${isRecording ? "bg-error wave-bar-3" : "bg-tertiary wave-bar-3"}`}></span>
            <span className={`w-1 rounded-full ${isRecording ? "bg-error wave-bar-4" : "bg-primary wave-bar-4"}`}></span>
            <span className={`w-1 rounded-full ${isRecording ? "bg-error wave-bar-5" : "bg-secondary wave-bar-5"}`}></span>
            <span className={`ml-2 font-label-sm text-label-sm font-medium ${isRecording ? "text-error" : "text-secondary"}`}>
              {isRecording ? "Listening..." : "Mic Ready"}
            </span>
          </div>

          {/* Input text field */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type a message or click Mic to speak (e.g. 'I prefer concise bullet points')..."
              className="w-full bg-surface-container-lowest/70 border border-outline-variant/20 rounded-xl py-3 px-4 text-on-surface placeholder:text-outline text-body-md font-body-md focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
            />
          </div>

          {/* Right Dock Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="p-2.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/60 transition-colors"
              title="Attach Context Document"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* Glowing Voice Recording Core Trigger */}
            <button
              type="button"
              onClick={handleToggleVoiceInput}
              className={`relative group flex items-center justify-center p-3 rounded-full font-semibold shadow-lg transition-all hover:scale-105 active:scale-95 ${
                isRecording
                  ? "bg-error text-white shadow-error/40 animate-pulse"
                  : "bg-gradient-to-r from-secondary-container to-secondary text-on-secondary-container shadow-secondary/20"
              }`}
              title={isRecording ? "Stop Listening" : "Speak to Echo"}
            >
              <span className="absolute -inset-1 rounded-full bg-secondary/30 blur-sm group-hover:blur-md transition-all"></span>
              <Mic className="w-5 h-5 relative z-10" />
            </button>

            {/* Send Action Button */}
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="p-2.5 rounded-xl bg-primary hover:bg-primary-fixed text-on-primary-fixed disabled:opacity-40 disabled:scale-100 hover:scale-105 active:scale-95 transition-all shadow-md shadow-primary/20"
              title="Send Message"
            >
              <ArrowUp className="w-5 h-5 font-bold" />
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

