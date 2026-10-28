import React, { useState, useEffect } from 'react';
import { Bell, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Header({ title, mode }) {
  const { user } = useAuth();
  const [apiStatus, setApiStatus] = useState('checking');

  const checkHealth = async () => {
    setApiStatus('checking');

    try {
      const res = await fetch('/api/health');

      if (res.ok) {
        setApiStatus('online');
      } else {
        setApiStatus('offline');
      }
    } catch {
      setApiStatus('offline');
    }
  };

  useEffect(() => {
    checkHealth();

    // Check health every 15 seconds
    const interval = setInterval(checkHealth, 15000);

    return () => clearInterval(interval);
  }, []);

  // Generate initials from user's full name
  const getInitials = (name) => {
    if (!name || typeof name !== 'string') {
      return mode === 'student' ? 'ST' : 'FC';
    }

    const words = name.trim().split(/\s+/).filter(Boolean);

    if (words.length === 0) {
      return mode === 'student' ? 'ST' : 'FC';
    }

    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }

    return (
      words[0].charAt(0) +
      words[words.length - 1].charAt(0)
    ).toUpperCase();
  };

  const displayName = user?.full_name || (mode === 'student' ? 'Student' : 'Faculty Member');
  const displayRoleSubtitle = mode === 'student'
    ? (user?.course || 'Student')
    : (user?.designation || user?.department || 'Faculty');

  return (
    <header className="h-16 border-b border-slate-800/80 bg-brand-950/60 backdrop-blur-md flex items-center justify-between px-8 z-10 shrink-0">

      {/* Page Title */}
      <div>
        <h2 className="font-outfit font-semibold text-lg text-white tracking-tight">
          {title}
        </h2>
      </div>

      <div className="flex items-center gap-6">

        {/* API Connection Indicator */}
        <div
          onClick={checkHealth}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-900/60 border border-slate-800/80 cursor-pointer hover:bg-brand-900/90 transition-all select-none"
          title="Click to check connection status"
        >
          {apiStatus === 'checking' && (
            <>
              <RefreshCw className="h-3 w-3 animate-spin text-primary-400" />
              <span className="text-xs text-slate-400 font-medium">
                Checking API...
              </span>
            </>
          )}

          {apiStatus === 'online' && (
            <>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs text-emerald-400 font-medium">
                API Connected
              </span>
            </>
          )}

          {apiStatus === 'offline' && (
            <>
              <span className="h-2 w-2 rounded-full bg-amber-500"></span>
              <span className="text-xs text-amber-400 font-medium">
                API Offline (Mock Mode)
              </span>
            </>
          )}
        </div>

        {/* Notifications */}
        <button className="relative p-2 text-slate-400 hover:text-white transition-colors bg-brand-900/40 rounded-full border border-slate-800/60" aria-label="Notifications">
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary-500"></span>
        </button>

        {/* User Card */}
        <div className="flex items-center gap-3 pl-4 border-l border-slate-800/60">

          {/* User Initials */}
          <div className="h-8 w-8 rounded-full bg-primary-600/30 border border-primary-500/40 flex items-center justify-center font-bold text-sm text-primary-400 select-none">
            {getInitials(displayName)}
          </div>

          {/* User Information */}
          <div className="hidden md:block">
            <p className="text-xs font-semibold text-slate-200">
              {displayName}
            </p>

            <p className="text-[10px] text-slate-400">
              {displayRoleSubtitle}
            </p>
          </div>
        </div>

      </div>
    </header>
  );
}