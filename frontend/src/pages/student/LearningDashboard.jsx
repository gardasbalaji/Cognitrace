
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Award,
  AlertTriangle,
  Play,
  Sparkles,
  Clock,
  Percent,
  AlertCircle,
} from 'lucide-react';
import { studentAPI } from '../../services/api';
import Chatbot from '../../components/Chatbot';

export default function LearningDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studentName, setStudentName] = useState('');

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Retrieve student name from storage
    const savedStudentDetails = localStorage.getItem('studentDetails');

    if (savedStudentDetails) {
      try {
        const parsed = JSON.parse(savedStudentDetails);
        if (parsed.name) setStudentName(parsed.name);
      } catch (err) {
        console.error('Failed to parse student details:', err);
      }
    }

    const savedName = localStorage.getItem('studentName');
    if (savedName) setStudentName(savedName);

    try {
      const result = await studentAPI.getDashboard();
      setData(result);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setData(null);
      setError(
        err?.message ||
          'Unable to connect to the learning analytics service.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-t-primary-500 border-slate-800 animate-spin"></div>
          <span className="text-slate-400 text-sm font-medium">
            Loading Dashboard Data...
          </span>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex-1 p-8 overflow-y-auto flex items-center justify-center">
        <div className="glass-panel rounded-2xl p-8 max-w-md w-full border-rose-900/30 bg-rose-950/10 text-center space-y-4">
          <AlertCircle className="h-10 w-10 text-rose-400 mx-auto" />
          <h4 className="font-outfit font-bold text-lg text-white">
            Dashboard Unavailable
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold transition-all"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const weeklyHours =
    Array.isArray(data?.weekly_hours) && data.weekly_hours.length === 7
      ? data.weekly_hours
      : [0, 0, 0, 0, 0, 0, 0];

  const maxHours = Math.max(...weeklyHours, 1);
  const chartHeight = 120;
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const strongTopics = Array.isArray(data?.strong_topics)
    ? data.strong_topics
    : [];
  const weakTopics = Array.isArray(data?.weak_topics)
    ? data.weak_topics
    : [];
  const recentActivity = Array.isArray(data?.recent_activity)
    ? data.recent_activity
    : [];
  const recommendedTopics = Array.isArray(data?.recommended_topics)
    ? data.recommended_topics
    : [];

  return (
    <>
      <div className="flex-1 p-8 overflow-y-auto space-y-8 max-w-6xl mx-auto">
        {/* Welcome Banner */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden border-primary-500/20">
          <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-primary-500/10 to-transparent"></div>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary-600/20 border border-primary-500/30 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary-400" />
            </div>
            <div>
              <h3 className="font-outfit font-bold text-xl text-white">
                Welcome back, {studentName || data?.student_name || 'Student'}!
              </h3>
              <p className="text-sm text-slate-400 mt-0.5">
                Review your course progress, video watchtime, and personalized learning metrics.
              </p>
            </div>
          </div>
        </div>

        {/* KPI Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Progress Card */}
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Course Progress
              </span>
              <BookOpen className="h-5 w-5 text-primary-400" />
            </div>
            <p className="text-3xl font-bold font-outfit text-white">
              {data?.overall_progress ?? 0}%
            </p>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-primary-500 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(0, data?.overall_progress ?? 0))}%`,
                }}
              ></div>
            </div>
          </div>

          {/* Weekly Hours Card */}
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Hours Engaged
              </span>
              <Clock className="h-5 w-5 text-accent-400" />
            </div>
            <p className="text-3xl font-bold font-outfit text-white">
              {weeklyHours.reduce((a, b) => a + b, 0).toFixed(1)} hrs
            </p>
            <p className="text-[10px] text-slate-500 mt-2">
              Active video session watchtime this week
            </p>
          </div>

          {/* Average Engagement Card */}
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Engagement Index
              </span>
              <Percent className="h-5 w-5 text-emerald-400" />
            </div>
            <p className="text-3xl font-bold font-outfit text-white">
              {data?.average_engagement ?? 0}%
            </p>
            <p className="text-[10px] text-emerald-400/90 font-medium mt-2">
              Calculated from interaction telemetry
            </p>
          </div>

          {/* Completed Lectures Card */}
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Lecture Progress
              </span>
              <Award className="h-5 w-5 text-amber-400" />
            </div>
            <p className="text-3xl font-bold font-outfit text-white">
              {data?.completed_lectures ?? 0} / {data?.total_lectures ?? 0}
            </p>
            <p className="text-[10px] text-slate-500 mt-2">
              Completed quiz assessments
            </p>
          </div>
        </div>

        {/* Main Grid: Chart & Recommended Topics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Study Hours Chart */}
          <div className="glass-panel rounded-2xl p-6 lg:col-span-2">
            <h4 className="font-outfit font-semibold text-sm text-white mb-6 uppercase tracking-wider">
              Weekly Video Watchtime
            </h4>
            <div className="flex items-end justify-center gap-6 h-36 border-b border-slate-800/60 pb-2">
              {weeklyHours.map((hours, i) => {
                const height = (hours / maxHours) * chartHeight;

                return (
                  <div
                    key={i}
                    className="flex flex-col items-center gap-2 group cursor-pointer"
                  >
                    <span className="text-[10px] font-semibold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      {Number(hours).toFixed(1)}h
                    </span>
                    <div
                      className="bg-primary-500/30 border border-primary-500/40 w-8 rounded-t-md hover:bg-primary-500 transition-all duration-300"
                      style={{ height: `${Math.max(4, height)}px` }}
                    ></div>
                    <span className="text-xs text-slate-500 font-semibold">
                      {days[i]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recommended Topics */}
          <div className="glass-panel rounded-2xl p-6">
            <h4 className="font-outfit font-semibold text-sm text-white mb-6 uppercase tracking-wider">
              AI Suggested Tasks
            </h4>
            {recommendedTopics.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs italic">
                Watch lectures and take quizzes to receive personalized AI recommendations.
              </div>
            ) : (
              <div className="space-y-4">
                {recommendedTopics.map((rec, i) => (
                  <div
                    key={i}
                    className="p-4 bg-brand-950/40 rounded-xl border border-slate-850 flex gap-3"
                  >
                    <Sparkles className="h-5 w-5 text-primary-400 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-xs font-semibold text-white">
                        {rec.topic}
                      </h5>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        {rec.reason}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Topic Mastery Lists */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Strong Topics */}
          <div className="glass-panel rounded-2xl p-6">
            <h4 className="font-outfit font-semibold text-sm text-white mb-6 uppercase tracking-wider flex items-center gap-2">
              <Award className="h-4 w-4 text-emerald-400" />
              Topic Strengths (Mastery &gt; 80%)
            </h4>
            {strongTopics.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4">
                No verified strong topics recorded yet.
              </p>
            ) : (
              <div className="space-y-4">
                {strongTopics.map((topic, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-350">{topic.topic}</span>
                      <span className="text-emerald-400 font-bold">
                        {topic.mastery}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full"
                        style={{ width: `${topic.mastery}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Weak Topics */}
          <div className="glass-panel rounded-2xl p-6">
            <h4 className="font-outfit font-semibold text-sm text-white mb-6 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              Focus Needed (Mastery &lt; 65%)
            </h4>
            {weakTopics.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4">
                No weak topics requiring urgent revision.
              </p>
            ) : (
              <div className="space-y-4">
                {weakTopics.map((topic, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-350">{topic.topic}</span>
                      <span className="text-amber-400 font-bold">
                        {topic.mastery}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full"
                        style={{ width: `${topic.mastery}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Lectures Watched */}
        <div className="glass-panel rounded-2xl p-6">
          <h4 className="font-outfit font-semibold text-sm text-white mb-6 uppercase tracking-wider">
            Recent Activity
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="pb-3">Lecture Title</th>
                  <th className="pb-3">Watch Progress</th>
                  <th className="pb-3">Last Watched</th>
                  <th className="pb-3 text-right">Resume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {recentActivity.length === 0 ? (
                  <tr>
                    <td
                      colSpan="4"
                      className="py-8 text-center text-slate-500 italic"
                    >
                      No learning activity yet. Watch a lecture to start tracking progress.
                    </td>
                  </tr>
                ) : (
                  recentActivity.map((act, i) => (
                    <tr key={act.id || i} className="text-slate-300">
                      <td className="py-4 font-semibold text-slate-200">
                        {act.title}
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2.5 max-w-[150px]">
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-primary-500 h-full rounded-full"
                              style={{ width: `${act.progress || 0}%` }}
                            ></div>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400">
                            {act.progress || 0}%
                          </span>
                        </div>
                      </td>
                      <td className="py-4 text-slate-400">
                        {act.last_watched || 'Recently'}
                      </td>
                      <td className="py-4 text-right">
                        <button
                          onClick={() =>
                            navigate(`/student/session?play=${act.id}`)
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600/10 border border-primary-500/20 text-primary-400 hover:bg-primary-600 hover:text-white transition-all font-semibold"
                        >
                          <Play className="h-3 w-3 fill-current" /> Resume
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Student AI Chatbot */}
      <Chatbot />
    </>
  );
}
