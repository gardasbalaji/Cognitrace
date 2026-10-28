import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  BookOpen,
  Search,
  HelpCircle,
  Activity,
  FolderHeart,
  FileText,
  BarChart2,
  Users,
  Flame,
  Upload, Video,
  HelpCircle as QuestionIcon,
  Lightbulb,
  Compass,
  LogOut,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ mode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const studentLinks = [
    {
      name: "Learning Dashboard",
      path: "/student/dashboard",
      icon: BarChart2
    },
    {
      name: "Course Lectures",
      path: "/student/lectures",
      icon: BookOpen
    },
    {
      name: "Smart Search",
      path: "/student/search",
      icon: Search
    },
    {
      name: "Session Analysis",
      path: "/student/session",
      icon: Activity
    },
    {
      name: "AI Help Center",
      path: "/student/help-center",
      icon: HelpCircle
    },
    {
      name: "Learning Portfolio",
      path: "/student/portfolio",
      icon: FolderHeart
    },
    {
      name: "AI Summary",
      path: "/student/summary",
      icon: Compass
    },
    {
      name: "AI Revision Notes",
      path: "/student/notes",
      icon: FileText
    },
  ];

  const facultyLinks = [
    {
      name: "Faculty Dashboard",
      path: "/faculty/dashboard",
      icon: BookOpen
    },
    {
      name: "Student Risk List",
      path: "/faculty/risk",
      icon: Users
    },
    {
      name: "My Lectures",
      path: "/faculty/my-lectures",
      icon: Video
    },
    {
      name: "Upload / Import Lecture",
      path: "/faculty/lectures",
      icon: Upload
    },
    {
      name: "Lecture Comparison",
      path: "/faculty/compare",
      icon: BarChart2
    },
    {
      name: "Confusion Heatmap",
      path: "/faculty/heatmap",
      icon: Flame
    },
    {
      name: "Most Asked Questions",
      path: "/faculty/questions",
      icon: QuestionIcon
    },
    {
      name: "AI Suggestions to Improve Lecture",
      path: "/faculty/suggestions",
      icon: Lightbulb
    },
    {
      name: "Automatic Transcript Generation",
      path: "/faculty/transcript",
      icon: FileText
    },
  ];

  const links = mode === 'student' ? studentLinks : facultyLinks;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const displayName = user?.full_name || (mode === 'student' ? 'Student' : 'Faculty Member');

  return (
    <aside className="w-64 glass-panel border-r border-slate-800/80 min-h-screen flex flex-col z-10 shrink-0">

      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800/60 flex items-center gap-3">
        <GraduationCap className="h-8 w-8 text-primary-500" />

        <div>
          <h1 className="font-outfit font-bold text-lg leading-tight tracking-tight text-white">
            CogniTrace
          </h1>

          <span className="text-[10px] text-primary-400 font-semibold tracking-wider uppercase">
            Analytics Shell
          </span>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.path ||(
            link.path === '/faculty/lectures' &&
            location.pathname.startsWith('/faculty/lectures')
          );

          return (
            <NavLink
              key={link.path}
              to={link.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-brand-900/60'
                }`}
            >
              <Icon
                className={`h-4.5 w-4.5 ${isActive
                    ? 'text-white'
                    : 'text-slate-400 group-hover:text-white'
                  }`}
              />

              <span>{link.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-slate-800/60 space-y-2">

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2.5 text-xs font-semibold text-slate-400 hover:text-rose-400 transition-colors bg-brand-950/40 rounded-lg border border-slate-800/60 hover:border-rose-900/40"
        >
          <LogOut className="h-3.5 w-3.5" />
          Logout
        </button>

        {/* Logged-in User Identity */}
        <div className="px-3 py-2 text-[10px] text-slate-500 font-medium truncate">
          Logged in as:{' '}
          <span className="text-slate-300 font-semibold truncate block">
            {displayName}
          </span>
        </div>

      </div>
    </aside>
  );
}
