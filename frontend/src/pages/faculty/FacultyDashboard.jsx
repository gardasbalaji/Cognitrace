// frontend/src/pages/faculty/FacultyDashboard.jsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  BookOpen,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Activity
} from 'lucide-react';

export default function FacultyDashboard() {
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [lectures, setLectures] = useState([]);
  const [students, setStudents] = useState([]);

  const [selectedLectureHeatmap, setSelectedLectureHeatmap] = useState('');
  const [heatmapData, setHeatmapData] = useState(null);
  const [heatmapLoading, setHeatmapLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError('');

        const [
          dashboardResponse,
          lecturesResponse,
          studentsResponse
        ] = await Promise.all([
          fetch('/api/faculty/dashboard'),
          fetch('/api/faculty/lectures'),
          fetch('/api/faculty/student-risk')
        ]);

        if (!dashboardResponse.ok) {
          throw new Error('Failed to load faculty dashboard.');
        }

        if (!lecturesResponse.ok) {
          throw new Error('Failed to load lectures.');
        }

        if (!studentsResponse.ok) {
          throw new Error('Failed to load student data.');
        }

        const dashboardJson = await dashboardResponse.json();
        const lecturesJson = await lecturesResponse.json();
        const studentsJson = await studentsResponse.json();

        const actualLectures = Array.isArray(lecturesJson)
          ? lecturesJson
          : [];

        const actualStudents = Array.isArray(studentsJson)
          ? studentsJson
          : [];

        setDashboardData(dashboardJson || {});
        setLectures(actualLectures);
        setStudents(actualStudents);

        if (actualLectures.length > 0) {
          setSelectedLectureHeatmap(actualLectures[0].id);
        } else {
          setSelectedLectureHeatmap('');
          setHeatmapData(null);
        }
      } catch (err) {
        console.error('Faculty dashboard error:', err);

        setDashboardData({});
        setLectures([]);
        setStudents([]);
        setSelectedLectureHeatmap('');
        setHeatmapData(null);
        setError(err.message || 'Unable to load faculty dashboard.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  /*
   * Load confusion analytics separately for the selected lecture.
   *
   * This is important because the lecture list endpoint should provide
   * lecture metadata, while the confusion endpoint provides the actual
   * confusion analytics.
   */
  useEffect(() => {
    const loadHeatmap = async () => {
      if (!selectedLectureHeatmap) {
        setHeatmapData(null);
        return;
      }

      try {
        setHeatmapLoading(true);

        const response = await fetch(
          `/api/faculty/lecture/${selectedLectureHeatmap}/confusion`
        );

        if (response.status === 404) {
          setHeatmapData(null);
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to load confusion analytics.');
        }

        const data = await response.json();

        setHeatmapData(data || null);
      } catch (err) {
        console.error('Faculty heatmap error:', err);
        setHeatmapData(null);
      } finally {
        setHeatmapLoading(false);
      }
    };

    loadHeatmap();
  }, [selectedLectureHeatmap]);

  const activeHeatmapLecture =
    lectures.find(
      (lecture) => lecture.id === selectedLectureHeatmap
    ) || null;

  /*
   * The backend may return either:
   *
   * [
   *   {...},
   *   {...}
   * ]
   *
   * or:
   *
   * {
   *   heatmap: [...]
   * }
   *
   * or:
   *
   * {
   *   confusion: [...]
   * }
   *
   * Normalize all supported forms here.
   */
  const heatmapBins = Array.isArray(heatmapData)
    ? heatmapData
    : Array.isArray(heatmapData?.heatmap)
      ? heatmapData.heatmap
      : Array.isArray(heatmapData?.confusion)
        ? heatmapData.confusion
        : Array.isArray(heatmapData?.heatmap_bins)
          ? heatmapData.heatmap_bins
          : [];

  const heatmapAdvice =
    heatmapData?.ai_refactoring_advice ||
    heatmapData?.recommendation ||
    heatmapData?.advice ||
    '';

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 min-h-screen bg-[#F8F8F2]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-t-primary-500 border-[#D9E1D2] animate-spin" />

          <span className="text-[#68766B] text-sm font-medium">
            Loading Faculty Dashboard...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-8 max-w-6xl mx-auto bg-[#F8F8F2] text-[#26332A] min-h-screen">

      {/* =========================================================
          COURSE OVERVIEW
      ========================================================= */}

      <div className="glass-panel rounded-2xl p-6 relative overflow-hidden border border-[#315C46]/20 bg-[#E2E8D8]">
        <div className="absolute top-0 right-0 w-48 h-full bg-gradient-to-l from-primary-500/10 to-transparent pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">

          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-[#315C46]/10 border border-[#315C46]/20 text-[#315C46] text-[10px] font-bold uppercase tracking-wider">
              Faculty Analytics Portal
            </span>

            <h1 className="font-outfit font-bold text-xl text-[#26332A] mt-2">
              Course Overview:{' '}
              {dashboardData.course_name || 'No course data available'}
            </h1>

            <p className="text-xs text-[#68766B] mt-1">
              Instructor:{' '}
              <span className="text-[#26332A] font-semibold">
                {dashboardData.faculty_name || 'Faculty'}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/faculty/risk')}
              className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-300 text-xs font-bold transition-all flex items-center gap-2"
            >
              <ShieldAlert className="h-4 w-4 text-rose-400" />

              <span>
                {dashboardData.students_at_risk || 0} At Risk Students
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================
          ERROR MESSAGE
      ========================================================= */}

      {error && (
        <div className="rounded-xl border border-[#FECDD3] bg-[#FFF1F2] px-4 py-3 text-sm text-[#BE123C]">
          {error}
        </div>
      )}

      {/* =========================================================
          KPI STATS
      ========================================================= */}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">

        <div className="glass-panel rounded-xl p-4 border border-[#D9E1D2] bg-[#E2E8D8]">
          <span className="text-[10px] font-extrabold text-black uppercase tracking-wider block">
            Total Enrolled
          </span>

          <p className="text-2xl font-extrabold text-black mt-1">
            {dashboardData.total_students || 0}
          </p>
        </div>

        <div className="glass-panel rounded-xl p-4 border border-[#D9E1D2] bg-[#E2E8D8]">
          <span className="text-[10px] font-extrabold text-black uppercase tracking-wider block">
            Active Watchers
          </span>

          <p className="text-2xl font-extrabold text-emerald-800 mt-1">
            {dashboardData.active_students || 0}
          </p>
        </div>

        <div className="glass-panel rounded-xl p-4 border border-[#D9E1D2] bg-[#E2E8D8]">
          <span className="text-[10px] font-extrabold text-black uppercase tracking-wider block">
            Lectures
          </span>

          <p className="text-2xl font-extrabold text-black mt-1">
            {lectures.length}
          </p>
        </div>

        <div className="glass-panel rounded-xl p-4 border border-[#D9E1D2] bg-[#E2E8D8]">
          <span className="text-[10px] font-extrabold text-black uppercase tracking-wider block">
            Avg Completion
          </span>

          <p className="text-2xl font-extrabold text-[#315C46] mt-1">
            {Math.round(dashboardData.avg_engagement || 0)}%
          </p>
        </div>

        <div className="glass-panel rounded-xl p-4 border border-[#D9E1D2] bg-[#E2E8D8]">
          <span className="text-[10px] font-extrabold text-black uppercase tracking-wider block">
            Avg Quiz Score
          </span>

          <p className="text-2xl font-extrabold text-black mt-1">
            {dashboardData.avg_quiz_score || 0}%
          </p>
        </div>

        <div
          onClick={() => navigate('/faculty/risk')}
          className="glass-panel rounded-xl p-4 border-l-2 border-l-rose-500 border border-[#D9E1D2] bg-[#E2E8D8] cursor-pointer hover:bg-[#E8EDE1] transition-colors"
        >
          <span className="text-[10px] font-extrabold text-rose-700 uppercase tracking-wider block">
            At Risk
          </span>

          <p className="text-2xl font-extrabold text-rose-700 mt-1">
            {dashboardData.students_at_risk || 0}
          </p>
        </div>

      </div>

      {/* =========================================================
          CONFUSION HEATMAP
      ========================================================= */}

      <div className="glass-panel rounded-2xl p-6 border border-[#D9E1D2] bg-[#E2E8D8] space-y-5">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

          <div>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-[#315C46]" />

              <h3 className="font-outfit font-bold text-base text-[#26332A]">
                Cohort Confusion Heatmap
              </h3>
            </div>

            <p className="text-xs text-[#68766B] mt-1">
              Aggregated student interaction data for the lectures you created.
            </p>
          </div>

          {lectures.length > 0 && (
            <select
              value={selectedLectureHeatmap}
              onChange={(event) =>
                setSelectedLectureHeatmap(event.target.value)
              }
              className="bg-[#FCFCF8] border border-[#D9E1D2] rounded-xl px-3 py-2 text-xs text-[#26332A] focus:outline-none focus:border-[#315C46] max-w-xs"
            >
              {lectures.map((lecture) => (
                <option
                  key={lecture.id}
                  value={lecture.id}
                >
                  {lecture.title || lecture.id}
                </option>
              ))}
            </select>
          )}

        </div>

        {lectures.length === 0 ? (

          <div className="rounded-xl border border-[#D9E1D2] bg-[#E2E8D8] p-8 text-center">
            <Activity className="h-8 w-8 text-[#68766B] mx-auto mb-3" />

            <p className="text-sm font-semibold text-[#68766B]">
              No lecture data available
            </p>

            <p className="text-xs text-[#68766B] mt-1">
              Import a lecture to start viewing confusion analytics.
            </p>
          </div>

        ) : activeHeatmapLecture ? (

          <div className="p-5 rounded-2xl bg-[#FCFCF8] border border-[#D9E1D2] space-y-4">

            <div className="flex items-center justify-between text-xs font-bold text-[#68766B]">
              <span>
                {activeHeatmapLecture.title || 'Untitled Lecture'}
              </span>

              <span className="text-[#68766B]">
                Duration: {activeHeatmapLecture.duration || 'N/A'}
              </span>
            </div>

            {heatmapLoading ? (

              <div className="rounded-xl border border-[#D9E1D2] p-8 text-center">
                <div className="h-7 w-7 rounded-full border-4 border-t-primary-500 border-[#D9E1D2] animate-spin mx-auto mb-3" />

                <p className="text-sm text-[#68766B]">
                  Loading confusion analytics...
                </p>
              </div>

            ) : heatmapBins.length > 0 ? (

              <>
                <div className="space-y-2">

                  <div className="h-6 w-full rounded-xl bg-slate-100 flex overflow-hidden p-1 gap-1 border border-[#D9E1D2]">

                    {heatmapBins.map((bin, index) => {

                      let statusBg =
                        'bg-emerald-100 border-emerald-400 text-emerald-950 font-bold';

                      if (
                        bin.status === 'yellow' ||
                        bin.status === 'medium' ||
                        bin.status === 'amber'
                      ) {
                        statusBg =
                          'bg-amber-100 border-amber-400 text-amber-950 font-bold';
                      }

                      if (
                        bin.status === 'red' ||
                        bin.status === 'high'
                      ) {
                        statusBg =
                          'bg-rose-600 border-rose-700 text-white font-bold';
                      }

                      return (
                        <div
                          key={`${activeHeatmapLecture.id}-${index}`}
                          className={`flex-1 rounded-md border flex items-center justify-center text-[9px] cursor-pointer transition-all hover:scale-105 ${statusBg}`}
                          title={`Time: ${bin.time || bin.timestamp || 'N/A'} | Density: ${bin.density ?? bin.confusion ?? 0}`}
                        >
                          {bin.time || bin.timestamp || '--:--'}
                        </div>
                      );
                    })}

                  </div>

                  <div className="flex items-center justify-between text-[10px] text-[#68766B] px-1 pt-1">

                    <div className="flex items-center gap-4">

                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Smooth Flow
                      </span>

                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        Moderate Replays
                      </span>

                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-rose-500" />
                        Critical Friction
                      </span>

                    </div>

                  </div>

                </div>

                {heatmapAdvice && (
                  <div className="p-4 rounded-xl bg-[#315C46]/10 border border-[#315C46]/20 text-xs text-[#68766B] space-y-1.5">

                    <div className="flex items-center gap-2 font-bold text-[#315C46]">
                      <Sparkles className="h-4 w-4 text-amber-400" />

                      AI Curriculum Recommendation
                    </div>

                    <p className="leading-relaxed text-[#68766B]">
                      {heatmapAdvice}
                    </p>

                  </div>
                )}
              </>

            ) : (

              <div className="rounded-xl border border-[#D9E1D2] p-6 text-center">
                <p className="text-sm text-[#68766B]">
                  No confusion data available for this lecture yet.
                </p>
              </div>

            )}

          </div>

        ) : (

          <div className="rounded-xl border border-[#D9E1D2] bg-[#E2E8D8] p-8 text-center">
            <p className="text-sm text-[#68766B]">
              No lecture selected.
            </p>
          </div>

        )}

      </div>

      {/* =========================================================
          LECTURE ANALYTICS
      ========================================================= */}

      <div className="glass-panel rounded-2xl p-6 border border-[#D9E1D2] bg-[#E2E8D8]">

        <h4 className="font-outfit font-bold text-sm text-[#26332A] mb-6 uppercase tracking-wider flex items-center gap-2">
          <BookOpen className="h-4.5 w-4.5 text-[#315C46]" />
          Lecture Analytics Overview
        </h4>

        {lectures.length === 0 ? (

          <div className="py-10 text-center">
            <BookOpen className="h-8 w-8 text-[#68766B] mx-auto mb-3" />

            <p className="text-sm font-semibold text-[#68766B]">
              No lecture data available
            </p>

            <p className="text-xs text-[#68766B] mt-1">
              Your imported lectures will appear here.
            </p>
          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full text-left text-xs">

              <thead>
                <tr className="border-b border-[#D9E1D2] text-[#68766B] uppercase tracking-wider font-semibold">

                  <th className="pb-3 px-4">
                    Lecture Info
                  </th>

                  <th className="pb-3 text-center">
                    Instructor
                  </th>

                  <th className="pb-3 text-center">
                    Views
                  </th>

                  <th className="pb-3 text-center">
                    Completion Rate
                  </th>

                  <th className="pb-3 text-center">
                    Avg Quiz Score
                  </th>

                  <th className="pb-3 text-center">
                    Confusion Level
                  </th>

                  <th className="pb-3 text-right pr-4">
                    Action
                  </th>

                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/40">

                {lectures.map((lecture) => (

                  <tr
                    key={lecture.id}
                    className="text-[#68766B] hover:bg-[#E2E8D8] transition-colors"
                  >

                    <td className="py-4 px-4">

                      <div className="space-y-0.5">

                        <span className="text-[9px] font-bold text-[#315C46] block uppercase tracking-widest">
                          {lecture.course_name || dashboardData.course_name || 'Course'}
                        </span>

                        <span className="font-bold text-[#26332A] text-xs block leading-snug">
                          {lecture.title || 'Untitled Lecture'}
                        </span>

                        <span className="text-[9px] text-[#68766B] block">
                          Duration: {lecture.duration || 'N/A'}
                        </span>

                        <span className="text-[8px] text-[#68766B] block">
                          ID: {lecture.id}
                        </span>

                      </div>

                    </td>

                    <td className="py-4 text-center text-[#68766B]">
                      {lecture.instructor ||
                        dashboardData.faculty_name ||
                        'Faculty'}
                    </td>

                    <td className="py-4 text-center font-bold">
                      {lecture.views ?? 0}
                    </td>

                    <td className="py-4 text-center font-bold text-[#26332A]">
                      {lecture.watch_percentage ?? 0}%
                    </td>

                    <td className="py-4 text-center font-bold text-[#315C46]">
                      {lecture.avg_quiz_score ?? 0}%
                    </td>

                    <td className="py-4 text-center">

                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider ${
                          lecture.confusion_level === 'High'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : lecture.confusion_level === 'Medium'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : lecture.confusion_level === 'Low'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-slate-500/10 text-[#68766B] border border-slate-500/20'
                        }`}
                      >
                        {lecture.confusion_level || 'No Data'}
                      </span>

                    </td>

                    <td className="py-4 text-right pr-4">

                      <button
                        onClick={() =>
                          navigate(`/faculty/lecture/${lecture.id}`)
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/10 border border-[#315C46]/20 text-[#315C46] hover:bg-black hover:text-[#26332A] transition-all text-xs font-bold"
                      >
                        Analyze
                        <ArrowRight className="h-3 w-3" />
                      </button>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </div>

      {/* =========================================================
          STUDENT PERFORMANCE
      ========================================================= */}

      <div className="glass-panel rounded-2xl p-6 border border-[#D9E1D2] bg-[#E2E8D8]">

        <h4 className="font-outfit font-bold text-sm text-[#26332A] mb-6 uppercase tracking-wider flex items-center gap-2">
          <Users className="h-4.5 w-4.5 text-[#315C46]" />
          Student Performance Directory
        </h4>

        {students.length === 0 ? (

          <div className="py-10 text-center">

            <Users className="h-8 w-8 text-[#68766B] mx-auto mb-3" />

            <p className="text-sm font-semibold text-[#68766B]">
              No student data available
            </p>

            <p className="text-xs text-[#68766B] mt-1">
              Student analytics will appear here when student activity is available.
            </p>

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full text-left text-xs">

              <thead>
                <tr className="border-b border-[#D9E1D2] text-[#68766B] uppercase tracking-wider font-semibold">

                  <th className="pb-3 px-4">
                    Student
                  </th>

                  <th className="pb-3 text-center">
                    Lectures Completed
                  </th>

                  <th className="pb-3 text-center">
                    Average Quiz Score
                  </th>

                  <th className="pb-3 text-center">
                    Confusion Level
                  </th>

                  <th className="pb-3 text-center">
                    Risk Status
                  </th>

                  <th className="pb-3 text-right pr-4">
                    Action
                  </th>

                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/40">

                {students.map((student) => {

                  const studentName =
                    student.name ||
                    student.student_name ||
                    student.student_id ||
                    'Unknown Student';

                  const initials = studentName
                    .split(' ')
                    .map((part) => part[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <tr
                      key={student.student_id}
                      className="text-[#68766B] hover:bg-[#E2E8D8] transition-colors"
                    >

                      <td className="py-4 px-4 font-semibold text-[#26332A]">

                        <div className="flex items-center gap-3">

                          <div className="h-7 w-7 rounded-full bg-slate-800 border border-slate-300 flex items-center justify-center font-bold text-[10px] text-[#68766B]">
                            {initials}
                          </div>

                          <span>
                            {studentName}
                          </span>

                        </div>

                      </td>

                      <td className="py-4 text-center font-bold">
                        {student.completed_count ?? 0} / {lectures.length}
                      </td>

                      <td className="py-4 text-center font-bold text-[#315C46]">
                        {student.avg_quiz_score ?? 0}%
                      </td>

                      <td className="py-4 text-center">

                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider ${
                            student.confusion_level === 'High'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : student.confusion_level === 'Medium'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : student.confusion_level === 'Low'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-slate-500/10 text-[#68766B] border border-slate-500/20'
                          }`}
                        >
                          {student.confusion_level || 'No Data'}
                        </span>

                      </td>

                      <td className="py-4 text-center">

                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider ${
                            student.risk_level === 'High'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : student.risk_level === 'Medium'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : student.risk_level === 'Low'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-slate-500/10 text-[#68766B] border border-slate-500/20'
                          }`}
                        >
                          {student.risk_level || 'No Data'}
                        </span>

                      </td>

                      <td className="py-4 text-right pr-4">

                        <button
                          onClick={() =>
                            navigate(
                              `/faculty/student/${student.student_id}`
                            )
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/10 border border-[#315C46]/20 text-[#315C46] hover:bg-black hover:text-[#26332A] transition-all text-xs font-bold"
                        >
                          Profile
                          <ArrowRight className="h-3 w-3" />
                        </button>

                      </td>

                    </tr>
                  );
                })}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </div>
  );
}