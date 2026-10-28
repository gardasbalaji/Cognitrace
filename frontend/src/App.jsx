import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { useAuth } from './context/AuthContext';

// Student Pages
import LearningDashboard from './pages/student/LearningDashboard';
import Lectures from './pages/student/Lectures';
import SmartSearch from './pages/student/SmartSearch';
import SessionAnalysis from './pages/student/SessionAnalysis';
import AIHelpCenter from './pages/student/AIHelpCenter';
import LearningPortfolio from './pages/student/LearningPortfolio';
import AISummary from './pages/student/AISummary';
import AIRevisionNotes from './pages/student/AIRevisionNotes';

// Faculty Pages
import FacultyDashboard from './pages/faculty/FacultyDashboard';
import StudentRiskList from './pages/faculty/StudentRiskList';
import LectureComparison from './pages/faculty/LectureComparison';
import ConfusionHeatmap from './pages/faculty/ConfusionHeatmap';
import Questions from './pages/faculty/Questions';
import Suggestions from './pages/faculty/Suggestions';
import Transcript from './pages/faculty/Transcript';
import LectureAnalyticsPlaceholder from './pages/faculty/LectureAnalyticsPlaceholder';
import StudentAnalyticsPlaceholder from './pages/faculty/StudentAnalyticsPlaceholder';
import FacultyLectures from './pages/faculty/FacultyLectures';
import MyLectures from './pages/faculty/MyLectures';

function StudentLayout() {
  const location = useLocation();
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-brand-950 text-slate-400">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent"></div>
          <span className="text-sm font-medium">Restoring student session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'student') {
    return <Navigate to="/signin" replace />;
  }

  const getTitle = (path) => {
    if (path.includes('/student/dashboard')) return "Learning Dashboard";
    if (path.includes('/student/lectures')) return "Course Lectures";
    if (path.includes('/student/search')) return "Smart Search";
    if (path.includes('/student/session')) return "Session Analysis";
    if (path.includes('/student/help-center')) return "AI Help Center";
    if (path.includes('/student/portfolio')) return "Learning Portfolio";
    if (path.includes('/student/summary')) return "AI Summary";
    if (path.includes('/student/notes')) return "AI Revision Notes";
    
    return "Student Portal";
  };

  return (
    <div className="flex h-screen overflow-hidden bg-brand-950">
      <Sidebar mode="student" />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={getTitle(location.pathname)} mode="student" />
        <main className="flex-1 overflow-hidden flex flex-col bg-brand-950">
          <Routes>
            <Route path="dashboard" element={<LearningDashboard />} />
            <Route path="lectures" element={<Lectures />} />
            <Route path="search" element={<SmartSearch />} />
            <Route path="session" element={<SessionAnalysis />} />
            <Route path="help-center" element={<AIHelpCenter />} />
            <Route path="portfolio" element={<LearningPortfolio />} />
            <Route path="summary" element={<AISummary />} />
            <Route path="summary/:lectureId" element={<AISummary />} />
            <Route path="notes" element={<AIRevisionNotes />} />
            <Route path="notes/:lectureId" element={<AIRevisionNotes />} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function FacultyLayout() {
  const location = useLocation();
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-brand-950 text-slate-400">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent"></div>
          <span className="text-sm font-medium">Restoring faculty session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'faculty') {
    return <Navigate to="/signin" replace />;
  }

  const getTitle = (path) => {
    if (path.includes('/faculty/dashboard')) return "Faculty Dashboard";
    if (path.includes('/faculty/risk')) return "Student Risk List";
    if (path.includes('/faculty/compare')) return "Lecture Comparison";
    if (path.includes('/faculty/heatmap')) return "Confusion Heatmap";
    if (path.includes('/faculty/questions')) return "Most Asked Questions";
    if (path.includes('/faculty/suggestions')) return "AI Suggestions to Improve Lecture";
    if (path.includes('/faculty/transcript')) return "Automatic Transcript Generation";
    if (path.includes('/faculty/lecture/')) return "Lecture Analytics";
    if (path.includes('/faculty/student/')) return "Student Analytics";
    if (path.includes('/faculty/lectures')) return 'Upload / Import Lecture';
    if (path.includes('/faculty/my-lectures')) return 'My Lectures';
    return "Faculty Portal";
  };

  return (
    <div className="flex h-screen overflow-hidden bg-brand-950">
      <Sidebar mode="faculty" />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={getTitle(location.pathname)} mode="faculty" />
        <main className="flex-1 overflow-hidden flex flex-col bg-brand-950">
          <Routes>
            <Route path="dashboard" element={<FacultyDashboard />} />
            <Route path="risk" element={<StudentRiskList />} />
            <Route path="compare" element={<LectureComparison />} />
            <Route path="heatmap" element={<ConfusionHeatmap />} />
            <Route path="questions" element={<Questions />} />
            <Route path="suggestions" element={<Suggestions />} />
            <Route path="transcript" element={<Transcript />} />
            <Route path="transcript/:lectureId" element={<Transcript />} />
            <Route path="lectures" element={<FacultyLectures />} />
            <Route path="my-lectures" element={<MyLectures />} />
            <Route path="lecture/:lectureId" element={<LectureAnalyticsPlaceholder />} />
            <Route path="student/:studentId" element={<StudentAnalyticsPlaceholder />} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<SignIn />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/student/*" element={<StudentLayout />} />
      <Route path="/faculty/*" element={<FacultyLayout />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
