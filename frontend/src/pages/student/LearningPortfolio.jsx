import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award,
  BookOpen,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Cpu,
  Sparkles,
  BarChart3,
  Calendar,
  Target,
  GraduationCap,
  Clock,
  ArrowUpRight,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { studentAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function LearningPortfolio() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeframe, setTimeframe] = useState('daily'); // 'daily' | 'weekly' | 'monthly'
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const fetchPortfolio = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await studentAPI.getPortfolio();
      setData(res);
    } catch (err) {
      console.warn('Portfolio fetch failed, attempting dashboard fallback:', err);
      try {
        const fallback = await studentAPI.getDashboard();
        const nameParts = (fallback.student_name || user?.full_name || 'Student').trim().split(' ');
        const initials = nameParts.length >= 2
          ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
          : (nameParts[0]?.slice(0, 2) || 'ST').toUpperCase();

        setData({
          student: {
            name: fallback.student_name || user?.full_name || 'Active Student',
            email: user?.email || '',
            student_id: user?.student_id || `STU-${(user?.id || '2026').slice(0, 8).toUpperCase()}`,
            initials: initials,
            status: 'Active Enrollment',
            program: 'Computer Science & Engineering',
            primary_course: fallback.recent_activity?.[0]?.title ? 'Core Course Track' : 'CS Curriculum',
          },
          metrics: {
            knowledge_coverage: fallback.overall_progress || 0,
            retention_index: fallback.average_engagement || 0,
            average_test_score: 0,
            total_tests: 0,
            passed_tests: 0,
            pass_rate: 0,
            completed_lectures: fallback.completed_lectures || 0,
            total_lectures: fallback.total_lectures || 0,
          },
          cognitive_profile: {
            style: 'Diagnostic Stage',
            insight: 'Cognitive retention baseline is established as you complete lectures and topic quizzes.',
          },
          behavioral_insights: {
            summary: 'Your test performance and mastery metrics will populate here automatically.',
            weak_topics: fallback.weak_topics?.map(w => w.topic) || [],
          },
          daily_monitoring: [],
          weekly_monitoring: [],
          monthly_monitoring: [],
          recent_tests: [],
          competency_breakdown: fallback.recent_activity?.map(act => ({
            id: act.id,
            title: act.title,
            progress: act.progress,
            quiz_score: null,
            quiz_passed: null,
            quiz_attempts: 0,
          })) || [],
        });
      } catch (fallbackErr) {
        setError(fallbackErr?.message || 'Failed to load learning portfolio data.');
        setData(null);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-4 bg-[#F8F8F2] text-[#68766B]">
        <div className="h-10 w-10 rounded-full border-2 border-t-[#315C46] border-slate-200 animate-spin"></div>
        <p className="text-xs text-[#68766B] font-medium tracking-wide">Compiling your cognitive portfolio...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center bg-[#F8F8F2] text-[#68766B]">
        <div className="bg-amber-50 p-10 rounded-3xl border border-amber-200 text-center max-w-md space-y-4">
          <AlertCircle className="h-10 w-10 text-amber-600 mx-auto" />
          <h4 className="font-outfit font-bold text-amber-900 text-lg">Unable to Load Portfolio</h4>
          <p className="text-xs text-amber-800 leading-relaxed">
            {error || 'Unable to connect to the cognitive analytics service.'}
          </p>
          <button
            onClick={fetchPortfolio}
            className="px-5 py-2.5 bg-[#315C46] hover:bg-[#264B39] text-[#26332A] font-bold rounded-full text-xs uppercase tracking-wider transition-all inline-flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const {
    student,
    metrics,
    cognitive_profile,
    behavioral_insights,
    daily_monitoring = [],
    weekly_monitoring = [],
    monthly_monitoring = [],
    recent_tests = [],
    competency_breakdown = [],
  } = data;

  const hasActivity = (competency_breakdown && competency_breakdown.length > 0) || (recent_tests && recent_tests.length > 0);
  const hasTests = recent_tests && recent_tests.length > 0;

  // Select active monitoring series based on dropdown selection
  let activeSeries = daily_monitoring;
  if (timeframe === 'weekly') activeSeries = weekly_monitoring;
  if (timeframe === 'monthly') activeSeries = monthly_monitoring;

  const hasMonitoring = activeSeries && activeSeries.length > 0;

  // Color themes according to timeframe
  const themeConfig = {
    daily: {
      label: 'Daily',
      title: 'Daily Test Score Monitoring',
      subtitle: 'Day-by-day quiz assessment trajectory and mastery trends',
      strokeColor: '#315C46', // CogniTrace Teal
      gradientStart: '#315C46',
      badgeClass: 'bg-emerald-100/90 border-emerald-200/70 text-emerald-800',
      activeTabClass: 'bg-black text-white font-bold',
      pointColor: '#315C46',
    },
    weekly: {
      label: 'Weekly',
      title: 'Weekly Test Score Monitoring',
      subtitle: 'Week-over-week consolidated quiz performance and retention momentum',
      strokeColor: '#0284c7', // Sky 600
      gradientStart: '#0284c7',
      badgeClass: 'bg-sky-50 border-sky-200 text-sky-800',
      activeTabClass: 'bg-black text-white font-bold',
      pointColor: '#0284c7',
    },
    monthly: {
      label: 'Monthly',
      title: 'Monthly Test Score Monitoring',
      subtitle: 'Long-term monthly concept retention curve and cumulative trajectory',
      strokeColor: '#7c3aed', // Purple 600
      gradientStart: '#7c3aed',
      badgeClass: 'bg-purple-50 border-purple-200 text-purple-800',
      activeTabClass: 'bg-black text-white font-bold',
      pointColor: '#7c3aed',
    },
  };

  const currentTheme = themeConfig[timeframe] || themeConfig.daily;

  // SVG Chart Dimensions & Calculations
  const chartWidth = 640;
  const chartHeight = 180;
  const paddingX = 48;
  const paddingY = 25;
  const plotWidth = chartWidth - paddingX * 2;
  const plotHeight = chartHeight - paddingY * 2;

  // Compute SVG Points for current timeframe
  let chartPoints = [];
  if (hasMonitoring) {
    if (activeSeries.length === 1) {
      const x = chartWidth / 2;
      const y = paddingY + plotHeight - (Math.min(100, Math.max(0, activeSeries[0].average_score)) / 100) * plotHeight;
      chartPoints = [{ ...activeSeries[0], x, y }];
    } else {
      chartPoints = activeSeries.map((item, idx) => {
        const x = paddingX + (idx / (activeSeries.length - 1)) * plotWidth;
        const y = paddingY + plotHeight - (Math.min(100, Math.max(0, item.average_score)) / 100) * plotHeight;
        return { ...item, x, y };
      });
    }
  }

  const pathD = chartPoints.length > 1
    ? chartPoints.reduce((acc, curr, idx) => {
        return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
      }, '')
    : '';

  const areaD = chartPoints.length > 1
    ? `${pathD} L ${chartPoints[chartPoints.length - 1].x} ${paddingY + plotHeight} L ${chartPoints[0].x} ${paddingY + plotHeight} Z`
    : '';

  const passLineY = paddingY + plotHeight - (70 / 100) * plotHeight;

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-8 max-w-5xl mx-auto bg-[#F8F8F2] text-[#26332A]">
      
      {/* Portfolio Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#D9E1D2] pb-6">
        <div className="space-y-1">
          <h3 className="font-outfit font-extrabold text-2xl text-[#26332A]">Learning Portfolio</h3>
          <p className="text-xs sm:text-sm text-[#68766B]">
            Your live cognitive and mastery record synthesized directly from your study events and quiz performances.
          </p>
        </div>
        <button
          onClick={fetchPortfolio}
          className="px-4 py-2 bg-[#FCFCF8] border border-[#D9E1D2] hover:bg-[#E8EDE1] text-[#315C46] rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
        >
          <RefreshCw className="h-3 w-3" /> Sync Data
        </button>
      </div>

      {/* Dynamic Student Profile Card */}
      <div className="bg-[#E2E8D8] rounded-3xl p-6 border border-[#D9E1D2] flex flex-col md:flex-row gap-6 items-center shadow-sm">
        <div className="h-16 w-16 rounded-2xl bg-[#FCFCF8] border border-[#D9E1D2] flex items-center justify-center text-[#315C46] font-extrabold text-2xl font-outfit shrink-0 shadow-sm">
          {student.initials || 'ST'}
        </div>
        <div className="flex-1 text-center md:text-left space-y-1">
          <div className="flex flex-col md:flex-row md:items-center gap-2">
            <h4 className="font-outfit font-bold text-lg text-[#26332A]">{student.name}</h4>
            <span className="text-[9px] font-bold bg-emerald-100/90 border border-emerald-200/70 text-emerald-800 px-2.5 py-0.5 rounded-full w-max mx-auto md:mx-0">
              {student.status}
            </span>
            {student.email && (
              <span className="text-xs text-[#68766B] font-mono hidden lg:inline">
                ({student.email})
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 text-left">
            <div>
              <span className="text-[9px] text-black font-extrabold uppercase tracking-wider block">Student ID</span>
              <span className="text-xs text-black font-mono font-extrabold">{student.student_id}</span>
            </div>
            <div>
              <span className="text-[9px] text-black font-extrabold uppercase tracking-wider block">Program / Track</span>
              <span className="text-xs text-black font-extrabold">{student.program}</span>
            </div>
            <div>
              <span className="text-[9px] text-black font-extrabold uppercase tracking-wider block">Curriculum / Course</span>
              <span className="text-xs text-black font-extrabold truncate block" title={student.primary_course}>
                {student.primary_course}
              </span>
            </div>
            <div>
              <span className="text-[9px] text-black font-extrabold uppercase tracking-wider block">Tests Evaluated</span>
              <span className="text-xs text-[#315C46] font-extrabold">
                {metrics.total_tests} {metrics.total_tests === 1 ? 'Quiz' : 'Quizzes'} Logged
              </span>
            </div>
          </div>
        </div>
      </div>

      {!hasActivity ? (
        <div className="bg-[#E2E8D8] p-16 text-center rounded-3xl border border-[#D9E1D2] space-y-4 shadow-sm">
          <GraduationCap className="h-10 w-10 text-[#315C46] mx-auto" />
          <p className="text-base text-black font-extrabold">No learning or quiz activity recorded yet.</p>
          <p className="text-xs text-black/80 max-w-sm mx-auto leading-relaxed font-medium">
            Your dynamic learning metrics, test score trajectory, and concept retention will compile automatically as you watch lectures and complete quizzes.
          </p>
          <button
            onClick={() => navigate('/student/lectures')}
            className="px-5 py-2.5 bg-[#315C46] hover:bg-[#264B39] text-white font-bold rounded-full text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm"
          >
            Explore Lectures
          </button>
        </div>
      ) : (
        <>
          {/* Overview Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Knowledge Coverage */}
            <div className="bg-[#E2E8D8] p-6 rounded-2xl border border-[#D9E1D2] shadow-sm">
              <span className="text-[10px] text-[#26332A] font-bold uppercase tracking-wider block mb-1">
                Knowledge Coverage
              </span>
              <h4 className="text-3xl font-extrabold font-outfit text-[#26332A]">
                {metrics.knowledge_coverage}%
              </h4>
              <p className="text-xs text-[#68766B] mt-2">
                Across {metrics.total_lectures} enrolled lecture {metrics.total_lectures === 1 ? 'module' : 'modules'}
              </p>
            </div>

            {/* Dynamic Cognitive Profile */}
            <div className="bg-[#E2E8D8] p-6 rounded-2xl border border-[#D9E1D2] shadow-sm">
              <span className="text-[10px] text-[#26332A] font-bold uppercase tracking-wider block mb-1">
                Cognitive Profile
              </span>
              <h4 className="text-xl font-bold font-outfit text-[#315C46] mt-2 flex items-center gap-1.5">
                <TrendingUp className="h-5 w-5" /> {cognitive_profile.style}
              </h4>
              <p className="text-xs text-[#68766B] mt-2 line-clamp-2 leading-relaxed">
                {cognitive_profile.insight}
              </p>
            </div>

            {/* Retention Index */}
            <div className="bg-[#E2E8D8] p-6 rounded-2xl border border-[#D9E1D2] shadow-sm">
              <span className="text-[10px] text-[#26332A] font-bold uppercase tracking-wider block mb-1">
                Retention Index
              </span>
              <h4 className="text-3xl font-extrabold font-outfit text-[#26332A]">
                {metrics.retention_index}%
              </h4>
              <p className="text-xs text-[#68766B] mt-2">
                {hasTests
                  ? `Computed from ${metrics.total_tests} test ${metrics.total_tests === 1 ? 'attempt' : 'attempts'} & engagement`
                  : 'Derived from active session comprehension telemetry'}
              </p>
            </div>

          </div>

          {/* ============================================================ */}
          {/* MULTI-TIMEFRAME SCORE MONITORING GRAPH (DAILY / WEEKLY / MONTHLY) */}
          {/* ============================================================ */}
          <div className="bg-[#E2E8D8] rounded-3xl p-6 border border-[#D9E1D2] space-y-6 shadow-sm">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-outfit font-bold text-sm text-[#26332A] flex items-center gap-2">
                    <BarChart3 className="h-4.5 w-4.5" style={{ color: currentTheme.strokeColor }} /> {currentTheme.title}
                  </h4>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${currentTheme.badgeClass}`}>
                    {currentTheme.label} View
                  </span>
                </div>
                <p className="text-xs text-[#68766B] mt-0.5">
                  {currentTheme.subtitle}
                </p>
              </div>

              {/* Timeframe Selection Pills & Stat Counters */}
              <div className="flex flex-wrap items-center gap-3">
                
                {/* Segmented Period Selection Pills */}
                <div className="flex items-center p-1 bg-[#FCFCF8] border border-[#D9E1D2] rounded-full shadow-xs">
                  {['daily', 'weekly', 'monthly'].map((tf) => (
                    <button
                      key={tf}
                      onClick={() => {
                        setTimeframe(tf);
                        setHoveredPoint(null);
                      }}
                      className={`px-3.5 py-1.5 text-xs font-bold rounded-full capitalize transition-all cursor-pointer ${
                        timeframe === tf
                          ? 'bg-black text-white shadow-xs'
                          : 'text-[#68766B] hover:text-black hover:bg-slate-100'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>

                {/* Mini Metric Counters */}
                <div className="hidden sm:flex items-center gap-2">
                  <div className="bg-[#FCFCF8] border border-[#D9E1D2] px-3 py-1 rounded-xl text-center shadow-xs">
                    <span className="text-[9px] text-[#26332A] font-bold uppercase block">Tests</span>
                    <span className="text-xs font-bold text-[#26332A] font-mono">{metrics.total_tests}</span>
                  </div>
                  <div className="bg-[#FCFCF8] border border-[#D9E1D2] px-3 py-1 rounded-xl text-center shadow-xs">
                    <span className="text-[9px] text-[#26332A] font-bold uppercase block">Avg Score</span>
                    <span className="text-xs font-bold text-[#315C46] font-mono">{metrics.average_test_score}%</span>
                  </div>
                  <div className="bg-[#FCFCF8] border border-[#D9E1D2] px-3 py-1 rounded-xl text-center shadow-xs">
                    <span className="text-[9px] text-[#26332A] font-bold uppercase block">Pass Rate</span>
                    <span className="text-xs font-bold text-emerald-700 font-mono">{metrics.pass_rate}%</span>
                  </div>
                </div>

              </div>
            </div>

            {hasMonitoring ? (
              <div className="space-y-3">
                {/* Responsive SVG Chart */}
                <div className="w-full overflow-x-auto">
                  <div className="min-w-[500px]">
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-44 overflow-visible">
                      <defs>
                        <linearGradient id={`gradient-${timeframe}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={currentTheme.gradientStart} stopOpacity="0.25" />
                          <stop offset="100%" stopColor={currentTheme.gradientStart} stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Grid Lines */}
                      {[100, 75, 50, 25, 0].map((val) => {
                        const y = paddingY + plotHeight - (val / 100) * plotHeight;
                        return (
                          <g key={val}>
                            <line
                              x1={paddingX}
                              y1={y}
                              x2={chartWidth - paddingX}
                              y2={y}
                              stroke="#D9E1D2"
                              strokeWidth="1"
                              strokeDasharray={val === 0 ? 'none' : '3 3'}
                            />
                            <text
                              x={paddingX - 10}
                              y={y + 3}
                              fill="#64748b"
                              fontSize="9"
                              fontFamily="monospace"
                              textAnchor="end"
                            >
                              {val}%
                            </text>
                          </g>
                        );
                      })}

                      {/* 70% Pass Threshold Line */}
                      <line
                        x1={paddingX}
                        y1={passLineY}
                        x2={chartWidth - paddingX}
                        y2={passLineY}
                        stroke="#315C46"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                        strokeOpacity="0.7"
                      />
                      <text
                        x={chartWidth - paddingX}
                        y={passLineY - 4}
                        fill="#315C46"
                        fontSize="8"
                        fontFamily="monospace"
                        fontWeight="bold"
                        textAnchor="end"
                      >
                        PASS THRESHOLD (70%)
                      </text>

                      {/* Area Fill */}
                      {chartPoints.length > 1 && (
                        <path d={areaD} fill={`url(#gradient-${timeframe})`} />
                      )}

                      {/* Trend Line */}
                      {chartPoints.length > 1 && (
                        <path
                          d={pathD}
                          fill="none"
                          stroke={currentTheme.strokeColor}
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}

                      {/* Data Points */}
                      {chartPoints.map((pt, idx) => {
                        const isHovered = hoveredPoint === idx;
                        const isPassed = pt.average_score >= 70;
                        return (
                          <g
                            key={idx}
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredPoint(idx)}
                            onMouseLeave={() => setHoveredPoint(null)}
                          >
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r={isHovered ? 7 : 5}
                              fill={isPassed ? '#315C46' : isHovered ? currentTheme.pointColor : '#f59e0b'}
                              stroke="#ffffff"
                              strokeWidth="2"
                              className="transition-all duration-150"
                            />
                            {/* X-axis date label */}
                            <text
                              x={pt.x}
                              y={chartHeight - 4}
                              fill={isHovered ? '#0F172A' : '#64748B'}
                              fontSize="10"
                              fontFamily="sans-serif"
                              fontWeight={isHovered ? 'bold' : 'normal'}
                              textAnchor="middle"
                            >
                              {pt.date}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>

                {/* Hover / Point Details Pill */}
                {hoveredPoint !== null && chartPoints[hoveredPoint] && (
                  <div className="bg-[#FCFCF8] border border-[#D9E1D2] p-3 rounded-2xl flex items-center justify-between text-xs animate-fadeIn shadow-xs">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" style={{ color: currentTheme.strokeColor }} />
                      <span className="font-bold text-[#26332A]">{chartPoints[hoveredPoint].date}</span>
                      <span className="text-[#68766B]">({chartPoints[hoveredPoint].total_tests} {chartPoints[hoveredPoint].total_tests === 1 ? 'test' : 'tests'} logged)</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span>
                        Average: <strong className="font-mono" style={{ color: currentTheme.strokeColor }}>{chartPoints[hoveredPoint].average_score}%</strong>
                      </span>
                      <span>
                        Peak: <strong className="text-emerald-700 font-mono">{chartPoints[hoveredPoint].highest_score}%</strong>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#E2E8D8] rounded-2xl border border-[#D9E1D2] p-8 text-center space-y-2">
                <Target className="h-8 w-8 text-[#68766B] mx-auto" />
                <p className="text-xs text-[#26332A] font-bold">No {timeframe} test score trajectory recorded yet.</p>
                <p className="text-[11px] text-[#68766B] max-w-sm mx-auto">
                  Take the concept quiz at the end of any lecture to start plotting your {timeframe} mastery curve.
                </p>
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* RECENT TEST RESULTS & DETAILED HISTORY */}
          {/* ============================================================ */}
          <div className="bg-[#E2E8D8] rounded-3xl p-6 border border-[#D9E1D2] space-y-4 shadow-sm">
            <div className="flex justify-between items-center">
              <h4 className="font-outfit font-bold text-sm text-[#26332A] flex items-center gap-2">
                <Award className="h-4.5 w-4.5 text-[#315C46]" /> Recent Test Results
              </h4>
              {hasTests && (
                <span className="text-[11px] text-[#26332A] font-semibold">
                  {recent_tests.length} recorded {recent_tests.length === 1 ? 'attempt' : 'attempts'}
                </span>
              )}
            </div>

            {hasTests ? (
              <div className="divide-y divide-[#2A4D3B] overflow-hidden rounded-2xl border border-[#D9E1D2] bg-[#E2E8D8] shadow-xs">
                {recent_tests.map((test) => {
                  const isPassed = test.passed;
                  return (
                    <div
                      key={test.id}
                      className="p-4 bg-[#FCFCF8] hover:bg-[#E8EDE1] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h5 className="text-xs font-bold text-[#26332A]">{test.lecture_title}</h5>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                              isPassed
                                ? 'bg-emerald-100/90 border-emerald-200/70 text-emerald-800'
                                : 'bg-rose-50 border-rose-200 text-rose-700'
                            }`}
                          >
                            {isPassed ? 'Passed' : 'Needs Review'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-[#68766B] font-mono">
                          <span className="flex items-center gap-1 font-sans">
                            <Clock className="h-3 w-3 text-[#68766B]" /> {test.date} {test.time && `at ${test.time}`}
                          </span>
                          <span>•</span>
                          <span className="capitalize">{test.difficulty} difficulty</span>
                          <span>•</span>
                          <span>
                            {test.correct_answers} / {test.total_questions} correct
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        <div className="text-right">
                          <span className="text-[9px] text-[#26332A] font-bold uppercase tracking-wider block">Score</span>
                          <span
                            className={`text-lg font-outfit font-extrabold ${
                              isPassed ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {test.score}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-[#E2E8D8] rounded-2xl border border-[#D9E1D2] p-8 text-center space-y-2">
                <HelpCircle className="h-8 w-8 text-[#68766B] mx-auto" />
                <p className="text-xs text-[#26332A] font-bold">No tests completed yet.</p>
                <p className="text-[11px] text-[#68766B] max-w-sm mx-auto">
                  Quizzes test retention of foundational concepts from your lectures. Pass scores will appear here.
                </p>
              </div>
            )}
          </div>

          {/* Detailed Concept Mastery & Behavioral Insights Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left column: Competency Breakdown */}
            <div className="bg-[#E2E8D8] p-6 rounded-3xl border border-[#D9E1D2] space-y-6 shadow-sm">
              <h4 className="font-outfit font-bold text-sm text-[#26332A] flex items-center gap-2">
                <BookOpen className="h-4.5 w-4.5 text-[#315C46]" /> Subject-level Competency Breakdown
              </h4>
              
              <div className="space-y-5">
                {competency_breakdown.map((act) => (
                  <div key={act.id} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-black font-extrabold truncate max-w-[70%]" title={act.title}>
                        {act.title}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {act.quiz_score !== null && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              act.quiz_passed
                                ? 'bg-[#315C46] text-white border border-[#D9E1D2]'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                          >
                            Quiz: {act.quiz_score}%
                          </span>
                        )}
                        <span className="text-[#26332A] font-bold font-mono text-[11px]">
                          {act.progress}% Watched
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#315C46] h-full rounded-full transition-all duration-300"
                        style={{ width: `${act.progress}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right column: Behavioral Analytics Insights */}
            <div className="bg-[#E2E8D8] p-6 rounded-3xl border border-[#D9E1D2] space-y-6 shadow-sm">
              <h4 className="font-outfit font-bold text-sm text-[#26332A] flex items-center gap-2">
                <Cpu className="h-4.5 w-4.5 text-[#315C46]" /> Behavioral Analytics Insights
              </h4>
              
              <div className="space-y-4 text-xs leading-relaxed text-[#68766B]">
                <div className="p-4 bg-[#FCFCF8] rounded-2xl border border-[#D9E1D2] space-y-2 shadow-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="font-bold text-[#26332A]">Interactive Concept Checkups</span>
                  </div>
                  <p>{behavioral_insights.summary}</p>
                </div>

                {behavioral_insights.weak_topics && behavioral_insights.weak_topics.length > 0 && (
                  <div className="p-4 bg-[#FCFCF8] rounded-2xl border border-[#D9E1D2] space-y-2 shadow-xs">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                      <span className="font-bold text-[#26332A]">Concepts Review List</span>
                    </div>
                    <p className="text-[11px] text-[#68766B]">
                      Concepts flagged from incorrect test answers or high confusion timestamps:
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {behavioral_insights.weak_topics.map((t, idx) => (
                        <span key={idx} className="bg-amber-50 border border-amber-200 text-amber-800 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </>
      )}

    </div>
  );
}
