// frontend/src/pages/faculty/StudentRiskList.jsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowRight,
  RefreshCw,
  Info,
} from 'lucide-react';

export default function StudentRiskList() {
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ============================================================
  // LOAD REAL STUDENT RISK DATA
  // ============================================================

  const loadStudents = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        '/api/faculty/student-risk'
      );

      if (!response.ok) {
        throw new Error(
          'Failed to load student risk data.'
        );
      }

      const json = await response.json();

      setStudents(
        Array.isArray(json) ? json : []
      );
    } catch (err) {
      setStudents([]);
      setError(
        err.message ||
          'Unable to load student analytics.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  // ============================================================
  // HELPERS
  // ============================================================

  const getRiskClass = (risk) => {
    const value = String(risk || '').toLowerCase();

    if (value === 'high') {
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    }

    if (value === 'medium') {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }

    if (value === 'low') {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }

    return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  };

  const getConfusionClass = (level) => {
    const value = String(level || '').toLowerCase();

    if (value === 'high') {
      return 'bg-rose-500/10 text-rose-400';
    }

    if (value === 'medium') {
      return 'bg-amber-500/10 text-amber-400';
    }

    if (value === 'low') {
      return 'bg-emerald-500/10 text-emerald-400';
    }

    return 'bg-slate-500/10 text-slate-400';
  };

  const getTrendIcon = (trend) => {
    const value = String(trend || '').toLowerCase();

    if (
      value.includes('drop') ||
      value.includes('declin')
    ) {
      return (
        <ArrowDown className="h-3.5 w-3.5 text-rose-400" />
      );
    }

    if (
      value.includes('improv') ||
      value.includes('up') ||
      value.includes('increas')
    ) {
      return (
        <ArrowUp className="h-3.5 w-3.5 text-emerald-400" />
      );
    }

    return (
      <span className="h-3.5 w-3.5 rounded-full border border-slate-600" />
    );
  };

  const getAvatar = (student) => {
    if (student?.avatar) {
      return student.avatar;
    }

    const name = student?.name || '';
    const parts = name.trim().split(/\s+/);

    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`
        .toUpperCase();
    }

    return name.slice(0, 2).toUpperCase() || '?';
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 min-h-[500px]">

        <div className="flex flex-col items-center gap-4">

          <div className="h-9 w-9 rounded-full border-2 border-slate-800 border-t-primary-500 animate-spin" />

          <span className="text-slate-400 text-sm">
            Loading student risk analytics...
          </span>

        </div>

      </div>
    );
  }

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-8 max-w-6xl mx-auto">

      {/* ======================================================
          HEADER
          ====================================================== */}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">

        <div className="space-y-2">

          <div className="flex items-center gap-2">

            <Users className="h-5 w-5 text-primary-400" />

            <span className="text-[10px] font-bold text-primary-400 uppercase tracking-widest">
              Faculty Analytics
            </span>

          </div>

          <h1 className="font-outfit font-extrabold text-2xl text-white">
            Student Risk List
          </h1>

          <p className="text-sm text-slate-400 max-w-2xl">
            Identifies students who may be struggling based on
            the student analytics currently available to the
            Faculty backend.
          </p>

        </div>

        <button
          type="button"
          onClick={loadStudents}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-800 text-xs font-bold text-slate-300 hover:text-white hover:border-slate-700 transition"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>

      </div>

      {/* ======================================================
          ERROR
          ====================================================== */}

      {error && (
        <div className="glass-panel rounded-2xl p-4 border border-rose-500/20 bg-rose-500/5 flex items-start gap-3">

          <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />

          <div>

            <p className="text-sm font-semibold text-rose-300">
              Unable to load analytics
            </p>

            <p className="text-xs text-slate-400 mt-1">
              {error}
            </p>

          </div>

        </div>
      )}

      {/* ======================================================
          EMPTY STATE
          ====================================================== */}

      {students.length === 0 ? (

        <div className="glass-panel rounded-2xl p-14 text-center">

          <div className="mx-auto h-14 w-14 rounded-2xl bg-slate-800/50 flex items-center justify-center mb-5">

            <Users className="h-7 w-7 text-slate-500" />

          </div>

          <h2 className="text-base font-bold text-white mb-2">
            No student analytics available
          </h2>

          <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
            Student risk information will appear here after
            real student learning activity and analytics are
            connected to the Faculty backend.
          </p>

          <div className="mt-6 inline-flex items-start gap-2 text-left px-4 py-3 rounded-xl bg-primary-500/5 border border-primary-500/10 max-w-lg">

            <Info className="h-4 w-4 text-primary-400 shrink-0 mt-0.5" />

            <p className="text-[11px] text-slate-500 leading-relaxed">
              No placeholder students are displayed. This keeps
              the Faculty dashboard synchronized with actual
              backend data.
            </p>

          </div>

        </div>

      ) : (

        /* ====================================================
           TABLE
           ==================================================== */

        <div className="glass-panel rounded-2xl overflow-hidden">

          <div className="p-5 bg-brand-950/40 border-b border-slate-800 flex items-center justify-between">

            <div className="flex items-center gap-2">

              <AlertTriangle className="h-4 w-4 text-rose-400" />

              <h2 className="font-outfit font-bold text-xs text-white uppercase tracking-wider">
                Student Risk Directory
              </h2>

            </div>

            <span className="text-[10px] text-slate-500 font-semibold">
              {students.length} student
              {students.length !== 1 ? 's' : ''}
            </span>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full min-w-[900px]">

              <thead>

                <tr className="border-b border-slate-800 text-[9px] uppercase tracking-wider text-slate-500 font-bold">

                  <th className="text-left px-5 py-4">
                    Student
                  </th>

                  <th className="text-center px-4 py-4">
                    Risk Score
                  </th>

                  <th className="text-center px-4 py-4">
                    Risk Level
                  </th>

                  <th className="text-center px-4 py-4">
                    Confusion
                  </th>

                  <th className="text-center px-4 py-4">
                    Engagement
                  </th>

                  <th className="text-left px-4 py-4">
                    Reason
                  </th>

                  <th className="text-right px-5 py-4">
                    Action
                  </th>

                </tr>

              </thead>

              <tbody>

                {students.map((student) => (

                  <tr
                    key={student.student_id}
                    className="border-b border-slate-800/70 last:border-b-0 hover:bg-white/[0.015] transition"
                  >

                    {/* STUDENT */}

                    <td className="px-5 py-4">

                      <div className="flex items-center gap-3">

                        <div className="h-9 w-9 rounded-full bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-[10px] font-bold text-primary-400">
                          {getAvatar(student)}
                        </div>

                        <div>

                          <p className="text-xs font-bold text-white">
                            {student.name ||
                              student.student_id ||
                              'Unknown Student'}
                          </p>

                          <p className="text-[10px] text-slate-600 mt-0.5">
                            {student.student_id}
                          </p>

                        </div>

                      </div>

                    </td>

                    {/* RISK SCORE */}

                    <td className="px-4 py-4 text-center">

                      {student.risk_score !== undefined &&
                      student.risk_score !== null ? (
                        <span className="text-sm font-extrabold text-white">
                          {student.risk_score}
                        </span>
                      ) : (
                        <span className="text-slate-600">
                          —
                        </span>
                      )}

                    </td>

                    {/* RISK LEVEL */}

                    <td className="px-4 py-4 text-center">

                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full border text-[9px] font-bold uppercase tracking-wider ${getRiskClass(
                          student.risk_level
                        )}`}
                      >
                        {student.risk_level || 'Unknown'}
                      </span>

                    </td>

                    {/* CONFUSION */}

                    <td className="px-4 py-4 text-center">

                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${getConfusionClass(
                          student.confusion_level
                        )}`}
                      >
                        {student.confusion_level || 'No Data'}
                      </span>

                    </td>

                    {/* ENGAGEMENT */}

                    <td className="px-4 py-4">

                      <div className="flex items-center justify-center gap-2">

                        {getTrendIcon(
                          student.engagement_trend
                        )}

                        <span className="text-[10px] font-semibold text-slate-400">
                          {student.engagement_trend ||
                            'No Data'}
                        </span>

                      </div>

                    </td>

                    {/* REASON */}

                    <td className="px-4 py-4 max-w-[320px]">

                      <p className="text-[10px] leading-relaxed text-slate-500">
                        {student.reason ||
                          'No risk explanation available.'}
                      </p>

                    </td>

                    {/* ACTION */}

                    <td className="px-5 py-4 text-right">

                      {student.student_id ? (
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/faculty/student/${student.student_id}`
                            )
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-500/10 border border-primary-500/20 text-primary-400 hover:bg-primary-500 hover:text-white transition text-[10px] font-bold"
                        >
                          Profile
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-700">
                          —
                        </span>
                      )}

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </div>

      )}

    </div>
  );
}