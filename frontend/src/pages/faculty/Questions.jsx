import React, { useEffect, useState } from 'react';
import {
  Clock,
  MessageSquare,
  Info,
  Sparkles,
  AlertCircle,
  Award,
  RefreshCw
} from 'lucide-react';

export default function Questions() {
  const [lectures, setLectures] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [questions, setQuestions] = useState([]);
  const [confusionData, setConfusionData] = useState([]);
  const [suggestions, setSuggestions] = useState(null);

  const [loadingLectures, setLoadingLectures] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  const [activeTab, setActiveTab] = useState('questions');
  const [error, setError] = useState('');

  // ============================================================
  // LOAD REAL FACULTY LECTURES
  // ============================================================

  const fetchLectures = async () => {
    setLoadingLectures(true);
    setError('');

    try {
      const response = await fetch(
        '/api/faculty/lectures'
      );

      if (!response.ok) {
        throw new Error(
          `Failed to load lectures (${response.status})`
        );
      }

      const data = await response.json();

      const realLectures = Array.isArray(data)
        ? data.filter(
            lecture =>
              lecture &&
              lecture.id
          )
        : [];

      setLectures(realLectures);

      if (realLectures.length === 0) {
        setSelectedId('');
      } else {
        setSelectedId(currentId => {
          const stillExists = realLectures.some(
            lecture =>
              lecture.id === currentId
          );

          return stillExists
            ? currentId
            : realLectures[0].id;
        });
      }
    } catch (err) {
      console.error(
        'Faculty lectures loading error:',
        err
      );

      setLectures([]);
      setSelectedId('');
      setError(
        'Unable to load lectures from the Faculty backend.'
      );
    } finally {
      setLoadingLectures(false);
    }
  };

  // ============================================================
  // LOAD QUESTIONS + CONFUSION + SUGGESTIONS
  // ============================================================

  const fetchLectureData = async lectureId => {
    if (!lectureId) {
      setQuestions([]);
      setConfusionData([]);
      setSuggestions(null);
      return;
    }

    setLoadingData(true);
    setError('');

    try {
      const [
        questionsResponse,
        confusionResponse,
        suggestionsResponse
      ] = await Promise.all([
        fetch(
          `/api/faculty/lecture/${lectureId}/questions`
        ),

        fetch(
          `/api/faculty/lecture/${lectureId}/confusion`
        ),

        fetch(
          `/api/faculty/lecture/${lectureId}/suggestions`
        )
      ]);

      // --------------------------------------------------------
      // QUESTIONS
      // --------------------------------------------------------

      let questionsJson = [];

      if (questionsResponse.ok) {
        questionsJson =
          await questionsResponse.json();
      }

      setQuestions(
        Array.isArray(questionsJson)
          ? questionsJson
          : []
      );

      // --------------------------------------------------------
      // CONFUSION
      // --------------------------------------------------------

      let confusionJson = [];

      if (confusionResponse.ok) {
        confusionJson =
          await confusionResponse.json();
      }

      if (Array.isArray(confusionJson)) {
        setConfusionData(confusionJson);
      } else if (
        confusionJson &&
        Array.isArray(confusionJson.confusion)
      ) {
        setConfusionData(
          confusionJson.confusion
        );
      } else if (
        confusionJson &&
        Array.isArray(confusionJson.heatmap)
      ) {
        setConfusionData(
          confusionJson.heatmap
        );
      } else {
        setConfusionData([]);
      }

      // --------------------------------------------------------
      // SUGGESTIONS
      // --------------------------------------------------------

      let suggestionsJson = null;

      if (suggestionsResponse.ok) {
        suggestionsJson =
          await suggestionsResponse.json();
      }

      setSuggestions(
        suggestionsJson &&
        typeof suggestionsJson === 'object'
          ? suggestionsJson
          : null
      );

    } catch (err) {
      console.error(
        'Faculty lecture analytics loading error:',
        err
      );

      setQuestions([]);
      setConfusionData([]);
      setSuggestions(null);

      setError(
        'Unable to load analytics for this lecture.'
      );
    } finally {
      setLoadingData(false);
    }
  };

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    fetchLectures();
  }, []);

  // ============================================================
  // LOAD SELECTED LECTURE
  // ============================================================

  useEffect(() => {
    if (selectedId) {
      fetchLectureData(selectedId);
    }
  }, [selectedId]);

  // ============================================================
  // REFRESH
  // ============================================================

  const handleRefresh = async () => {
    await fetchLectures();

    if (selectedId) {
      await fetchLectureData(selectedId);
    }
  };

  // ============================================================
  // HELPERS
  // ============================================================

  const getLectureTitle = () => {
    const lecture = lectures.find(
      item =>
        item.id === selectedId
    );

    return (
      lecture?.title ||
      'Selected Lecture'
    );
  };

  const getValue = (
    object,
    possibleKeys,
    fallback = null
  ) => {
    if (
      !object ||
      typeof object !== 'object'
    ) {
      return fallback;
    }

    for (const key of possibleKeys) {
      if (
        object[key] !== undefined &&
        object[key] !== null
      ) {
        return object[key];
      }
    }

    return fallback;
  };

  const formatValue = value => {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return '—';
    }

    if (
      typeof value === 'object'
    ) {
      return JSON.stringify(value);
    }

    return String(value);
  };

  // ============================================================
  // LOADING LECTURES
  // ============================================================

  if (loadingLectures) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="h-8 w-8 rounded-full border-2 border-t-primary-500 border-[#D9E1D2] animate-spin"></div>
      </div>
    );
  }

  // ============================================================
  // NO LECTURES
  // ============================================================

  if (lectures.length === 0) {
    return (
      <div className="flex-1 p-8 overflow-y-auto bg-[#F8F8F2] text-[#26332A]">
        <div className="max-w-5xl mx-auto space-y-8">

          <div className="flex items-start justify-between gap-4 border-b border-[#D9E1D2] pb-6">

            <div>
              <h3 className="font-outfit font-extrabold text-2xl text-[#26332A]">
                Questions &amp; Confusion Insights
              </h3>

              <p className="text-sm text-[#68766B] mt-2">
                Review questions and confusion analytics
                generated from your actual Faculty lectures.
              </p>
            </div>

            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-black/10 border border-[#315C46]/20 text-[#315C46] hover:bg-black hover:text-[#26332A] transition-all text-xs font-bold"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>

          </div>

          <div className="glass-panel rounded-2xl p-10 text-center">

            <div className="mx-auto mb-5 h-14 w-14 rounded-full bg-slate-800/70 flex items-center justify-center">
              <Info className="h-7 w-7 text-[#68766B]" />
            </div>

            <h4 className="font-outfit font-bold text-lg text-[#26332A]">
              No Faculty Lectures Available
            </h4>

            <p className="text-sm text-[#68766B] mt-2 max-w-md mx-auto">
              Import a lecture from the Faculty lecture
              section first. Questions and confusion
              analytics will appear here when real data
              becomes available.
            </p>

            {error && (
              <p className="text-xs text-rose-400 mt-4">
                {error}
              </p>
            )}

          </div>

        </div>
      </div>
    );
  }

  // ============================================================
  // MAIN PAGE
  // ============================================================

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-8 max-w-5xl mx-auto bg-[#F8F8F2] text-[#26332A]">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-b border-[#D9E1D2] pb-6">

        <div className="space-y-2">

          <h3 className="font-outfit font-extrabold text-2xl text-[#26332A]">
            Questions &amp; Confusion Insights
          </h3>

          <p className="text-sm text-[#68766B]">
            Review student questions and analytics
            associated with the lectures currently stored
            in the Faculty backend.
          </p>

        </div>

        {/* Lecture selector + refresh */}

        <div className="flex items-center gap-2">

          <label className="text-xs font-semibold text-[#26332A]">
            Select Lecture:
          </label>

          <select
            value={selectedId}
            onChange={e =>
              setSelectedId(e.target.value)
            }
            className="bg-[#FCFCF8] border border-[#D9E1D2] px-3 py-1.5 rounded-lg text-xs font-semibold text-[#26332A] focus:outline-none focus:border-[#315C46] max-w-[260px]"
          >

            {lectures.map(lecture => (
              <option
                key={lecture.id}
                value={lecture.id}
              >
                {lecture.title}
              </option>
            ))}

          </select>

          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg bg-[#315C46] hover:bg-[#264B39] text-[#26332A] transition-all"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

        </div>

      </div>

      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
          {error}
        </div>
      )}

      {/* ======================================================
          SELECTED LECTURE
      ====================================================== */}

      <div className="glass-panel rounded-xl px-5 py-4 border-[#D9E1D2]">

        <span className="text-[9px] text-[#68766B] uppercase tracking-widest font-bold">
          Current Lecture
        </span>

        <div className="mt-1 text-sm font-bold text-[#26332A]">
          {getLectureTitle()}
        </div>

        <div className="mt-1 text-[10px] text-[#68766B] font-mono">
          ID: {selectedId}
        </div>

      </div>

      {/* ======================================================
          TABS
      ====================================================== */}

      <div className="flex border-b border-[#D9E1D2]">

        <button
          onClick={() =>
            setActiveTab('questions')
          }
          className={`px-6 py-3 font-outfit font-bold text-xs uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'questions'
              ? 'border-[#315C46] text-white'
              : 'border-transparent text-[#68766B] hover:text-[#26332A]'
          }`}
        >
          Aggregated Questions ({questions.length})
        </button>

        <button
          onClick={() =>
            setActiveTab('insights')
          }
          className={`px-6 py-3 font-outfit font-bold text-xs uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'insights'
              ? 'border-[#315C46] text-white'
              : 'border-transparent text-[#68766B] hover:text-[#26332A]'
          }`}
        >
          Confusion Insights
        </button>

      </div>

      {/* ======================================================
          LOADING
      ====================================================== */}

      {loadingData ? (

        <div className="glass-panel p-20 text-center rounded-2xl">

          <div className="h-8 w-8 rounded-full border-2 border-t-primary-500 border-[#D9E1D2] animate-spin mx-auto mb-4"></div>

          <p className="text-xs text-[#68766B]">
            Loading Faculty analytics...
          </p>

        </div>

      ) : activeTab === 'questions' ? (

        /* ====================================================
           QUESTIONS TAB
        ==================================================== */

        <div className="space-y-6">

          <h4 className="font-outfit font-bold text-xs text-[#68766B] uppercase tracking-widest pl-2">
            Questions Raised
          </h4>

          {questions.length === 0 ? (

            <div className="glass-panel p-10 text-center rounded-xl">

              <MessageSquare className="h-8 w-8 text-[#68766B] mx-auto mb-3" />

              <p className="text-sm text-[#68766B]">
                No student questions have been logged
                for this lecture yet.
              </p>

              <p className="text-xs text-[#68766B] mt-2">
                This section will use real questions
                when they are generated by the Faculty
                analytics backend.
              </p>

            </div>

          ) : (

            <div className="space-y-4">

              {questions.map((question, index) => {

                const count = getValue(
                  question,
                  ['count', 'frequency', 'asks'],
                  0
                );

                const questionText = getValue(
                  question,
                  ['question', 'text', 'query'],
                  'Question'
                );

                const answer = getValue(
                  question,
                  [
                    'suggested_answer',
                    'answer',
                    'response'
                  ],
                  null
                );

                return (
                  <div
                    key={
                      question.id ||
                      `${selectedId}-${index}`
                    }
                    className="glass-panel p-6 rounded-xl border-[#D9E1D2] flex gap-4"
                  >

                    <div className="flex flex-col items-center justify-center p-3 bg-[#D9E1D2]/40 rounded-xl border border-[#D9E1D2] text-[#68766B] shrink-0 select-none min-w-[70px]">

                      <MessageSquare className="h-5 w-5 text-[#315C46] mb-1" />

                      <span className="text-sm font-bold text-[#26332A]">
                        {formatValue(count)}
                      </span>

                      <span className="text-[7px] uppercase tracking-wider opacity-60 mt-0.5">
                        Asks
                      </span>

                    </div>

                    <div className="flex-1 space-y-3">

                      <h5 className="font-outfit font-bold text-sm text-[#26332A] leading-snug">
                        "{formatValue(questionText)}"
                      </h5>

                      {answer && (
                        <div className="p-3 bg-[#D9E1D2]/40 rounded-lg border border-[#D9E1D2] flex gap-2.5 text-xs text-[#68766B] leading-relaxed">

                          <Sparkles className="h-4 w-4 text-[#315C46] shrink-0 mt-0.5" />

                          <div>

                            <span className="font-bold text-[#26332A] block mb-0.5">
                              Suggested Answer:
                            </span>

                            {formatValue(answer)}

                          </div>

                        </div>
                      )}

                    </div>

                  </div>
                );
              })}

            </div>
          )}

        </div>

      ) : (

        /* ====================================================
           CONFUSION INSIGHTS TAB
        ==================================================== */

        <div className="space-y-8">

          {/* ==================================================
              CONFUSION DATA
          ================================================== */}

          <div className="glass-panel p-6 rounded-2xl">

            <h5 className="font-outfit font-bold text-xs text-[#26332A] uppercase tracking-wider flex items-center gap-1.5 mb-5">

              <AlertCircle className="h-4 w-4 text-[#315C46]" />

              Confusion Analytics

            </h5>

            {confusionData.length === 0 ? (

              <div className="p-8 rounded-xl bg-[#D9E1D2]/40 border border-[#D9E1D2] text-center">

                <AlertCircle className="h-7 w-7 text-[#68766B] mx-auto mb-3" />

                <p className="text-sm text-[#68766B]">
                  No confusion analytics available for
                  this lecture yet.
                </p>

                <p className="text-xs text-[#68766B] mt-2">
                  Real confusion events will appear here
                  when student telemetry is available.
                </p>

              </div>

            ) : (

              <div className="space-y-3">

                {confusionData.map(
                  (item, index) => {

                    const timestamp =
                      getValue(
                        item,
                        [
                          'timestamp',
                          'time',
                          'segment',
                          'start'
                        ],
                        null
                      );

                    const score =
                      getValue(
                        item,
                        [
                          'confusion_score',
                          'score',
                          'value',
                          'frequency'
                        ],
                        null
                      );

                    const reason =
                      getValue(
                        item,
                        [
                          'reason',
                          'text',
                          'description',
                          'event'
                        ],
                        null
                      );

                    return (
                      <div
                        key={
                          item.id ||
                          `${selectedId}-confusion-${index}`
                        }
                        className="p-4 bg-[#D9E1D2]/40 border border-[#D9E1D2] rounded-xl"
                      >

                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">

                          <div className="flex items-center gap-3">

                            {timestamp !== null && (
                              <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/25 text-amber-400 rounded-lg font-bold font-mono text-xs">
                                {formatValue(timestamp)}
                              </span>
                            )}

                            {reason !== null && (
                              <span className="text-xs text-[#68766B]">
                                {formatValue(reason)}
                              </span>
                            )}

                          </div>

                          {score !== null && (
                            <span className="text-xs font-bold text-[#315C46]">
                              {formatValue(score)}
                            </span>
                          )}

                        </div>

                        {/* Additional real backend fields */}

                        <div className="mt-3 flex flex-wrap gap-2">

                          {Object.entries(item)
                            .filter(
                              ([key]) =>
                                ![
                                  'id',
                                  'timestamp',
                                  'time',
                                  'segment',
                                  'start',
                                  'confusion_score',
                                  'score',
                                  'value',
                                  'frequency',
                                  'reason',
                                  'text',
                                  'description',
                                  'event'
                                ].includes(key)
                            )
                            .map(
                              ([key, value]) => (
                                <span
                                  key={key}
                                  className="text-[10px] px-2 py-1 rounded-md bg-[#FCFCF8] text-[#68766B]"
                                >
                                  {key}: {formatValue(value)}
                                </span>
                              )
                            )}

                        </div>

                      </div>
                    );
                  }
                )}

              </div>
            )}

          </div>

          {/* ==================================================
              SUGGESTIONS / QUALITY DATA
          ================================================== */}

          <div className="glass-panel p-6 rounded-2xl">

            <h5 className="font-outfit font-bold text-xs text-[#26332A] uppercase tracking-wider flex items-center gap-1.5 mb-5">

              <Award className="h-4 w-4 text-[#315C46]" />

              Faculty Suggestions

            </h5>

            {!suggestions ? (

              <div className="p-8 rounded-xl bg-[#D9E1D2]/40 border border-[#D9E1D2] text-center">

                <Info className="h-7 w-7 text-[#68766B] mx-auto mb-3" />

                <p className="text-sm text-[#68766B]">
                  No faculty suggestions are available
                  for this lecture yet.
                </p>

              </div>

            ) : (

              <div className="space-y-5">

                {/* Quality Score */}

                {suggestions.quality_score !==
                  undefined && (

                  <div className="p-4 bg-[#D9E1D2]/40 border border-[#D9E1D2] rounded-xl">

                    <span className="text-[9px] text-[#68766B] uppercase tracking-widest font-bold">
                      Quality Score
                    </span>

                    <div className="text-3xl font-extrabold text-black font-mono mt-1">
                      {formatValue(
                        suggestions.quality_score
                      )}
                      <span className="text-sm text-black/70 ml-1 font-bold">
                        /100
                      </span>
                    </div>

                  </div>
                )}

                {/* Metrics */}

                {suggestions.metrics &&
                  typeof suggestions.metrics ===
                    'object' && (

                  <div>

                    <h6 className="text-xs font-bold text-[#68766B] mb-3">
                      Metrics
                    </h6>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

                      {Object.entries(
                        suggestions.metrics
                      ).map(
                        ([key, value]) => (
                          <div
                            key={key}
                            className="p-3 bg-[#D9E1D2]/40 border border-[#D9E1D2] rounded-xl"
                          >

                            <span className="text-[9px] text-[#68766B] uppercase tracking-wider block">
                              {key}
                            </span>

                            <span className="text-sm font-bold text-[#26332A] mt-1 block">
                              {formatValue(value)}
                            </span>

                          </div>
                        )
                      )}

                    </div>

                  </div>
                )}

                {/* Strengths */}

                {Array.isArray(
                  suggestions.strengths
                ) &&
                  suggestions.strengths.length >
                    0 && (

                  <div>

                    <h6 className="text-xs font-bold text-[#68766B] mb-3">
                      Strengths
                    </h6>

                    <div className="space-y-2">

                      {suggestions.strengths.map(
                        (item, index) => (
                          <div
                            key={index}
                            className="p-3 bg-[#D9E1D2]/40 border border-[#D9E1D2] rounded-xl text-xs text-[#68766B] leading-relaxed"
                          >
                            {formatValue(item)}
                          </div>
                        )
                      )}

                    </div>

                  </div>
                )}

                {/* Improvements */}

                {Array.isArray(
                  suggestions.improvements
                ) &&
                  suggestions.improvements.length >
                    0 && (

                  <div>

                    <h6 className="text-xs font-bold text-[#68766B] mb-3">
                      Improvements
                    </h6>

                    <div className="space-y-2">

                      {suggestions.improvements.map(
                        (item, index) => (
                          <div
                            key={index}
                            className="p-3 bg-[#D9E1D2]/40 border border-[#D9E1D2] rounded-xl text-xs text-[#68766B] leading-relaxed"
                          >
                            {formatValue(item)}
                          </div>
                        )
                      )}

                    </div>

                  </div>
                )}

                {/* Suggestions */}

                {Array.isArray(
                  suggestions.suggestions
                ) &&
                  suggestions.suggestions.length >
                    0 && (

                  <div>

                    <h6 className="text-xs font-bold text-[#68766B] mb-3">
                      Recommended Actions
                    </h6>

                    <div className="space-y-2">

                      {suggestions.suggestions.map(
                        (item, index) => (
                          <div
                            key={index}
                            className="p-3 bg-black/10 border border-[#315C46]/20 rounded-xl text-xs text-[#68766B] leading-relaxed"
                          >
                            {formatValue(item)}
                          </div>
                        )
                      )}

                    </div>

                  </div>
                )}

                {/* Generic backend fields */}

                {Object.entries(
                  suggestions
                )
                  .filter(
                    ([key]) =>
                      ![
                        'quality_score',
                        'metrics',
                        'strengths',
                        'improvements',
                        'suggestions'
                      ].includes(key)
                  )
                  .length > 0 && (

                  <div>

                    <h6 className="text-xs font-bold text-[#68766B] mb-3">
                      Additional Analytics
                    </h6>

                    <div className="space-y-2">

                      {Object.entries(
                        suggestions
                      )
                        .filter(
                          ([key]) =>
                            ![
                              'quality_score',
                              'metrics',
                              'strengths',
                              'improvements',
                              'suggestions'
                            ].includes(key)
                        )
                        .map(
                          ([key, value]) => (
                            <div
                              key={key}
                              className="p-3 bg-[#D9E1D2]/40 border border-[#D9E1D2] rounded-xl text-xs"
                            >

                              <span className="text-[#26332A] font-semibold">
                                {key}:
                              </span>

                              <span className="text-[#68766B] ml-2">
                                {formatValue(value)}
                              </span>

                            </div>
                          )
                        )}

                    </div>

                  </div>
                )}

              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}