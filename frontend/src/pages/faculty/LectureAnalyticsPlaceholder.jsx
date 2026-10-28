// frontend/src/pages/faculty/LectureAnalyticsPlaceholder.jsx

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import {
  ArrowLeft,
  BookOpen,
  Clock,
  AlertTriangle,
  BarChart2,
  Activity,
  Users,
  ShieldAlert,
  Award,
  Info
} from 'lucide-react';

export default function LectureAnalyticsPlaceholder() {
  const { lectureId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [lectureData, setLectureData] = useState(null);
  const [confusionTimeline, setConfusionTimeline] = useState([]);
  const [suggestionsData, setSuggestionsData] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadLectureAnalytics = async () => {
      if (!lectureId) {
        setError('Lecture ID is missing.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');

        const [
          lectureResponse,
          confusionResponse,
          suggestionsResponse,
          sessionResponse
        ] = await Promise.all([
          fetch(`/api/faculty/lecture/${lectureId}`),
          fetch(`/api/faculty/lecture/${lectureId}/confusion`),
          fetch(`/api/faculty/lecture/${lectureId}/suggestions`),
          fetch('/api/student/active-session')
        ]);

        if (!lectureResponse.ok) {
          throw new Error(
            `Lecture "${lectureId}" was not found in the backend storage.`
          );
        }

        const lectureJson = await lectureResponse.json();

        let confusionJson = [];
        if (confusionResponse.ok) {
          confusionJson = await confusionResponse.json();
        }

        let suggestionsJson = null;
        if (suggestionsResponse.ok) {
          suggestionsJson = await suggestionsResponse.json();
        }

        let sessionJson = null;
        if (sessionResponse.ok) {
          sessionJson = await sessionResponse.json();
        }

        setLectureData(lectureJson);
        setConfusionTimeline(
          Array.isArray(confusionJson) ? confusionJson : []
        );
        setSuggestionsData(suggestionsJson);
        setActiveSession(sessionJson);
      } catch (err) {
        console.error('Lecture analytics error:', err);

        setLectureData(null);
        setConfusionTimeline([]);
        setSuggestionsData(null);
        setActiveSession(null);

        setError(
          err.message ||
          'Unable to load lecture analytics.'
        );
      } finally {
        setLoading(false);
      }
    };

    loadLectureAnalytics();
  }, [lectureId]);

  const formatTime = (seconds) => {
    if (seconds === undefined || seconds === null) {
      return '0:00';
    }

    const numericSeconds = Number(seconds);

    if (Number.isNaN(numericSeconds)) {
      return '0:00';
    }

    const minutes = Math.floor(numericSeconds / 60);
    const secondsPart = Math.floor(numericSeconds % 60);

    return `${minutes}:${secondsPart < 10 ? '0' : ''}${secondsPart}`;
  };

  const getValue = (object, keys, fallback = null) => {
    if (!object) {
      return fallback;
    }

    for (const key of keys) {
      if (
        object[key] !== undefined &&
        object[key] !== null
      ) {
        return object[key];
      }
    }

    return fallback;
  };

  const getConfusionLevel = (score) => {
    const numericScore = Number(score || 0);

    if (numericScore >= 70) {
      return 'High';
    }

    if (numericScore >= 35) {
      return 'Medium';
    }

    return 'Low';
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 min-h-screen bg-brand-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-t-primary-500 border-slate-800 animate-spin" />

          <span className="text-slate-400 text-sm font-medium">
            Loading lecture analytics...
          </span>
        </div>
      </div>
    );
  }

  if (error || !lectureData) {
    return (
      <div className="flex-1 p-8 min-h-screen bg-brand-950 text-slate-100">
        <button
          onClick={() => navigate('/faculty/dashboard')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Faculty Dashboard
        </button>

        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-8 text-center">

            <AlertTriangle className="h-10 w-10 text-rose-400 mx-auto mb-4" />

            <h2 className="text-lg font-bold text-white">
              Lecture Analytics Unavailable
            </h2>

            <p className="text-sm text-slate-400 mt-2">
              {error || 'The requested lecture could not be found.'}
            </p>

            <p className="text-xs text-slate-500 mt-4">
              Requested Lecture ID:
              <span className="text-slate-300 ml-1 font-mono">
                {lectureId}
              </span>
            </p>

          </div>
        </div>
      </div>
    );
  }

  /*
   * Everything below this point comes from the actual backend response.
   * There are no hardcoded lec_1 / lec_2 / lec_3 records.
   */

  const title =
    getValue(
      lectureData,
      ['title', 'lecture_title', 'name'],
      'Untitled Lecture'
    );

  const courseName =
    getValue(
      lectureData,
      ['course_name', 'course'],
      'Course'
    );

  const instructor =
    getValue(
      lectureData,
      ['instructor', 'faculty_name', 'faculty'],
      'Faculty'
    );

  const duration =
    getValue(
      lectureData,
      ['duration', 'video_duration'],
      'N/A'
    );

  const difficulty =
    getValue(
      lectureData,
      ['difficulty'],
      'Not specified'
    );

  const views =
    Number(
      getValue(
        lectureData,
        ['views', 'view_count'],
        0
      )
    );

  const completionRate =
    Number(
      getValue(
        lectureData,
        ['completion_rate', 'watch_percentage', 'avg_watch_percentage'],
        0
      )
    );

  const avgWatchTime =
    getValue(
      lectureData,
      ['avg_watch_time', 'average_watch_time'],
      'N/A'
    );

  const avgQuizScore =
    Number(
      getValue(
        lectureData,
        ['avg_quiz_score', 'average_quiz_score'],
        0
      )
    );

  const avgConfusion =
    Number(
      getValue(
        lectureData,
        ['avg_confusion', 'confusion_score', 'average_confusion'],
        0
      )
    );

  const riskStudents =
    Number(
      getValue(
        lectureData,
        ['risk_students', 'students_at_risk'],
        0
      )
    );

  const behavior =
    getValue(
      lectureData,
      ['behavior', 'telemetry', 'analytics'],
      {}
    ) || {};

  const totalPlays =
    Number(
      getValue(
        behavior,
        ['plays', 'total_plays'],
        getValue(lectureData, ['plays', 'total_plays'], 0)
      )
    );

  const totalPauses =
    Number(
      getValue(
        behavior,
        ['pauses', 'paused', 'total_pauses'],
        getValue(lectureData, ['pauses', 'paused'], 0)
      )
    );

  const totalRewinds =
    Number(
      getValue(
        behavior,
        ['rewinds', 'rewound', 'total_rewinds'],
        getValue(lectureData, ['rewinds', 'rewound'], 0)
      )
    );

  const totalSeeks =
    Number(
      getValue(
        behavior,
        ['seeks', 'seeked', 'total_seeks'],
        getValue(lectureData, ['seeks', 'seeked'], 0)
      )
    );

  const totalSpeedChanges =
    Number(
      getValue(
        behavior,
        ['speed_changes', 'total_speed_changes'],
        getValue(lectureData, ['speed_changes'], 0)
      )
    );

  const confusingConcepts =
    Array.isArray(lectureData.confusing_concepts)
      ? lectureData.confusing_concepts
      : [];

  const students =
    Array.isArray(lectureData.students)
      ? lectureData.students
      : [];

  const activeSessionMatches =
    activeSession &&
    activeSession.lecture_id === lectureId;

  const activeStudentRow = activeSessionMatches
    ? {
        name:
          activeSession.student_name ||
          activeSession.student_id ||
          'Active Student',

        watch_percentage: Math.round(
          Number(
            activeSession.completion_percentage || 0
          )
        ),

        watch_time: formatTime(
          activeSession.watch_time || 0
        ),

        quiz_score:
          activeSession.quiz_passed
            ? '100%'
            : activeSession.quiz_attempts > 0
              ? '0%'
              : 'N/A',

        confusion_level:
          activeSession.confusion_status
            ? activeSession.confusion_status.split(' ')[0]
            : getConfusionLevel(
                activeSession.confusion_score
              ),

        risk_level:
          Number(activeSession.confusion_score || 0) >= 70
            ? 'High'
            : Number(activeSession.confusion_score || 0) >= 35
              ? 'Medium'
              : 'Low'
      }
    : null;

  const displayStudents =
    activeStudentRow
      ? [activeStudentRow, ...students]
      : students;

  const activeConfusionScore =
    activeSessionMatches
      ? Math.round(
          (
            avgConfusion +
            Number(activeSession.confusion_score || 0)
          ) / 2
        )
      : avgConfusion;

  const activePauses =
    activeSessionMatches
      ? totalPauses +
        Number(activeSession.paused || 0)
      : totalPauses;

  const activeRewinds =
    activeSessionMatches
      ? totalRewinds +
        Number(activeSession.rewound || 0)
      : totalRewinds;

  const activeSeeks =
    activeSessionMatches
      ? totalSeeks +
        Number(activeSession.seeked || 0)
      : totalSeeks;

  const activeSpeedChanges =
    activeSessionMatches
      ? totalSpeedChanges +
        Number(activeSession.speed_changes || 0)
      : totalSpeedChanges;

  const qualityScore =
    suggestionsData &&
    suggestionsData.quality_score !== undefined
      ? suggestionsData.quality_score
      : getValue(
          lectureData,
          ['quality_score', 'lecture_quality'],
          null
        );

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-8 max-w-6xl mx-auto bg-brand-950 text-slate-100 min-h-screen">

      {/* =========================================================
          BACK BUTTON
      ========================================================= */}
      <button
        onClick={() => navigate('/faculty/dashboard')}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Faculty Dashboard
      </button>

      {/* =========================================================
          LECTURE HEADER
      ========================================================= */}
      <div className="space-y-2 border-b border-slate-800 pb-6 flex flex-col md:flex-row md:justify-between md:items-end">

        <div>

          <span className="text-[9px] text-primary-400 font-bold uppercase tracking-widest block">
            {courseName}
          </span>

          <h3 className="font-outfit font-extrabold text-2xl text-white mt-1">
            {title}
          </h3>

          <p className="text-xs text-slate-400 mt-1">
            Instructor:{' '}
            <span className="text-slate-300">
              {instructor}
            </span>
          </p>

          <p className="text-[10px] text-slate-600 mt-2 font-mono">
            Lecture ID: {lectureId}
          </p>

        </div>

        <div className="flex flex-wrap gap-3 text-[10px] font-bold uppercase tracking-wider mt-4 md:mt-0">

          <span className="bg-brand-950/80 border border-slate-800 text-slate-350 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-slate-500" />
            {duration}
          </span>

          <span className="bg-primary-600/10 border border-primary-500/20 text-primary-400 px-3 py-1.5 rounded-xl">
            {difficulty}
          </span>

          <span className="bg-brand-950/80 border border-slate-800 text-slate-350 px-3 py-1.5 rounded-xl">
            Views: {views}
          </span>

        </div>

      </div>

      {/* =========================================================
          KPI SECTION
      ========================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

        <div className="glass-panel rounded-xl p-4 space-y-1.5">
          <span className="text-[9px] text-slate-500 font-bold uppercase block">
            Completion Rate
          </span>

          <span className="text-xl font-bold text-white">
            {activeSessionMatches
              ? Math.round(
                  (
                    completionRate +
                    Number(
                      activeSession.completion_percentage || 0
                    )
                  ) / 2
                )
              : completionRate}%
          </span>
        </div>

        <div className="glass-panel rounded-xl p-4 space-y-1.5">
          <span className="text-[9px] text-slate-500 font-bold uppercase block">
            Avg Watch Time
          </span>

          <span className="text-xl font-bold text-white">
            {avgWatchTime}
          </span>
        </div>

        <div className="glass-panel rounded-xl p-4 space-y-1.5">
          <span className="text-[9px] text-slate-500 font-bold uppercase block">
            Avg Quiz Score
          </span>

          <span className="text-xl font-bold text-white">
            {avgQuizScore}%
          </span>
        </div>

        <div className="glass-panel rounded-xl p-4 space-y-1.5">
          <span className="text-[9px] text-slate-500 font-bold uppercase block">
            Avg Confusion Score
          </span>

          <span className="text-xl font-bold text-white">
            {activeConfusionScore}%
          </span>
        </div>

        <div className="glass-panel rounded-xl p-4 space-y-1.5 border-l-2 border-l-rose-500">
          <span className="text-[9px] text-rose-400 font-bold uppercase block">
            Attention Needed
          </span>

          <span className="text-xl font-bold text-white">
            {activeSessionMatches &&
            Number(activeSession.confusion_score || 0) >= 60
              ? riskStudents + 1
              : riskStudents}{' '}
            Students
          </span>
        </div>

      </div>

      {/* =========================================================
          LECTURE QUALITY
      ========================================================= */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 bg-brand-900/40 flex flex-col md:flex-row justify-between items-center gap-6">

        <div className="space-y-2 max-w-md">

          <h4 className="font-outfit font-bold text-sm text-white flex items-center gap-2">
            <Award className="h-4 w-4 text-primary-400" />
            Lecture Quality Rating
          </h4>

          <p className="text-xs text-slate-400 leading-relaxed">
            Quality information is calculated from the actual lecture
            analytics returned by the Faculty backend.
          </p>

        </div>

        <div className="text-center shrink-0">

          {qualityScore !== null ? (
            <>
              <span className="text-4xl font-extrabold text-emerald-400 font-mono">
                {qualityScore}/100
              </span>

              <span className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold mt-1">
                Pedagogical Index
              </span>
            </>
          ) : (
            <span className="text-sm text-slate-500">
              No quality data
            </span>
          )}

        </div>

      </div>

      {/* =========================================================
          CONFUSION TIMELINE + CONCEPTS
      ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* TIMELINE */}
        <div className="glass-panel rounded-2xl p-6 lg:col-span-2 space-y-6">

          <h4 className="font-outfit font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary-400" />
            Timeline Confusion Heatmap Density
          </h4>

          {confusionTimeline.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-brand-950/50 p-8 text-center">

              <Activity className="h-8 w-8 text-slate-600 mx-auto mb-3" />

              <p className="text-sm font-semibold text-slate-300">
                No confusion timeline data
              </p>

              <p className="text-xs text-slate-500 mt-1">
                Student interaction data will appear here when available.
              </p>

            </div>
          ) : (
            <div className="space-y-4">

              {confusionTimeline.map((item, index) => {

                const percentage =
                  Number(item.percentage || 0);

                return (
                  <div
                    key={`${lectureId}-timeline-${index}`}
                    className="space-y-2"
                  >

                    <div className="flex justify-between text-[11px]">

                      <span className="font-bold text-slate-350">
                        {item.segment || 'Unknown Segment'}
                      </span>

                      <span
                        className={`font-bold ${
                          percentage >= 60
                            ? 'text-rose-400'
                            : percentage >= 35
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                        }`}
                      >
                        Confusion Score: {percentage}%
                        {item.confusion_count !== undefined
                          ? ` (${item.confusion_count} flags)`
                          : ''}
                      </span>

                    </div>

                    <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden flex">

                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          percentage >= 60
                            ? 'bg-rose-500'
                            : percentage >= 35
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                        }`}
                        style={{
                          width: `${Math.min(
                            Math.max(percentage, 0),
                            100
                          )}%`
                        }}
                      />

                    </div>

                    {item.notes && (
                      <span className="text-[9px] text-slate-500 italic block pl-1">
                        Note: {item.notes}
                      </span>
                    )}

                  </div>
                );
              })}

            </div>
          )}

        </div>

        {/* CONFUSING CONCEPTS */}
        <div className="glass-panel rounded-2xl p-6 space-y-6">

          <h4 className="font-outfit font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary-400" />
            Ranked Confusing Concepts
          </h4>

          {confusingConcepts.length === 0 ? (
            <div className="text-center py-8">

              <AlertTriangle className="h-7 w-7 text-slate-600 mx-auto mb-3" />

              <p className="text-xs text-slate-500">
                No confusing concepts available.
              </p>

            </div>
          ) : (
            <div className="space-y-4">

              {confusingConcepts.map((concept, index) => {

                const rank =
                  concept.rank !== undefined
                    ? concept.rank
                    : index + 1;

                const level =
                  concept.level || 'Unknown';

                return (
                  <div
                    key={`${lectureId}-concept-${index}`}
                    className="p-4 bg-brand-950/40 border border-slate-900 rounded-xl flex gap-3.5 items-center justify-between"
                  >

                    <div className="flex items-center gap-3">

                      <span className="h-6 w-6 rounded-full bg-brand-900 border border-slate-800 text-[10px] text-slate-300 font-bold flex items-center justify-center">
                        {rank}
                      </span>

                      <span className="text-xs font-bold text-slate-200">
                        {concept.name || 'Unknown Concept'}
                      </span>

                    </div>

                    <span
                      className={`text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                        level === 'High'
                          ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                          : level === 'Medium'
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {level}
                    </span>

                  </div>
                );
              })}

            </div>
          )}

        </div>

      </div>

      {/* =========================================================
          FACULTY SUGGESTIONS
      ========================================================= */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 bg-brand-900/40 space-y-4">

        <h4 className="font-outfit font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
          <Info className="h-4 w-4 text-primary-400" />
          Instructor Action Suggestions
        </h4>

        {suggestionsData?.suggestions &&
        Array.isArray(suggestionsData.suggestions) &&
        suggestionsData.suggestions.length > 0 ? (
          <div className="space-y-3">

            {suggestionsData.suggestions.map(
              (suggestion, index) => (
                <div
                  key={`${lectureId}-suggestion-${index}`}
                  className="p-3.5 bg-brand-950/40 border border-slate-900 rounded-xl text-xs text-slate-300 leading-relaxed"
                >
                  {suggestion}
                </div>
              )
            )}

          </div>
        ) : (
          <div className="text-slate-500 italic text-xs">
            No suggestions calculated for this lecture.
          </div>
        )}

      </div>

      {/* =========================================================
          TELEMETRY
      ========================================================= */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 bg-brand-900/40 space-y-6">

        <h4 className="font-outfit font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-primary-400" />
          Aggregated Telemetry Summary
        </h4>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">

          <div className="p-3 bg-brand-950/40 border border-slate-900 rounded-xl text-center space-y-1">

            <span className="text-[9px] text-slate-500 font-semibold block uppercase">
              Total Plays
            </span>

            <span className="text-base font-bold text-white">
              {totalPlays}
            </span>

          </div>

          <div className="p-3 bg-brand-950/40 border border-slate-900 rounded-xl text-center space-y-1">

            <span className="text-[9px] text-slate-500 font-semibold block uppercase">
              Pauses
            </span>

            <span className="text-base font-bold text-white">
              {activePauses}
            </span>

          </div>

          <div className="p-3 bg-brand-950/40 border border-slate-900 rounded-xl text-center space-y-1">

            <span className="text-[9px] text-slate-500 font-semibold block uppercase">
              Rewinds
            </span>

            <span className="text-base font-bold text-white">
              {activeRewinds}
            </span>

          </div>

          <div className="p-3 bg-brand-950/40 border border-slate-900 rounded-xl text-center space-y-1">

            <span className="text-[9px] text-slate-500 font-semibold block uppercase">
              Forward Seeks
            </span>

            <span className="text-base font-bold text-white">
              {activeSeeks}
            </span>

          </div>

          <div className="p-3 bg-brand-950/40 border border-slate-900 rounded-xl text-center space-y-1">

            <span className="text-[9px] text-slate-500 font-semibold block uppercase">
              Speed Adjustments
            </span>

            <span className="text-base font-bold text-white">
              {activeSpeedChanges}
            </span>

          </div>

        </div>

        {activeSessionMatches &&
        Array.isArray(activeSession.repeated_timestamps) &&
        activeSession.repeated_timestamps.length > 0 && (
          <div className="p-4 bg-brand-950/60 border border-slate-900 rounded-xl space-y-2">

            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">
              Active Session Revisited Segments
            </span>

            <div className="flex flex-wrap gap-2">

              {activeSession.repeated_timestamps.map(
                (timestamp, index) => (
                  <span
                    key={`${lectureId}-timestamp-${index}`}
                    className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs rounded-lg font-bold"
                  >
                    {timestamp}
                  </span>
                )
              )}

            </div>

          </div>
        )}

      </div>

      {/* =========================================================
          STUDENT PERFORMANCE
      ========================================================= */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 bg-brand-900/40">

        <h4 className="font-outfit font-bold text-xs text-white uppercase tracking-wider mb-6 flex items-center gap-2">
          <Users className="h-4 w-4 text-primary-400" />
          Student Performance Records
        </h4>

        {displayStudents.length === 0 ? (
          <div className="py-10 text-center">

            <Users className="h-8 w-8 text-slate-600 mx-auto mb-3" />

            <p className="text-sm font-semibold text-slate-300">
              No student data available
            </p>

            <p className="text-xs text-slate-500 mt-1">
              Student activity for this lecture will appear here when available.
            </p>

          </div>
        ) : (
          <div className="overflow-x-auto">

            <table className="w-full text-left text-xs">

              <thead>

                <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">

                  <th className="pb-3 px-4">
                    Student
                  </th>

                  <th className="pb-3 text-center">
                    Watch Percentage
                  </th>

                  <th className="pb-3 text-center">
                    Watch Duration
                  </th>

                  <th className="pb-3 text-center">
                    Quiz Score
                  </th>

                  <th className="pb-3 text-center">
                    Confusion Level
                  </th>

                  <th className="pb-3 text-center">
                    Risk Status
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-slate-800/40">

                {displayStudents.map((student, index) => {

                  const confusionLevel =
                    student.confusion_level ||
                    'No Data';

                  const riskLevel =
                    student.risk_level ||
                    'No Data';

                  return (
                    <tr
                      key={`${lectureId}-student-${index}`}
                      className="text-slate-300 hover:bg-brand-900/10 transition-colors"
                    >

                      <td className="py-4 px-4 font-semibold text-slate-200">

                        <div className="flex items-center gap-3">

                          <div className="h-7 w-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-[10px] text-slate-300">
                            {(student.name || 'Student')
                              .split(' ')
                              .map((part) => part[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>

                          <span>
                            {student.name || 'Unknown Student'}
                          </span>

                        </div>

                      </td>

                      <td className="py-4 text-center font-mono font-bold text-slate-200">
                        {student.watch_percentage ?? 0}%
                      </td>

                      <td className="py-4 text-center font-mono text-slate-400">
                        {student.watch_time || 'N/A'}
                      </td>

                      <td className="py-4 text-center font-bold text-primary-400">
                        {student.quiz_score ?? 'N/A'}
                      </td>

                      <td className="py-4 text-center">

                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider ${
                            confusionLevel === 'High'
                              ? 'bg-rose-500/10 text-rose-400'
                              : confusionLevel === 'Medium'
                                ? 'bg-amber-500/10 text-amber-400'
                                : confusionLevel === 'Low'
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : 'bg-slate-500/10 text-slate-400'
                          }`}
                        >
                          {confusionLevel}
                        </span>

                      </td>

                      <td className="py-4 text-center">

                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider ${
                            riskLevel === 'High'
                              ? 'bg-rose-500/10 text-rose-400'
                              : riskLevel === 'Medium'
                                ? 'bg-amber-500/10 text-amber-400'
                                : riskLevel === 'Low'
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : 'bg-slate-500/10 text-slate-400'
                          }`}
                        >
                          {riskLevel}
                        </span>

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