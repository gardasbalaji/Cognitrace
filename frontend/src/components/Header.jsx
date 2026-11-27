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
    <header className="h-16 border-b border-[#E2E7DD] bg-[#DEE8DC]/95 backdrop-blur-md flex items-center justify-between px-8 z-10 shrink-0">

      {/* Page Title */}
      <div>
        <h2 className="font-outfit font-bold text-lg text-[#26332A] tracking-tight">
          {title}
        </h2>
      </div>

      <div className="flex items-center gap-6">

        {/* API Connection Indicator */}
        <div
          onClick={checkHealth}
          className="flex items-center cursor-pointer select-none transition-all"
          title="Click to check connection status"
        >
          {apiStatus === 'checking' && (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EFF1E7] border border-[#D9E1D2]">
              <RefreshCw className="h-3 w-3 animate-spin text-[#879187]" />
              <span className="text-xs text-[#68766B] font-medium">
                Checking API...
              </span>
            </div>
          )}

          {apiStatus === 'online' && (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#DCE8DC] text-[#264B39] border border-[#D9E1D2]">
              <span className="h-2 w-2 rounded-full bg-[#315C46] animate-pulse"></span>
              <span>API Connected</span>
            </div>
          )}

          {apiStatus === 'offline' && (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#EFF1E7] border border-[#D9E1D2] text-[#879187]">
              <span className="h-2 w-2 rounded-full bg-amber-500"></span>
              <span>API Offline (Mock Mode)</span>
            </div>
          )}
        </div>

        {/* Notifications */}
        <button className="relative p-2 text-[#68766B] hover:text-[#26332A] transition-colors bg-[#E2E8D8] hover:bg-[#E8EDE1] rounded-full border border-[#D9E1D2] cursor-pointer" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[#315C46]"></span>
        </button>

        {/* User Card */}
        <div className="flex items-center gap-3 pl-4 border-l border-[#E2E7DD]">

          {/* User Initials */}
          <div className="h-8 w-8 rounded-full bg-[#315C46] border border-[#264B39] flex items-center justify-center font-bold text-xs text-white select-none">
            {getInitials(displayName)}
          </div>

          {/* User Information */}
          <div className="hidden md:block">
            <p className="text-xs font-bold text-[#26332A]">
              {displayName}
            </p>

            <p className="text-[10px] text-[#68766B] font-medium">
              {displayRoleSubtitle}
            </p>
          </div>
        </div>

      </div>
    </header>
  );
}