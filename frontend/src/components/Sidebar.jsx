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
    <aside className="w-64 bg-[#EFF1E7] border-r border-[#E2E7DD] min-h-screen flex flex-col z-10 shrink-0">

      {/* Brand Header */}
      <div className="p-6 border-b border-[#E2E7DD] flex items-center gap-3">
        <GraduationCap className="h-7 w-7 text-[#315C46]" />

        <div>
          <h1 className="font-outfit font-extrabold text-lg leading-tight tracking-tight text-[#26332A]">
            Cogni<span className="text-[#315C46]">Trace</span>
          </h1>

          <span className="text-[10px] text-[#315C46] font-bold tracking-wider uppercase">
            Analytics Shell
          </span>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
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
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                isActive
                  ? 'bg-[#315C46] text-[#FFFFFF] shadow-sm'
                  : 'text-[#68766B] hover:text-[#26332A] hover:bg-[#E8EDE1]'
              }`}
            >
              <Icon
                className={`h-4 w-4 ${
                  isActive
                    ? 'text-[#FFFFFF]'
                    : 'text-[#6F9279]'
                }`}
              />

              <span>{link.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-[#E2E7DD] space-y-2">

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-xs font-bold text-[#315C46] hover:text-rose-700 transition-colors bg-[#E2E8D8] hover:bg-[#E8EDE1] rounded-xl border border-[#D9E1D2] cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          Logout
        </button>

        {/* Logged-in User Identity */}
        <div className="px-3 py-1.5 text-[10px] text-[#879187] font-medium truncate">
          Logged in as:{' '}
          <span className="text-[#26332A] font-bold truncate block">
            {displayName}
          </span>
        </div>

      </div>
    </aside>
  );
}
