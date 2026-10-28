// frontend/src/pages/faculty/Transcript.jsx

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  FileText,
  Search,
  RefreshCw,
  Clock,
  BookOpen,
  Info,
  AlertCircle,
} from 'lucide-react';

export default function Transcript() {
  const { lectureId } = useParams();

  const [lectures, setLectures] = useState([]);
  const [selectedId, setSelectedId] = useState(lectureId || '');

  const [transcript, setTranscript] = useState([]);
  const [lecture, setLecture] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');

  const [lecturesLoading, setLecturesLoading] = useState(true);
  const [transcriptLoading, setTranscriptLoading] =
    useState(false);

  const [error, setError] = useState('');

  // ============================================================
  // LOAD REAL LECTURES
  // ============================================================

  const loadLectures = async () => {
    setLecturesLoading(true);
    setError('');

    try {
      const response = await fetch('/api/faculty/lectures');

      if (!response.ok) {
        throw new Error('Failed to load lectures.');
      }

      const json = await response.json();

      const lectureList = Array.isArray(json) ? json : [];

      setLectures(lectureList);

      if (lectureList.length === 0) {
        setSelectedId('');
        setLecture(null);
        setTranscript([]);
        return;
      }

      setSelectedId((currentId) => {
        const requestedId =
          lectureId && lectureList.some(
            (item) => item.id === lectureId
          )
            ? lectureId
            : currentId;

        const exists = lectureList.some(
          (item) => item.id === requestedId
        );

        return exists ? requestedId : lectureList[0].id;
      });
    } catch (err) {
      setLectures([]);
      setSelectedId('');
      setLecture(null);
      setTranscript([]);
      setError(
        err.message || 'Unable to load Faculty lectures.'
      );
    } finally {
      setLecturesLoading(false);
    }
  };

  useEffect(() => {
    loadLectures();
  }, [lectureId]);

  // ============================================================
  // LOAD SELECTED LECTURE TRANSCRIPT
  // ============================================================

  const loadTranscript = async (id) => {
    if (!id) {
      setTranscript([]);
      setLecture(null);
      return;
    }

    setTranscriptLoading(true);
    setError('');
    setTranscript([]);

    try {
      const lectureResponse = await fetch(
        `/api/faculty/lecture/${encodeURIComponent(id)}`
      );

      if (lectureResponse.ok) {
        const lectureJson = await lectureResponse.json();
        setLecture(lectureJson || null);
      } else {
        const fallbackLecture = lectures.find(
          (item) => item.id === id
        );

        setLecture(fallbackLecture || null);
      }

      const transcriptResponse = await fetch(
        `/api/faculty/lecture/${encodeURIComponent(
          id
        )}/transcript`
      );

      if (transcriptResponse.status === 404) {
        setTranscript([]);
        return;
      }

      if (!transcriptResponse.ok) {
        throw new Error(
          'Failed to load the lecture transcript.'
        );
      }

      const transcriptJson = await transcriptResponse.json();

      setTranscript(
        Array.isArray(transcriptJson)
          ? transcriptJson
          : []
      );
    } catch (err) {
      setTranscript([]);
      setError(
        err.message || 'Unable to load transcript.'
      );
    } finally {
      setTranscriptLoading(false);
    }
  };

  useEffect(() => {
    if (selectedId) {
      loadTranscript(selectedId);
    } else {
      setTranscript([]);
      setLecture(null);
    }
  }, [selectedId]);

  // ============================================================
  // NORMALIZE TRANSCRIPT DISPLAY VALUES
  // ============================================================

  const formatTime = (seconds) => {
    const numeric = Number(seconds);

    if (!Number.isFinite(numeric)) {
      return null;
    }

    const totalSeconds = Math.max(
      0,
      Math.floor(numeric)
    );

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor(
      (totalSeconds % 3600) / 60
    );
    const secs = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(
        2,
        '0'
      )}:${String(secs).padStart(2, '0')}`;
    }

    return `${minutes}:${String(secs).padStart(2, '0')}`;
  };

  const getTimestamp = (item) => {
    if (
      item?.timestamp !== undefined &&
      item?.timestamp !== null &&
      item.timestamp !== ''
    ) {
      return String(item.timestamp);
    }

    const formatted = formatTime(item?.start);

    if (formatted) {
      return formatted;
    }

    const formattedStart = formatTime(item?.start_time);

    if (formattedStart) {
      return formattedStart;
    }

    return '—';
  };

  const getText = (item) => {
    return (
      item?.text ||
      item?.transcript ||
      item?.content ||
      item?.transcript_text ||
      ''
    );
  };

  const getSpeaker = (item) => {
    return item?.speaker || 'Transcript';
  };

  // ============================================================
  // SEARCH
  // ============================================================

  const filteredTranscript = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return transcript;
    }

    return transcript.filter((item) => {
      const text = getText(item).toLowerCase();
      const timestamp = getTimestamp(item).toLowerCase();

      return (
        text.includes(query) ||
        timestamp.includes(query)
      );
    });
  }, [transcript, searchTerm]);

  // ============================================================
  // SELECTED LECTURE DISPLAY
  // ============================================================

  const selectedLecture =
    lecture ||
    lectures.find((item) => item.id === selectedId) ||
    null;

  const lectureTitle =
    selectedLecture?.title ||
    selectedLecture?.name ||
    selectedId ||
    'Lecture Transcript';

  // ============================================================
  // REFRESH
  // ============================================================

  const handleRefresh = async () => {
    await loadLectures();

    if (selectedId) {
      await loadTranscript(selectedId);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-8 max-w-7xl mx-auto">

      {/* ======================================================
          HEADER
          ====================================================== */}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-slate-800 pb-6">

        <div className="space-y-2">

          <div className="flex items-center gap-2">

            <FileText className="h-5 w-5 text-primary-400" />

            <span className="text-[10px] font-bold text-primary-400 uppercase tracking-widest">
              Faculty Transcript
            </span>

          </div>

          <h1 className="font-outfit font-extrabold text-2xl text-white">
            Automatic Lecture Transcript
          </h1>

          <p className="text-sm text-slate-400">
            View the transcript stored for an imported Faculty
            lecture.
          </p>

        </div>

        {/* ====================================================
            CONTROLS
            ==================================================== */}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">

          <select
            value={selectedId}
            onChange={(event) =>
              setSelectedId(event.target.value)
            }
            disabled={
              lecturesLoading || lectures.length === 0
            }
            className="min-w-[260px] bg-brand-900 border border-slate-800 px-3 py-2.5 rounded-lg text-xs font-semibold text-white focus:outline-none focus:border-primary-500 disabled:opacity-50"
          >

            {lectures.length === 0 ? (
              <option value="">
                No lectures available
              </option>
            ) : (
              lectures.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.title || item.name || item.id}
                </option>
              ))
            )}

          </select>

          <button
            type="button"
            onClick={handleRefresh}
            className="p-2.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition"
            title="Refresh transcript"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                lecturesLoading || transcriptLoading
                  ? 'animate-spin'
                  : ''
              }`}
            />
          </button>

        </div>

      </div>

      {/* ======================================================
          ERROR
          ====================================================== */}

      {error && (
        <div className="glass-panel rounded-2xl p-4 border border-rose-500/20 bg-rose-500/5 flex items-start gap-3">

          <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />

          <div>

            <p className="text-sm font-semibold text-rose-300">
              Transcript error
            </p>

            <p className="text-xs text-slate-400 mt-1">
              {error}
            </p>

          </div>

        </div>
      )}

      {/* ======================================================
          LOADING LECTURES
          ====================================================== */}

      {lecturesLoading ? (

        <div className="glass-panel rounded-2xl p-16 text-center">

          <RefreshCw className="h-8 w-8 text-primary-400 animate-spin mx-auto mb-4" />

          <p className="text-xs text-slate-400">
            Loading lectures...
          </p>

        </div>

      ) : lectures.length === 0 ? (

        /* ====================================================
           NO LECTURES
           ==================================================== */

        <div className="glass-panel rounded-2xl p-16 text-center">

          <BookOpen className="h-10 w-10 text-slate-600 mx-auto mb-4" />

          <h2 className="text-sm font-bold text-white mb-2">
            No lectures available
          </h2>

          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Import a lecture from the Faculty lecture section
            to generate and view its transcript.
          </p>

        </div>

      ) : (

        <div className="space-y-6">

          {/* ==================================================
              LECTURE INFORMATION
              ================================================== */}

          <div className="glass-panel rounded-2xl p-6">

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">

              <div>

                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2">
                  Selected Lecture
                </p>

                <h2 className="font-outfit font-bold text-xl text-white">
                  {lectureTitle}
                </h2>

                <div className="flex flex-wrap items-center gap-4 mt-3">

                  <span className="text-xs text-slate-500">
                    Lecture ID:{' '}
                    <span className="text-slate-300 font-semibold">
                      {selectedId}
                    </span>
                  </span>

                  {selectedLecture?.duration && (
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock className="h-3.5 w-3.5" />
                      {selectedLecture.duration}
                    </span>
                  )}

                  {selectedLecture?.source_type && (
                    <span className="px-2 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-[10px] text-primary-400 font-bold uppercase">
                      {selectedLecture.source_type}
                    </span>
                  )}

                </div>

              </div>

              <div className="flex items-center gap-5">

                <div className="text-right">

                  <p className="text-[10px] text-slate-500 uppercase font-bold">
                    Transcript Entries
                  </p>

                  <p className="text-2xl font-extrabold text-white">
                    {transcript.length}
                  </p>

                </div>

                <div className="h-10 w-px bg-slate-800" />

                <div className="text-right">

                  <p className="text-[10px] text-slate-500 uppercase font-bold">
                    Visible
                  </p>

                  <p className="text-2xl font-extrabold text-white">
                    {filteredTranscript.length}
                  </p>

                </div>

              </div>

            </div>

          </div>

          {/* ==================================================
              SEARCH
              ================================================== */}

          <div className="glass-panel rounded-2xl p-4">

            <div className="relative">

              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />

              <input
                type="text"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
                placeholder="Search transcript..."
                className="w-full bg-brand-950/50 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-primary-500"
              />

            </div>

          </div>

          {/* ==================================================
              TRANSCRIPT
              ================================================== */}

          {transcriptLoading ? (

            <div className="glass-panel rounded-2xl p-16 text-center">

              <RefreshCw className="h-8 w-8 text-primary-400 animate-spin mx-auto mb-4" />

              <p className="text-xs text-slate-400">
                Loading transcript...
              </p>

            </div>

          ) : transcript.length === 0 ? (

            <div className="glass-panel rounded-2xl p-16 text-center">

              <FileText className="h-10 w-10 text-slate-600 mx-auto mb-4" />

              <h3 className="text-sm font-bold text-white mb-2">
                No transcript available
              </h3>

              <p className="text-xs text-slate-500 max-w-md mx-auto">
                This lecture does not currently have a stored
                transcript.
              </p>

            </div>

          ) : filteredTranscript.length === 0 ? (

            <div className="glass-panel rounded-2xl p-12 text-center">

              <Search className="h-8 w-8 text-slate-600 mx-auto mb-3" />

              <p className="text-xs text-slate-500">
                No transcript entries match your search.
              </p>

            </div>

          ) : (

            <div className="space-y-3">

              {filteredTranscript.map((item, index) => {

                const timestamp = getTimestamp(item);
                const text = getText(item);
                const speaker = getSpeaker(item);

                return (
                  <div
                    key={`${selectedId}-${index}`}
                    className="glass-panel rounded-2xl p-5 border border-slate-850 hover:border-slate-700 transition"
                  >

                    <div className="flex flex-col md:flex-row gap-4">

                      {/* TIMESTAMP */}

                      <div className="md:w-24 shrink-0">

                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary-500/10 border border-primary-500/20">

                          <Clock className="h-3.5 w-3.5 text-primary-400" />

                          <span className="text-[11px] font-mono font-bold text-primary-400">
                            {timestamp}
                          </span>

                        </div>

                      </div>

                      {/* CONTENT */}

                      <div className="flex-1 min-w-0">

                        <div className="flex items-center gap-2 mb-2">

                          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                            {speaker}
                          </span>

                        </div>

                        <p className="text-sm text-slate-300 leading-7 whitespace-pre-wrap">
                          {text || (
                            <span className="text-slate-600 italic">
                              Empty transcript entry
                            </span>
                          )}
                        </p>

                      </div>

                    </div>

                  </div>
                );
              })}

            </div>

          )}

          {/* ==================================================
              SOURCE INFORMATION
              ================================================== */}

          <div className="glass-panel rounded-2xl p-5 border border-primary-500/10">

            <div className="flex items-start gap-3">

              <Info className="h-5 w-5 text-primary-400 shrink-0 mt-0.5" />

              <div>

                <p className="text-xs font-semibold text-white">
                  Transcript source
                </p>

                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  This page displays transcript data returned by
                  the Faculty backend from the selected lecture's
                  persistent storage. No placeholder transcript
                  content is generated by the frontend.
                </p>

              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}