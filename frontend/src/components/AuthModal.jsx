import React, { useState } from "react";
import {
  LogIn,
  UserPlus,
  Zap,
  Mail,
  Lock,
  User,
  ShieldCheck,
  AlertCircle,
  X,
  Sparkles,
  ArrowRight,
  Check,
} from "lucide-react";
import { loginUser, registerUser, demoLogin } from "../api";

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [tab, setTab] = useState("login"); // "login" | "register"
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      let data;
      if (tab === "login") {
        data = await loginUser(email, password);
      } else {
        data = await registerUser(displayName, email, password);
      }
      onAuthSuccess(data.user);
    } catch (err) {
      setErrorMsg(err.message || "Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAccess = async () => {
    setErrorMsg("");
    setLoading(true);
    try {
      const data = await demoLogin();
      onAuthSuccess(data.user);
    } catch (err) {
      setErrorMsg(err.message || "Failed to start demo session.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2B2740]/25 dark:bg-black/60 backdrop-blur-md transition-all duration-300 animate-in fade-in"
      onClick={onClose}
    >
      {/* Modal Dialog Card matching Stitch Profile Modal */}
      <div
        className="relative w-full max-w-[440px] bg-white/95 dark:bg-surface-container-low/95 backdrop-blur-[36px] shadow-[0_24px_60px_rgba(143,123,232,0.22)] rounded-[28px] p-7 flex flex-col gap-5 border border-purple-100/90 dark:border-outline-variant/30 text-gray-900 dark:text-on-surface transform transition-all animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Internal Top Glow Flare */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-12 bg-purple-300/40 dark:bg-primary-container/20 rounded-full blur-2xl pointer-events-none"></div>

        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-on-surface hover:bg-purple-50 dark:hover:bg-surface-container transition-colors"
            title="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Header Section */}
        <div className="flex items-center space-x-3.5 pr-6">
          <div className="relative flex items-center justify-center w-9 h-9 shrink-0">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-400 via-indigo-300 to-pink-200 shadow-md shadow-purple-500/30 animate-pulse"></div>
            <div className="absolute inset-0 rounded-full border border-purple-300/40 animate-ping opacity-30"></div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-serif text-2xl font-normal tracking-tight text-gray-900 dark:text-on-surface">
                Echo
              </h2>
              <span className="text-[10px] uppercase tracking-wider font-bold text-purple-700 dark:text-primary px-2 py-0.5 bg-purple-50 dark:bg-primary-container/20 rounded-full border border-purple-200/60 dark:border-primary/30">
                Luminous
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-on-surface-variant">
              Adaptive Voice Agent & Living Memory Engine
            </p>
          </div>
        </div>

        {/* Academic 1-Click Evaluation Card (Alex M. Preset) */}
        <div>
          <button
            type="button"
            onClick={handleDemoAccess}
            disabled={loading}
            className="w-full group relative flex items-center justify-between p-3.5 rounded-2xl bg-purple-50/70 hover:bg-purple-100/70 dark:bg-surface-container-high/40 dark:hover:bg-surface-container-high/60 border border-purple-100 dark:border-outline-variant/30 shadow-xs transition-all text-left active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              {/* Iridescent Avatar with Active Dot */}
              <div className="relative shrink-0">
                <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-purple-300 via-indigo-200 to-pink-200 text-purple-900 font-bold text-xs flex items-center justify-center shadow-xs">
                  AM
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] ring-2 ring-white dark:ring-surface"></span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-gray-900 dark:text-on-surface truncate">
                    Alex M.
                  </span>
                  <span className="text-[10px] font-medium text-purple-700 dark:text-primary px-1.5 py-0.2 rounded bg-purple-100/70 dark:bg-primary/20">
                    Evaluation Persona
                  </span>
                </div>
                <span className="text-xs text-gray-500 dark:text-on-surface-variant truncate">
                  GATE Aspirant · Pre-seeded long-term memories
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-purple-600 text-white text-xs font-semibold shadow-xs shrink-0 group-hover:bg-purple-700 transition-colors">
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-1">
          <div className="w-full border-t border-purple-100/80 dark:border-outline-variant/20"></div>
          <span className="absolute bg-white dark:bg-surface-container-low px-3 text-[10px] text-gray-400 dark:text-outline uppercase tracking-wider font-semibold">
            Or Account Sign In
          </span>
        </div>

        {/* Tab Switcher Pills */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-purple-50/70 dark:bg-surface-container/60 rounded-full border border-purple-100/80 dark:border-outline-variant/20">
          <button
            type="button"
            onClick={() => {
              setTab("login");
              setErrorMsg("");
            }}
            className={`py-1.5 text-xs font-semibold rounded-full transition-all ${
              tab === "login"
                ? "bg-white dark:bg-surface-container-high text-purple-900 dark:text-primary shadow-xs"
                : "text-gray-500 dark:text-on-surface-variant hover:text-gray-900 dark:hover:text-on-surface"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("register");
              setErrorMsg("");
            }}
            className={`py-1.5 text-xs font-semibold rounded-full transition-all ${
              tab === "register"
                ? "bg-white dark:bg-surface-container-high text-purple-900 dark:text-primary shadow-xs"
                : "text-gray-500 dark:text-on-surface-variant hover:text-gray-900 dark:hover:text-on-surface"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-error-container/30 border border-rose-200 dark:border-error/30 text-rose-700 dark:text-error flex items-start gap-2 text-xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {tab === "register" && (
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-on-surface-variant mb-1">
                Display Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-purple-50/50 dark:bg-surface-container/60 border border-purple-100 dark:border-outline-variant/30 text-gray-800 dark:text-on-surface text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-300 dark:focus:ring-primary transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-on-surface-variant mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-purple-50/50 dark:bg-surface-container/60 border border-purple-100 dark:border-outline-variant/30 text-gray-800 dark:text-on-surface text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-300 dark:focus:ring-primary transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-on-surface-variant mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={tab === "register" ? "At least 6 characters" : "••••••••"}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-purple-50/50 dark:bg-surface-container/60 border border-purple-100 dark:border-outline-variant/30 text-gray-800 dark:text-on-surface text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-300 dark:focus:ring-primary transition-all"
              />
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold text-sm shadow-md shadow-purple-500/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : tab === "login" ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In to Workspace</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Isolated Profile</span>
              </>
            )}
          </button>
        </form>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-purple-100/70 dark:border-outline-variant/20 flex items-center justify-between text-[11px] text-gray-500 dark:text-outline">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Isolated conversational memory</span>
          </span>
          <span>Neon PostgreSQL</span>
        </div>
      </div>
    </div>
  );
}
