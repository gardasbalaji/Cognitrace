// frontend/src/pages/faculty/Suggestions.jsx



import LectureFeedbackAnalytics from '../../components/LectureFeedbackAnalytics';

import React, { useEffect, useState } from 'react';

import {

  Lightbulb,

  BarChart2,

  AlertCircle,

  RefreshCw,

  CheckCircle,

  Info,

} from 'lucide-react';

import { apiRequest } from '../../services/api';



export default function Suggestions() {

  const [lectures, setLectures] = useState([]);

  const [selectedId, setSelectedId] = useState('');

  const [data, setData] = useState(null);



  const [lecturesLoading, setLecturesLoading] = useState(true);

  const [dataLoading, setDataLoading] = useState(false);

  const [error, setError] = useState('');



  // ============================================================

  // LOAD REAL FACULTY LECTURES

  // ============================================================



  const loadLectures = async () => {

    setLecturesLoading(true);

    setError('');



    try {

      const json = await apiRequest('/api/faculty/lectures');

      const lectureList = Array.isArray(json) ? json : [];



      setLectures(lectureList);



      if (lectureList.length === 0) {

        setSelectedId('');

        setData(null);

        return;

      }



      setSelectedId((currentId) => {

        const stillExists = lectureList.some(

          (lecture) => lecture.id === currentId

        );



        return stillExists ? currentId : lectureList[0].id;

      });

    } catch (err) {

      setLectures([]);

      setSelectedId('');

      setData(null);

      setError(err.message || 'Unable to load lectures.');

    } finally {

      setLecturesLoading(false);

    }

  };



  useEffect(() => {

    loadLectures();

  }, []);



  // ============================================================

  // LOAD REAL SUGGESTIONS FOR SELECTED LECTURE

  // ============================================================



  const loadSuggestions = async (lectureId) => {

    if (!lectureId) {

      setData(null);

      return;

    }



    setDataLoading(true);

    setData(null);

    setError('');



    try {

      const json = await apiRequest(

        `/api/faculty/lecture/${encodeURIComponent(

          lectureId

        )}/suggestions`

      );

      setData(json || null);

    } catch (err) {

      setData(null);

      if (err.status !== 404) {

        console.warn('Suggestions fetch notice:', err.message);

      }

    } finally {

      setDataLoading(false);

    }

  };



  useEffect(() => {

    if (selectedId) {

      loadSuggestions(selectedId);

    } else {

      setData(null);

    }

  }, [selectedId]);



  // ============================================================

  // NORMALIZE BACKEND VALUES

  // ============================================================



  const qualityScore =

    typeof data?.quality_score === 'number'

      ? data.quality_score

      : null;



  const metrics =

    data?.metrics && typeof data.metrics === 'object'

      ? data.metrics

      : {};



  const breakdown =

    data?.breakdown && typeof data.breakdown === 'object'

      ? data.breakdown

      : {};



  const strengths = Array.isArray(data?.strengths)

    ? data.strengths

    : [];



  const improvements = Array.isArray(data?.improvements)

    ? data.improvements

    : [];



  const suggestions = Array.isArray(data?.suggestions)

    ? data.suggestions

    : [];



  const selectedLecture = lectures.find(

    (lecture) => lecture.id === selectedId

  );



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



  const getLectureLabel = (lecture) => {

    if (!lecture) return 'Select Lecture';



    return (

      lecture.title ||

      lecture.name ||

      lecture.id ||

      'Untitled Lecture'

    );

  };



  // ============================================================

  // RENDER

  // ============================================================



  return (

    <div className="flex-1 p-8 overflow-y-auto space-y-8 max-w-6xl mx-auto">



      {/* HEADER */}



      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-b border-slate-800 pb-6">



        <div className="space-y-2">

          <h3 className="font-outfit font-extrabold text-2xl text-white">

            Lecture Quality &amp; AI Suggestions

          </h3>



          <p className="text-sm text-slate-400">

            Review quality analysis and actionable suggestions

            generated from the available lecture analytics.

          </p>

        </div>



        <div className="flex items-center gap-2">



          <label className="text-xs font-semibold text-slate-500">

            Select Lecture:

          </label>



          <select

            value={selectedId}

            onChange={(event) =>

              setSelectedId(event.target.value)

            }

            disabled={

              lecturesLoading || lectures.length === 0

            }

            className="bg-brand-900 border border-slate-800 px-3 py-2 rounded-lg text-xs font-semibold text-white focus:outline-none focus:border-accent-500 disabled:opacity-50"

          >

            {lectures.length === 0 ? (

              <option value="">

                No lectures available

              </option>

            ) : (

              lectures.map((lecture) => (

                <option

                  key={lecture.id}

                  value={lecture.id}

                >

                  {getLectureLabel(lecture)}

                </option>

              ))

            )}

          </select>



          <button

            type="button"

            onClick={async () => {

              await loadLectures();



              if (selectedId) {

                await loadSuggestions(selectedId);

              }

            }}

            className="p-2 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition"

            title="Refresh"

          >

            <RefreshCw

              className={`h-4 w-4 ${

                lecturesLoading || dataLoading

                  ? 'animate-spin'

                  : ''

              }`}

            />

          </button>



        </div>

      </div>



      {/* ERROR */}



      {error && (

        <div className="glass-panel rounded-2xl p-4 border border-rose-500/20 bg-rose-500/5 flex items-start gap-3">



          <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />



          <div>

            <p className="text-sm font-semibold text-rose-300">

              Unable to load data

            </p>



            <p className="text-xs text-slate-400 mt-1">

              {error}

            </p>

          </div>



        </div>

      )}



      {/* LOADING */}



      {lecturesLoading ? (



        <div className="glass-panel p-20 text-center rounded-2xl">



          <RefreshCw className="h-8 w-8 animate-spin text-accent-500 mx-auto mb-4" />



          <p className="text-xs text-slate-400">

            Loading lectures...

          </p>



        </div>



      ) : lectures.length === 0 ? (



        /* NO LECTURES */



        <div className="glass-panel p-16 text-center rounded-2xl">



          <Info className="h-10 w-10 text-slate-500 mx-auto mb-4" />



          <h4 className="text-sm font-bold text-white mb-2">

            No lectures available

          </h4>



          <p className="text-xs text-slate-500 max-w-md mx-auto">

            Import a lecture from the Faculty lecture section

            before viewing lecture quality suggestions.

          </p>



        </div>



      ) : data ? (

        /* REAL BACKEND DATA */



        <div className="space-y-8">



          {/* TOP ROW */}



          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">



            {/* QUALITY SCORE */}



            <div className="glass-panel rounded-2xl p-6 border-slate-850 flex flex-col justify-between text-center min-h-[300px]">



              <div className="space-y-1">



                <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider block">

                  Lecture Quality Score

                </span>



                <span className="text-[9px] text-primary-400 font-bold uppercase tracking-widest block">

                  Pedagogical Index

                </span>



              </div>



              <div className="my-6 relative flex items-center justify-center">



                <span className="text-5xl font-extrabold font-outfit text-white font-mono">

                  {displayValue(qualityScore)}

                </span>



                {qualityScore !== null && (

                  <span className="text-xs text-slate-500 font-semibold absolute bottom-[-15px]">

                    Score / 100

                  </span>

                )}



              </div>



              <div className="space-y-2.5 border-t border-slate-800/45 pt-5 text-xs text-left">



                <div className="flex justify-between items-center">

                  <span className="text-slate-400">

                    Completion rate

                  </span>



                  <span className="text-white font-bold">

                    {displayValue(metrics.completion, '%')}

                  </span>

                </div>



                <div className="flex justify-between items-center">

                  <span className="text-slate-400">

                    Watch Engagement

                  </span>



                  <span className="text-white font-bold">

                    {displayValue(metrics.engagement, '%')}

                  </span>

                </div>



                <div className="flex justify-between items-center">

                  <span className="text-slate-400">

                    Quiz performance

                  </span>



                  <span className="text-white font-bold">

                    {displayValue(metrics.quiz, '%')}

                  </span>

                </div>



                <div className="flex justify-between items-center">

                  <span className="text-slate-400">

                    Confusion level

                  </span>



                  <span className="text-white font-bold">

                    {displayValue(metrics.confusion, '%')}

                  </span>

                </div>



                <div className="flex justify-between items-center">

                  <span className="text-slate-400">

                    Rewatch/rewind density

                  </span>



                  <span className="text-white font-bold">

                    {displayValue(metrics.rewatches)}

                  </span>

                </div>



              </div>

            </div>



            {/* QUALITY BREAKDOWN */}



            <div className="lg:col-span-2 glass-panel rounded-2xl p-6 border-slate-850 space-y-4">



              <h4 className="font-outfit font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">



                <BarChart2 className="h-4.5 w-4.5 text-primary-400" />



                Pedagogical Quality Weighting



              </h4>



              <p className="text-xs text-slate-400 leading-relaxed font-sans">

                Quality analysis returned by the Faculty backend

                for the selected lecture.

              </p>



              <div className="space-y-3.5 pt-3">



                <div className="p-3.5 bg-brand-950/40 border border-slate-900 rounded-xl space-y-1">



                  <span className="text-[10px] text-slate-500 font-bold uppercase block">

                    Watch Completion

                  </span>



                  <span className="text-xs text-emerald-400 font-bold block">

                    {breakdown.completion || 'No data available'}

                  </span>



                </div>



                <div className="p-3.5 bg-brand-950/40 border border-slate-900 rounded-xl space-y-1">



                  <span className="text-[10px] text-slate-500 font-bold uppercase block">

                    Concept Check Quiz

                  </span>



                  <span className="text-xs text-emerald-400 font-bold block">

                    {breakdown.quiz || 'No data available'}

                  </span>



                </div>



                <div className="p-3.5 bg-brand-950/40 border border-slate-900 rounded-xl space-y-1">



                  <span className="text-[10px] text-slate-500 font-bold uppercase block">

                    Confusion / Rewatch

                  </span>



                  <span className="text-xs text-rose-400 font-bold block">

                    {breakdown.confusion || 'No data available'}

                  </span>



                </div>



              </div>

            </div>



          </div>



          {/* STRENGTHS + IMPROVEMENTS */}



          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">



            {/* STRENGTHS */}



            <div className="glass-panel p-6 rounded-2xl space-y-4">



              <h5 className="font-outfit font-bold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">



                <CheckCircle className="h-4.5 w-4.5 text-emerald-400" />



                Lecture Pedagogical Strengths



              </h5>



              {strengths.length === 0 ? (



                <div className="p-4 bg-brand-950/40 border border-slate-900 rounded-xl">



                  <p className="text-xs text-slate-500">

                    No strengths have been recorded for this

                    lecture.

                  </p>



                </div>



              ) : (



                <div className="space-y-3">



                  {strengths.map((strength, index) => (



                    <div

                      key={index}

                      className="p-3.5 bg-emerald-500/5 border border-emerald-500/10 text-xs text-slate-350 leading-relaxed rounded-xl font-sans"

                    >

                      {typeof strength === 'string'

                        ? strength

                        : JSON.stringify(strength)}

                    </div>



                  ))}



                </div>



              )}



            </div>



            {/* IMPROVEMENTS */}



            <div className="glass-panel p-6 rounded-2xl space-y-4">



              <h5 className="font-outfit font-bold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">



                <AlertCircle className="h-4.5 w-4.5 text-rose-400" />



                Flagged Content Areas



              </h5>



              {improvements.length === 0 ? (



                <div className="p-4 bg-brand-950/40 border border-slate-900 rounded-xl">



                  <p className="text-xs text-slate-500">

                    No improvement areas have been recorded for

                    this lecture.

                  </p>



                </div>



              ) : (



                <div className="space-y-3">



                  {improvements.map((improvement, index) => (



                    <div

                      key={index}

                      className="p-3.5 bg-rose-500/5 border border-rose-500/10 text-xs text-slate-350 leading-relaxed rounded-xl font-sans"

                    >

                      {typeof improvement === 'string'

                        ? improvement

                        : JSON.stringify(improvement)}

                    </div>



                  ))}



                </div>



              )}



            </div>



          </div>



          {/* ACTIONABLE SUGGESTIONS */}



          <div className="glass-panel rounded-2xl p-6 border-slate-850 space-y-6">



            <h4 className="font-outfit font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">



              <Lightbulb className="h-4.5 w-4.5 text-amber-400" />



              Actionable Improvements &amp; Suggestions



            </h4>



            {suggestions.length === 0 ? (



              <div className="p-6 bg-brand-950/40 rounded-xl border border-slate-850 text-center">



                <p className="text-xs text-slate-500">

                  No actionable suggestions are available for

                  this lecture.

                </p>



              </div>



            ) : (



              <div className="space-y-4">



                {suggestions.map((suggestion, index) => {



                  const text =

                    typeof suggestion === 'string'

                      ? suggestion

                      : JSON.stringify(suggestion);



                  const isHighPriority =

                    text

                      .toLowerCase()

                      .includes('high priority');



                  return (

                    <div

                      key={index}

                      className="p-4 bg-brand-950/40 rounded-xl border border-slate-850 flex gap-3 text-xs leading-relaxed text-slate-300 font-sans"

                    >



                      <span className="h-5 w-5 rounded-full bg-primary-600/10 border border-primary-500/30 flex items-center justify-center font-bold text-[10px] text-primary-400 shrink-0 select-none">

                        {index + 1}

                      </span>



                      <div>



                        {isHighPriority && (

                          <span className="text-rose-400 font-bold">

                            High Priority Concern:{' '}

                          </span>

                        )}



                        <span>

                          {text.replace(

                            /\*\*High Priority\*\*:?\s*/gi,

                            ''

                          )}

                        </span>



                      </div>



                    </div>

                  );

                })}



              </div>



            )}



          </div>



        </div>

      ) : null}



    

      {selectedId && !lecturesLoading && <LectureFeedbackAnalytics lectureId={selectedId} />}

    </div>

  );

}