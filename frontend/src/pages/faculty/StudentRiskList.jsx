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
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }

    if (value === 'medium') {
      return 'bg-amber-50 text-amber-800 border-amber-200';
    }

    if (value === 'low') {
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    }

    return 'bg-[#FCFCF8] text-[#68766B] border-slate-200';
  };

  const getConfusionClass = (level) => {
    const value = String(level || '').toLowerCase();

    if (value === 'high') {
      return 'bg-rose-50 text-rose-700';
    }

    if (value === 'medium') {
      return 'bg-amber-50 text-amber-800';
    }

    if (value === 'low') {
      return 'bg-emerald-50 text-emerald-800';
    }

    return 'bg-[#FCFCF8] text-[#68766B]';
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

          <div className="h-9 w-9 rounded-full border-2 border-[#D9E1D2] border-t-primary-500 animate-spin" />

          <span className="text-[#68766B] text-sm">
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
    <div className="flex-1 p-8 overflow-y-auto space-y-8 max-w-6xl mx-auto bg-[#F8F8F2] text-[#26332A]">

      {/* ======================================================
          HEADER
          ====================================================== */}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D9E1D2] pb-6">

        <div className="space-y-2">

          <div className="flex items-center gap-2">

            <Users className="h-5 w-5 text-[#315C46]" />

            <span className="text-[10px] font-bold text-[#315C46] uppercase tracking-widest">
              Faculty Analytics
            </span>

          </div>

          <h1 className="font-outfit font-extrabold text-2xl text-[#26332A]">
            Student Risk List
          </h1>

          <p className="text-sm text-[#68766B] max-w-2xl">
            Identifies students who may be struggling based on
            the student analytics currently available to the
            Faculty backend.
          </p>

        </div>

        <button
          type="button"
          onClick={loadStudents}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#D9E1D2] text-xs font-bold text-[#68766B] hover:text-[#26332A] hover:border-slate-300 transition"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>

      </div>

      {/* ======================================================
          ERROR
          ====================================================== */}

      {error && (
        <div className="glass-panel rounded-2xl p-4 border border-[#FECDD3] bg-[#FFF1F2] flex items-start gap-3">

          <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />

          <div>

            <p className="text-sm font-semibold text-rose-300">
              Unable to load analytics
            </p>

            <p className="text-xs text-[#68766B] mt-1">
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

          <div className="mx-auto h-14 w-14 rounded-2xl bg-[#FCFCF8] flex items-center justify-center mb-5">

            <Users className="h-7 w-7 text-[#68766B]" />

          </div>

          <h2 className="text-base font-bold text-[#26332A] mb-2">
            No student analytics available
          </h2>

          <p className="text-xs text-[#68766B] max-w-lg mx-auto leading-relaxed">
            Student risk information will appear here after
            real student learning activity and analytics are
            connected to the Faculty backend.
          </p>

          <div className="mt-6 inline-flex items-start gap-2 text-left px-4 py-3 rounded-xl bg-[#315C46]/10 border border-[#315C46]/20 max-w-lg">

            <Info className="h-4 w-4 text-[#315C46] shrink-0 mt-0.5" />

            <p className="text-[11px] text-[#68766B] leading-relaxed">
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

          <div className="p-5 bg-[#D9E1D2]/40 border-b border-[#D9E1D2] flex items-center justify-between">

            <div className="flex items-center gap-2">

              <AlertTriangle className="h-4 w-4 text-rose-400" />

              <h2 className="font-outfit font-bold text-xs text-[#26332A] uppercase tracking-wider">
                Student Risk Directory
              </h2>

            </div>

            <span className="text-[10px] text-[#26332A] font-semibold">
              {students.length} student
              {students.length !== 1 ? 's' : ''}
            </span>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full min-w-[900px]">

              <thead>

                <tr className="border-b border-[#D9E1D2] text-[9px] uppercase tracking-wider text-[#26332A] font-bold">

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
                    className="border-b border-[#D9E1D2] last:border-b-0 hover:bg-[#E8EDE1]/60 transition"
                  >

                    {/* STUDENT */}

                    <td className="px-5 py-4">

                      <div className="flex items-center gap-3">

                        <div className="h-9 w-9 rounded-full bg-[#315C46]/10 border border-[#315C46]/20 flex items-center justify-center text-[10px] font-bold text-[#315C46]">
                          {getAvatar(student)}
                        </div>

                        <div>

                          <p className="text-xs font-bold text-[#26332A]">
                            {student.name ||
                              student.student_id ||
                              'Unknown Student'}
                          </p>

                          <p className="text-[10px] text-[#68766B] mt-0.5">
                            {student.student_id}
                          </p>

                        </div>

                      </div>

                    </td>

                    {/* RISK SCORE */}

                    <td className="px-4 py-4 text-center">

                      {student.risk_score !== undefined &&
                      student.risk_score !== null ? (
                        <span className="text-sm font-extrabold text-black">
                          {student.risk_score}
                        </span>
                      ) : (
                        <span className="text-[#68766B]">
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

                        <span className="text-[10px] font-semibold text-[#68766B]">
                          {student.engagement_trend ||
                            'No Data'}
                        </span>

                      </div>

                    </td>

                    {/* REASON */}

                    <td className="px-4 py-4 max-w-[320px]">

                      <p className="text-[10px] leading-relaxed text-[#68766B]">
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
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#315C46]/10 border border-[#315C46]/20 text-[#315C46] hover:bg-slate-800 hover:text-[#26332A] transition text-[10px] font-bold"
                        >
                          Profile
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      ) : (
                        <span className="text-[10px] text-[#68766B]">
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