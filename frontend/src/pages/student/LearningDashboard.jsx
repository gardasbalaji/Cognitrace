
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
      <div className="flex-1 flex items-center justify-center p-8 bg-[#F8F8F2] text-[#68766B]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-t-[#315C46] border-[#D9E1D2] animate-spin"></div>
          <span className="text-[#68766B] text-sm font-medium">
            Loading Dashboard Data...
          </span>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex-1 p-8 overflow-y-auto flex items-center justify-center bg-[#F8F8F2]">
        <div className="bg-rose-50 rounded-3xl p-8 max-w-md w-full border border-rose-200 text-center space-y-4">
          <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
          <h4 className="font-outfit font-bold text-lg text-rose-800">
            Dashboard Unavailable
          </h4>
          <p className="text-xs text-rose-700 leading-relaxed">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="px-5 py-2.5 bg-[#315C46] hover:bg-[#264B39] text-[#26332A] rounded-full text-xs font-bold transition-all"
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
      <div className="flex-1 p-8 overflow-y-auto space-y-8 max-w-6xl mx-auto bg-[#F8F8F2] text-[#26332A]">
        {/* Welcome Banner */}
        <div className="bg-[#FCFCF8] border border-[#D9E1D2] rounded-3xl p-6 relative overflow-hidden shadow-sm">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-[#FCFCF8] border border-[#D9E1D2] flex items-center justify-center shadow-sm">
              <Sparkles className="h-6 w-6 text-[#315C46]" />
            </div>
            <div>
              <h3 className="font-outfit font-extrabold text-2xl text-black">
                Welcome back, {studentName || data?.student_name || 'Student'}!
              </h3>
              <p className="text-sm text-black/80 mt-0.5 font-medium">
                Review your course progress, video watchtime, and personalized learning metrics.
              </p>
            </div>
          </div>
        </div>

        {/* KPI Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Progress Card */}
          <div className="bg-[#FCFCF8] border border-[#D9E1D2] rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-extrabold text-black uppercase tracking-wider">
                Course Progress
              </span>
              <BookOpen className="h-5 w-5 text-[#315C46]" />
            </div>
            <p className="text-3xl font-extrabold font-outfit text-black">
              {data?.overall_progress ?? 0}%
            </p>
            <div className="w-full bg-[#E6ECE0] border border-[#D9E1D2]/60 h-2.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-[#315C46] h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(0, data?.overall_progress ?? 0))}%`,
                }}
              ></div>
            </div>
          </div>

          {/* Weekly Hours Card */}
          <div className="bg-[#FCFCF8] border border-[#D9E1D2] rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-extrabold text-black uppercase tracking-wider">
                Hours Engaged
              </span>
              <Clock className="h-5 w-5 text-[#315C46]" />
            </div>
            <p className="text-3xl font-extrabold font-outfit text-black">
              {weeklyHours.reduce((a, b) => a + b, 0).toFixed(1)} hrs
            </p>
            <p className="text-[11px] text-black/80 mt-2 font-medium">
              Active video session watchtime this week
            </p>
          </div>

          {/* Average Engagement Card */}
          <div className="bg-[#FCFCF8] border border-[#D9E1D2] rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-extrabold text-black uppercase tracking-wider">
                Engagement Index
              </span>
              <Percent className="h-5 w-5 text-[#315C46]" />
            </div>
            <p className="text-3xl font-extrabold font-outfit text-black">
              {data?.average_engagement ?? 0}%
            </p>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E8EDE1] text-black border border-[#D9E1D2] mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#315C46] animate-pulse" />
              Calculated from interaction telemetry
            </span>
          </div>

          {/* Completed Lectures Card */}
          <div className="bg-[#FCFCF8] border border-[#D9E1D2] rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-extrabold text-black uppercase tracking-wider">
                Lecture Progress
              </span>
              <Award className="h-5 w-5 text-amber-600" />
            </div>
            <p className="text-3xl font-extrabold font-outfit text-black">
              {data?.completed_lectures ?? 0} / {data?.total_lectures ?? 0}
            </p>
            <p className="text-[11px] text-black/80 mt-2 font-medium">
              Completed quiz assessments
            </p>
          </div>
        </div>

        {/* Main Grid: Chart & Recommended Topics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Study Hours Chart */}
          <div className="bg-[#FCFCF8] border border-[#D9E1D2] rounded-2xl p-6 lg:col-span-2 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-outfit font-extrabold text-sm text-black uppercase tracking-wider">
                Weekly Video Watchtime
              </h4>
              <span className="text-xs font-bold text-black/70">
                Daily activity overview
              </span>
            </div>
            <div className="flex items-end justify-center gap-4 sm:gap-6 h-40 border-b border-[#D9E1D2] pb-3 pt-6 px-2">
              {weeklyHours.map((hours, i) => {
                const heightPercent = maxHours > 0 ? (hours / maxHours) * 100 : 0;
                const fillPercent = hours > 0 ? Math.max(16, heightPercent) : 8;

                return (
                  <div
                    key={i}
                    className="flex flex-col items-center gap-2 group cursor-pointer flex-1 max-w-[52px]"
                  >
                    <span className="text-[11px] font-extrabold text-black">
                      {Number(hours).toFixed(1)}h
                    </span>
                    {/* Outer track pill */}
                    <div className="w-full h-28 bg-[#E6ECE0] border border-[#D9E1D2] rounded-xl flex items-end p-1 shadow-inner">
                      <div
                        className={`w-full rounded-lg transition-all duration-500 shadow-sm ${
                          hours > 0
                            ? 'bg-gradient-to-t from-[#1F4532] to-[#315C46] group-hover:brightness-110'
                            : 'bg-[#315C46]/30'
                        }`}
                        style={{ height: `${fillPercent}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-black font-extrabold px-2.5 py-0.5 rounded-md bg-[#EFF2E9] border border-[#D9E1D2] shadow-2xs">
                      {days[i]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recommended Topics */}
          <div className="bg-[#FCFCF8] border border-[#D9E1D2] rounded-2xl p-6 shadow-sm">
            <h4 className="font-outfit font-extrabold text-sm text-black mb-6 uppercase tracking-wider">
              AI Suggested Tasks
            </h4>
            {recommendedTopics.length === 0 ? (
              <div className="p-6 text-center text-black font-medium text-xs italic leading-relaxed">
                Watch lectures and take quizzes to receive personalized AI recommendations.
              </div>
            ) : (
              <div className="space-y-3">
                {recommendedTopics.map((rec, i) => (
                  <div
                    key={i}
                    className="p-3.5 bg-[#FCFCF8] rounded-xl border border-[#D9E1D2] flex gap-3 shadow-xs"
                  >
                    <Sparkles className="h-5 w-5 text-[#315C46] shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-xs font-extrabold text-black">
                        {rec.topic}
                      </h5>
                      <p className="text-[11px] text-black/85 mt-1 leading-relaxed font-medium">
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
          <div className="bg-[#FCFCF8] border border-[#D9E1D2] rounded-2xl p-6 shadow-sm">
            <h4 className="font-outfit font-extrabold text-sm text-black mb-6 uppercase tracking-wider flex items-center gap-2">
              <Award className="h-4 w-4 text-emerald-600" />
              Topic Strengths (Mastery &gt; 80%)
            </h4>
            {strongTopics.length === 0 ? (
              <p className="text-xs text-black/75 font-medium italic py-4">
                No verified strong topics recorded yet.
              </p>
            ) : (
              <div className="space-y-4">
                {strongTopics.map((topic, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-black font-bold">{topic.topic}</span>
                      <span className="text-emerald-800 font-extrabold">
                        {topic.mastery}%
                      </span>
                    </div>
                    <div className="w-full bg-[#E6ECE0] border border-[#D9E1D2]/60 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full"
                        style={{ width: `${topic.mastery}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Weak Topics */}
          <div className="bg-[#FCFCF8] border border-[#D9E1D2] rounded-2xl p-6 shadow-sm">
            <h4 className="font-outfit font-extrabold text-sm text-black mb-6 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Focus Needed (Mastery &lt; 65%)
            </h4>
            {weakTopics.length === 0 ? (
              <p className="text-xs text-black/75 font-medium italic py-4">
                No weak topics requiring urgent revision.
              </p>
            ) : (
              <div className="space-y-4">
                {weakTopics.map((topic, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-black font-bold">{topic.topic}</span>
                      <span className="text-amber-800 font-extrabold">
                        {topic.mastery}%
                      </span>
                    </div>
                    <div className="w-full bg-[#E6ECE0] border border-[#D9E1D2]/60 h-2.5 rounded-full overflow-hidden">
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
        <div className="bg-[#FCFCF8] border border-[#D9E1D2] rounded-2xl p-6 shadow-sm">
          <h4 className="font-outfit font-extrabold text-sm text-black mb-6 uppercase tracking-wider">
            Recent Activity
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#D9E1D2] text-black uppercase tracking-wider font-extrabold">
                  <th className="pb-3">Lecture Title</th>
                  <th className="pb-3">Watch Progress</th>
                  <th className="pb-3">Last Watched</th>
                  <th className="pb-3 text-right">Resume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9E1D2]">
                {recentActivity.length === 0 ? (
                  <tr>
                    <td
                      colSpan="4"
                      className="py-8 text-center text-black font-medium italic"
                    >
                      No learning activity yet. Watch a lecture to start tracking progress.
                    </td>
                  </tr>
                ) : (
                  recentActivity.map((act, i) => (
                    <tr key={act.id || i} className="text-black">
                      <td className="py-4 font-extrabold text-black">
                        {act.title}
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2.5 max-w-[150px]">
                          <div className="w-full bg-[#E6ECE0] border border-[#D9E1D2]/60 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-[#315C46] h-full rounded-full"
                              style={{ width: `${act.progress || 0}%` }}
                            ></div>
                          </div>
                          <span className="text-[10px] font-extrabold text-black">
                            {act.progress || 0}%
                          </span>
                        </div>
                      </td>
                      <td className="py-4 text-black font-semibold">
                        {act.last_watched || 'Recently'}
                      </td>
                      <td className="py-4 text-right">
                        <button
                          onClick={() =>
                            navigate(`/student/session?play=${act.id}`)
                          }
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#315C46] hover:bg-[#264B39] text-white transition-all font-bold text-xs shadow-xs cursor-pointer"
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
