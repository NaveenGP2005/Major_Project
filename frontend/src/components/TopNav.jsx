import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Plus,
  Radio,
  User,
  LogOut,
  UserCheck,
  ChevronDown,
  LogIn,
  Sun,
  Moon,
  Trash2,
  PanelLeft,
} from "lucide-react";

export default function TopNav({
  memoryCount = 0,
  onClearMemories,
  currentUser = null,
  onOpenAuthModal,
  onLogout,
  onToggleDrawer,
  isDrawerOpen = false,
  isDarkMode = false,
  onToggleTheme,
  onToggleSidebar,
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
    <header className="w-full px-4 sm:px-6 py-3 flex-shrink-0 flex items-center justify-between sticky top-0 z-30 bg-white/80 dark:bg-surface-container-lowest/80 backdrop-blur-xl border-b border-purple-100/70 dark:border-outline-variant/20 shadow-xs transition-colors select-none">
      {/* Left: Sidebar Toggle & Brand */}
      <div className="flex items-center space-x-3">
        {/* Toggle Left Sessions Sidebar */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-1.5 rounded-xl hover:bg-purple-50 dark:hover:bg-surface-container text-gray-500 hover:text-gray-900 dark:hover:text-on-surface transition-colors cursor-pointer"
            title="Toggle Sessions Sidebar"
          >
            <PanelLeft className="w-5 h-5" />
          </button>
        )}

        {/* Brand & Serene Pulse Core */}
        <div className="flex items-center space-x-2.5">
          <div className="relative flex items-center justify-center w-8 h-8">
            <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-400 shadow-md shadow-purple-500/40 animate-pulse"></div>
            <div className="absolute inset-0 rounded-full border border-purple-300/40 animate-ping opacity-25"></div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-serif text-2xl font-semibold tracking-tight text-gray-900 dark:text-on-surface">
              Echo
            </span>
            <span className="text-[10px] uppercase tracking-widest text-purple-700 dark:text-primary font-bold px-2 py-0.5 bg-purple-50 dark:bg-primary-container/20 rounded-full border border-purple-200/50 dark:border-primary/30">
              Luminous
            </span>
          </div>
        </div>
      </div>

      {/* Right Side: On-Demand Memory Drawer Trigger & Profile */}
      <div className="flex items-center space-x-2.5">
        {/* On-Demand Living Memory Drawer Trigger Pill */}
        <button
          onClick={onToggleDrawer}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer shadow-xs active:scale-95 ${
            isDrawerOpen
              ? "bg-purple-600 text-white shadow-purple-500/25"
              : "bg-white/80 dark:bg-surface-container text-purple-900 dark:text-primary border border-purple-200/80 dark:border-outline-variant/40 hover:bg-purple-50 dark:hover:bg-surface-container-high"
          }`}
          title="Touch to reveal Living Memory Drawer"
        >
          <span className="font-serif text-sm">✦</span>
          <span>Living Memory</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              isDrawerOpen
                ? "bg-white/20 text-white"
                : "bg-purple-100 dark:bg-primary/20 text-purple-700 dark:text-primary"
            }`}
          >
            {memoryCount}
          </span>
        </button>

        {/* Theme Mode Toggle (Luminous Light ↔ Obsidian Dark) */}
        <button
          onClick={onToggleTheme}
          className="w-8 h-8 rounded-full bg-white/80 dark:bg-surface-container hover:bg-purple-50 dark:hover:bg-surface-container-high border border-purple-100 dark:border-outline-variant/30 flex items-center justify-center text-gray-500 dark:text-on-surface-variant hover:text-purple-700 dark:hover:text-primary transition-all shadow-xs"
          title={isDarkMode ? "Switch to Luminous Light Mode" : "Switch to Obsidian Dark Mode"}
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-purple-600" />}
        </button>

        {/* Clear Buffer Action */}
        <button
          onClick={onClearMemories}
          className="w-8 h-8 rounded-full hover:bg-rose-50 dark:hover:bg-error-container/20 text-gray-400 hover:text-rose-500 transition-colors flex items-center justify-center"
          title="Reset / Clear all active memories for current user"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        <div className="h-5 w-px bg-purple-100 dark:bg-outline-variant/30"></div>

        {/* User Profile Pill */}
        {currentUser ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center space-x-2 p-1 pr-2 rounded-full hover:bg-white/90 dark:hover:bg-surface-container-high transition-all cursor-pointer group"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                {getInitials(currentUser.display_name)}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-semibold text-gray-800 dark:text-on-surface leading-tight">
                  {currentUser.display_name || "User"}
                </p>
              </div>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>

            {/* Profile Dropdown */}
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white/95 dark:bg-surface-container-low/95 border border-purple-100 dark:border-outline-variant/30 rounded-2xl p-2 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="p-3 border-b border-purple-100/80 dark:border-outline-variant/20 mb-1">
                  <p className="text-xs font-bold text-gray-900 dark:text-on-surface">
                    {currentUser.display_name}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-on-surface-variant truncate">
                    {currentUser.email}
                  </p>
                  <span className="inline-flex items-center gap-1 mt-1 text-[10px] px-2 py-0.5 rounded-full bg-purple-100/80 dark:bg-primary/20 text-purple-700 dark:text-primary font-medium">
                    <UserCheck className="w-3 h-3" />
                    Isolated Memory Active
                  </span>
                </div>

                <button
                  onClick={() => {
                    setProfileOpen(false);
                    onOpenAuthModal();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-on-surface hover:bg-purple-50 dark:hover:bg-surface-container-high rounded-xl transition-colors text-left"
                >
                  <User className="w-3.5 h-3.5 text-purple-600 dark:text-primary" />
                  <span>Switch Account / Sign In</span>
                </button>

                <button
                  onClick={() => {
                    setProfileOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-error-container/20 rounded-xl transition-colors text-left"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenAuthModal}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}
