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
  Radio,
  Sparkles,
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
      setErrorMsg(err.message || "Authentication failed. Please try again.");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-container-lowest/80 backdrop-blur-md transition-all animate-in fade-in duration-200">
      {/* Ambient background bloom */}
      <div className="absolute w-[450px] h-[450px] rounded-full bg-primary-container/20 blur-[120px] pointer-events-none"></div>

      <div className="relative w-full max-w-md bg-surface-container-low/95 border border-outline-variant/30 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl text-on-surface overflow-hidden">
        {/* Subtle top edge highlight */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-secondary via-primary to-tertiary"></div>

        {/* Close Button (if dismissible) */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-outline hover:text-on-surface hover:bg-surface-container-high transition-all"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-tr from-secondary-container via-primary-container to-tertiary shadow-md shadow-secondary/20">
            <Radio className="w-5 h-5 text-surface font-bold animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-title-lg font-bold text-on-surface tracking-tight">Echo</span>
              <span className="text-label-sm text-outline px-1.5 py-0.5 rounded bg-surface-container border border-outline-variant/30">
                v3.2
              </span>
            </div>
            <p className="text-body-sm text-on-surface-variant">Adaptive Lifecycle Memory Engine</p>
          </div>
        </div>

        {/* Academic 1-Click Evaluation Quick Action */}
        <div className="mb-6">
          <button
            type="button"
            onClick={handleDemoAccess}
            disabled={loading}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-secondary/15 via-primary-container/20 to-tertiary/15 border border-secondary/30 hover:border-secondary/60 hover:shadow-lg hover:shadow-secondary/10 transition-all text-left group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-secondary/20 flex items-center justify-center text-secondary font-bold group-hover:scale-105 transition-transform">
                <Zap className="w-5 h-5 fill-secondary/20" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-body-md font-semibold text-on-surface">Continue as Alex M.</span>
                  <span className="text-label-sm px-1.5 py-0.2 rounded bg-secondary/20 text-secondary font-mono">
                    Evaluation Preset
                  </span>
                </div>
                <p className="text-label-sm text-on-surface-variant">
                  GATE Aspirant • Pre-seeded cross-session memories
                </p>
              </div>
            </div>
            <Sparkles className="w-4 h-4 text-secondary group-hover:rotate-12 transition-transform mr-1" />
          </button>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-5">
          <div className="w-full border-t border-outline-variant/20"></div>
          <span className="absolute bg-surface-container-low px-3 text-label-sm text-outline uppercase tracking-wider font-semibold">
            Or Account Sign In
          </span>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-surface-container/60 rounded-xl mb-5 border border-outline-variant/20">
          <button
            type="button"
            onClick={() => {
              setTab("login");
              setErrorMsg("");
            }}
            className={`py-2 text-body-sm font-medium rounded-lg transition-all ${
              tab === "login"
                ? "bg-surface-container-high text-primary shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
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
            className={`py-2 text-body-sm font-medium rounded-lg transition-all ${
              tab === "register"
                ? "bg-surface-container-high text-primary shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-error-container/30 border border-error/30 text-error flex items-start gap-2 text-body-sm animate-in fade-in">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === "register" && (
            <div>
              <label className="block text-label-sm font-medium text-on-surface-variant mb-1">
                Display Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-body-md placeholder:text-outline/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-label-sm font-medium text-on-surface-variant mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-body-md placeholder:text-outline/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-label-sm font-medium text-on-surface-variant mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={tab === "register" ? "At least 6 characters" : "••••••••"}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-body-md placeholder:text-outline/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-primary text-on-primary font-semibold text-body-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/40 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/25 disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
            ) : tab === "login" ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In to Memory Engine</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Isolated Memory Account</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-outline-variant/20 flex items-center justify-between text-label-sm text-outline">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-secondary" />
            pgvector multi-tenant isolation
          </span>
          <span>100% $0 Free Tier</span>
        </div>
      </div>
    </div>
  );
}

