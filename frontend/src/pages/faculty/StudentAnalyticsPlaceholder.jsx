// frontend/src/pages/faculty/StudentAnalyticsPlaceholder.jsx

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  ShieldAlert,
  Award,
  Activity,
  BarChart2,
  BookOpen,
  CheckCircle,
  Info,
  RefreshCw,
} from 'lucide-react';

export default function StudentAnalyticsPlaceholder() {
  const { studentId } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [lectures, setLectures] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ============================================================
  // LOAD REAL FACULTY STUDENT + LECTURE DATA
  // ============================================================

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const [studentsResponse, lecturesResponse] =
        await Promise.all([
          fetch('/api/faculty/student-risk'),
          fetch('/api/faculty/lectures'),
        ]);

      if (!studentsResponse.ok) {
        throw new Error('Failed to load student analytics.');
      }

      const studentsJson = await studentsResponse.json();

      const lectureJson = lecturesResponse.ok
        ? await lecturesResponse.json()
        : [];

      const studentList = Array.isArray(studentsJson)
        ? studentsJson
        : [];

      const lectureList = Array.isArray(lectureJson)
        ? lectureJson
        : [];

      setLectures(lectureList);

      const foundStudent = studentList.find(
        (item) => item.student_id === studentId
      );

      if (!foundStudent) {
        setStudent(null);
        setError(
          `Student "${studentId}" was not found in the Faculty student-risk data.`
        );
        return;
      }

      setStudent(foundStudent);
    } catch (err) {
      setStudent(null);
      setLectures([]);
      setError(
        err.message || 'Unable to load student analytics.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [studentId]);

  // ============================================================
  // HELPERS
  // ============================================================

  const displayValue = (value, suffix = '') => {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return '—';
    }

    return `${value}${suffix}`;
  };

  const getRiskClasses = (risk) => {
    const value = String(risk || '').toLowerCase();

    if (value === 'high') {
      return {
        badge:
          'bg-rose-500/10 border-rose-500/20 text-rose-400',
        icon: 'text-rose-400',
      };
    }

    if (value === 'medium') {
      return {
        badge:
          'bg-amber-500/10 border-amber-500/20 text-amber-400',
        icon: 'text-amber-400',
      };
    }

    return {
      badge:
        'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
      icon: 'text-emerald-400',
    };
  };

  const getConfusionClasses = (level) => {
    const value = String(level || '').toLowerCase();

    if (value === 'high') {
      return 'text-rose-400';
    }

    if (value === 'medium') {
      return 'text-amber-400';
    }

    return 'text-emerald-400';
  };

  const riskClasses = getRiskClasses(
    student?.risk_level
  );

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 min-h-screen bg-brand-950">

        <div className="flex flex-col items-center gap-4">

          <RefreshCw className="h-9 w-9 text-accent-500 animate-spin" />

          <span className="text-slate-400 text-sm font-medium">
            Loading student analytics...
          </span>

        </div>

      </div>
    );
  }

  // ============================================================
  // ERROR / STUDENT NOT FOUND
  // ============================================================

  if (!student) {
    return (
      <div className="flex-1 p-8 bg-brand-950 min-h-screen">

        <button
          type="button"
          onClick={() => navigate('/faculty/risk')}
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Student Risk
        </button>

        <div className="glass-panel rounded-2xl p-16 text-center">

          <Info className="h-10 w-10 text-slate-500 mx-auto mb-4" />

          <h2 className="text-lg font-bold text-white mb-2">
            Student analytics unavailable
          </h2>

          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {error ||
              'No analytics are currently available for this student.'}
          </p>

        </div>

      </div>
    );
  }

  // ============================================================
  // MAIN PAGE
  // ============================================================

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-8 max-w-6xl mx-auto bg-brand-950 text-slate-100 min-h-screen">

      {/* ======================================================
          HEADER
          ====================================================== */}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

        <div>

          <button
            type="button"
            onClick={() => navigate('/faculty/risk')}
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Student Risk
          </button>

          <span className="px-2.5 py-0.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-[10px] font-bold uppercase tracking-wider">
            Faculty Student Analytics
          </span>

          <h1 className="font-outfit font-bold text-2xl text-white mt-2">
            {student.name || student.student_id}
          </h1>

          <p className="text-xs text-slate-500 mt-1">
            Student ID: {student.student_id}
          </p>

        </div>

        <button
          type="button"
          onClick={loadData}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-800 text-xs font-semibold text-slate-400 hover:text-white hover:border-slate-700 transition"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>

      </div>

      {/* ======================================================
          STUDENT OVERVIEW
          ====================================================== */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* PROFILE */}

        <div className="glass-panel rounded-2xl p-6">

          <div className="flex items-center gap-4">

            <div className="h-14 w-14 rounded-full bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">

              <User className="h-7 w-7 text-primary-400" />

            </div>

            <div>

              <h2 className="text-base font-bold text-white">
                {student.name || 'Student'}
              </h2>

              <p className="text-xs text-slate-500">
                {student.student_id}
              </p>

            </div>

          </div>

          <div className="mt-6 pt-5 border-t border-slate-800 space-y-4">

            <div className="flex justify-between">

              <span className="text-xs text-slate-500">
                Completed Lectures
              </span>

              <span className="text-xs font-bold text-white">
                {displayValue(student.completed_count)}
              </span>

            </div>

            <div className="flex justify-between">

              <span className="text-xs text-slate-500">
                Average Quiz Score
              </span>

              <span className="text-xs font-bold text-white">
                {displayValue(student.avg_quiz_score, '%')}
              </span>

            </div>

            <div className="flex justify-between">

              <span className="text-xs text-slate-500">
                Engagement Trend
              </span>

              <span className="text-xs font-bold text-white">
                {displayValue(student.engagement_trend)}
              </span>

            </div>

          </div>

        </div>

        {/* RISK */}

        <div className="glass-panel rounded-2xl p-6">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Risk Level
              </p>

              <p className="text-3xl font-extrabold text-white mt-2">
                {displayValue(student.risk_level)}
              </p>

            </div>

            <div
              className={`h-12 w-12 rounded-xl border flex items-center justify-center ${riskClasses.badge}`}
            >
              <ShieldAlert
                className={`h-6 w-6 ${riskClasses.icon}`}
              />
            </div>

          </div>

          <div className="mt-6 pt-5 border-t border-slate-800">

            <div className="flex justify-between items-center">

              <span className="text-xs text-slate-500">
                Risk Score
              </span>

              <span className="text-lg font-bold text-white">
                {displayValue(student.risk_score)}
              </span>

            </div>

          </div>

        </div>

        {/* CONFUSION */}

        <div className="glass-panel rounded-2xl p-6">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Confusion Level
              </p>

              <p
                className={`text-3xl font-extrabold mt-2 ${getConfusionClasses(
                  student.confusion_level
                )}`}
              >
                {displayValue(student.confusion_level)}
              </p>

            </div>

            <div className="h-12 w-12 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">

              <Activity className="h-6 w-6 text-primary-400" />

            </div>

          </div>

          <div className="mt-6 pt-5 border-t border-slate-800">

            <p className="text-xs text-slate-500">
              Current faculty-side confusion classification
              from available analytics.
            </p>

          </div>

        </div>

      </div>

      {/* ======================================================
          REASON / FACULTY ANALYSIS
          ====================================================== */}

      <div className="glass-panel rounded-2xl p-6">

        <h3 className="font-outfit font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2 mb-4">

          <Info className="h-4 w-4 text-primary-400" />

          Faculty Analysis

        </h3>

        <div className="p-4 bg-brand-950/40 border border-slate-800 rounded-xl">

          <p className="text-sm text-slate-300 leading-relaxed">
            {student.reason ||
              'No faculty analysis reason has been recorded for this student.'}
          </p>

        </div>

      </div>

      {/* ======================================================
          STUDENT METRICS
          ====================================================== */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <div className="glass-panel rounded-2xl p-5">

          <div className="flex items-center gap-3">

            <div className="h-10 w-10 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">

              <BookOpen className="h-5 w-5 text-primary-400" />

            </div>

            <div>

              <p className="text-[10px] text-slate-500 uppercase font-bold">
                Completed
              </p>

              <p className="text-xl font-bold text-white">
                {displayValue(student.completed_count)}
              </p>

            </div>

          </div>

        </div>

        <div className="glass-panel rounded-2xl p-5">

          <div className="flex items-center gap-3">

            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">

              <Award className="h-5 w-5 text-emerald-400" />

            </div>

            <div>

              <p className="text-[10px] text-slate-500 uppercase font-bold">
                Quiz Average
              </p>

              <p className="text-xl font-bold text-white">
                {displayValue(student.avg_quiz_score, '%')}
              </p>

            </div>

          </div>

        </div>

        <div className="glass-panel rounded-2xl p-5">

          <div className="flex items-center gap-3">

            <div className="h-10 w-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">

              <BarChart2 className="h-5 w-5 text-amber-400" />

            </div>

            <div>

              <p className="text-[10px] text-slate-500 uppercase font-bold">
                Engagement
              </p>

              <p className="text-xl font-bold text-white">
                {displayValue(student.engagement_trend)}
              </p>

            </div>

          </div>

        </div>

      </div>

      {/* ======================================================
          AVAILABLE LECTURES
          ====================================================== */}

      <div className="glass-panel rounded-2xl p-6">

        <div className="flex items-center justify-between mb-5">

          <div>

            <h3 className="font-outfit font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">

              <BookOpen className="h-4 w-4 text-primary-400" />

              Available Course Lectures

            </h3>

            <p className="text-xs text-slate-500 mt-1">
              Lectures currently available in the Faculty
              lecture repository.
            </p>

          </div>

          <span className="text-xs text-slate-500">
            {lectures.length} lecture
            {lectures.length === 1 ? '' : 's'}
          </span>

        </div>

        {lectures.length === 0 ? (

          <div className="p-8 rounded-xl border border-slate-800 bg-brand-950/40 text-center">

            <BookOpen className="h-8 w-8 text-slate-600 mx-auto mb-3" />

            <p className="text-xs text-slate-500">
              No lectures are currently available.
            </p>

          </div>

        ) : (

          <div className="space-y-3">

            {lectures.map((lecture) => (

              <div
                key={lecture.id}
                className="p-4 rounded-xl border border-slate-800 bg-brand-950/40 flex flex-col md:flex-row md:items-center justify-between gap-3"
              >

                <div>

                  <p className="text-sm font-semibold text-white">
                    {lecture.title ||
                      lecture.name ||
                      lecture.id}
                  </p>

                  <p className="text-[10px] text-slate-500 mt-1">
                    Lecture ID: {lecture.id}
                  </p>

                </div>

                <div className="flex items-center gap-4 text-xs">

                  <span className="text-slate-500">
                    Views:{' '}
                    <span className="text-slate-300 font-semibold">
                      {displayValue(lecture.views, '')}
                    </span>
                  </span>

                  <span className="text-slate-500">
                    Engagement:{' '}
                    <span className="text-slate-300 font-semibold">
                      {displayValue(
                        lecture.engagement_score,
                        lecture.engagement_score !== undefined
                          ? '%'
                          : ''
                      )}
                    </span>
                  </span>

                </div>

              </div>

            ))}

          </div>

        )}

      </div>

      {/* ======================================================
          STATUS
          ====================================================== */}

      <div className="glass-panel rounded-2xl p-5 border border-primary-500/10">

        <div className="flex items-start gap-3">

          <CheckCircle className="h-5 w-5 text-primary-400 shrink-0 mt-0.5" />

          <div>

            <p className="text-xs font-semibold text-white">
              Faculty analytics source
            </p>

            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              This page displays student information returned by
              the Faculty analytics backend. No placeholder
              student profile or hardcoded lecture data is used.
            </p>

          </div>

        </div>

      </div>

    </div>
  );
}