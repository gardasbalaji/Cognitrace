import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { FileText, Clock, AlertCircle, BookOpen } from 'lucide-react';
import { studentAPI } from '../../services/api';

export default function AIRevisionNotes() {
  const { lectureId: routeLectureId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const queryLectureId = searchParams.get('lec') || searchParams.get('play');
  const targetLectureId = routeLectureId || queryLectureId || null;

  const [lectures, setLectures] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [loadingLectures, setLoadingLectures] = useState(true);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [lectureError, setLectureError] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);

  // 1. Fetch available student lectures
  useEffect(() => {
    let isMounted = true;
    setLoadingLectures(true);
    setLectureError(null);

    studentAPI.getLectures()
      .then((data) => {
        if (!isMounted) return;
        const list = Array.isArray(data) ? data : [];
        setLectures(list);

        if (list.length === 0) {
          setSelectedId(null);
          setLectureError('No published lectures are currently available for your account.');
          return;
        }

        // If target ID was provided in URL, resolve against real lectures
        if (targetLectureId) {
          const match = list.find((lec) => String(lec.id) === String(targetLectureId));
          if (match) {
            setSelectedId(match.id);
            setLectureError(null);
          } else {
            // Target was specified (e.g. stale legacy ID or non-existent UUID)
            setSelectedId(null);
            setLectureError(`The requested lecture ID (${targetLectureId}) does not match any available lecture. Please select a valid lecture.`);
          }
        } else {
          // No ID specified in URL, pick the first valid lecture
          setSelectedId(list[0].id);
          setLectureError(null);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to load student lectures:', err);
        setLectures([]);
        setSelectedId(null);
        setLectureError('Unable to load course lectures. Please check your network connection.');
      })
      .finally(() => {
        if (isMounted) setLoadingLectures(false);
      });

    return () => {
      isMounted = false;
    };
  }, [targetLectureId]);

  // 2. Fetch analysis/notes whenever selectedId changes
  useEffect(() => {
    if (!selectedId) {
      setAnalysisData(null);
      setLoadingAnalysis(false);
      return;
    }

    let isMounted = true;
    setLoadingAnalysis(true);
    setAnalysisError(null);

    studentAPI.getLectureAnalysis(selectedId)
      .then((data) => {
        if (!isMounted) return;
        if (data && data.ai_revision_notes && data.ai_revision_notes !== 'Revision notes unavailable.') {
          setAnalysisData(data);
          setAnalysisError(null);
        } else {
          setAnalysisData(data || null);
          setAnalysisError('AI revision notes have not been generated for this lecture yet.');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to load lecture revision notes:', err);
        setAnalysisData(null);
        setAnalysisError(err?.message || 'Failed to retrieve AI revision notes for this lecture.');
      })
      .finally(() => {
        if (isMounted) setLoadingAnalysis(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedId]);

  const handleSelectLecture = (id) => {
    setSelectedId(id);
    setLectureError(null);
    navigate(`/student/notes/${id}`);
  };

  const handleExportPDF = () => {
    window.print();
  };

  const selectedLecture = lectures.find((l) => l.id === selectedId);

  // Formatter to render markdown-like structures
  const renderNotesContent = (markdownText) => {
    if (!markdownText) return null;
    return markdownText.split('\n').map((line, i) => {
      if (line.startsWith('###')) {
        return (
          <h4
            key={i}
            className="font-outfit font-bold text-sm text-[#26332A] mt-6 mb-3 border-b border-[#D9E1D2] pb-1.5"
          >
            {line.replace('###', '')}
          </h4>
        );
      }
      if (line.startsWith('* **') || line.startsWith('- **')) {
        const content = line.substring(2);
        return (
          <li key={i} className="list-disc ml-5 my-1.5 text-xs text-[#68766B] leading-relaxed">
            {content}
          </li>
        );
      }
      if (line.startsWith('  * **')) {
        const content = line.substring(4);
        return (
          <li key={i} className="list-circle ml-10 my-1 text-xs text-[#68766B] leading-relaxed">
            {content}
          </li>
        );
      }
      if (line.startsWith('- [ ]') || line.startsWith('  - [ ]')) {
        const content = line.replace('- [ ]', '').replace('  - [ ]', '');
        return (
          <div key={i} className="flex items-start gap-2.5 my-2.5 text-xs text-[#68766B] font-medium">
            <input
              type="checkbox"
              className="mt-0.5 rounded border-slate-300 text-[#315C46] focus:ring-[#315C46]"
            />
            <span>{content}</span>
          </div>
        );
      }
      if (line.trim() === '') return <div key={i} className="h-2"></div>;

      return (
        <p key={i} className="text-xs text-[#68766B] leading-relaxed my-1.5">
          {line}
        </p>
      );
    });
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-8 max-w-5xl mx-auto bg-[#F8F8F2] text-[#26332A]">
      {/* Header */}
      <div className="space-y-2 border-b border-[#D9E1D2] pb-6">
        <h3 className="font-outfit font-extrabold text-2xl text-black">AI Revision Notes</h3>
        <p className="text-sm text-black/80 font-medium">
          Concise revision sheets automatically generated from lecture transcripts and code blocks.
        </p>
      </div>

      {loadingLectures ? (
        <div className="bg-[#E2E8D8] rounded-3xl p-16 text-center border border-[#D9E1D2]">
          <div className="h-8 w-8 rounded-full border-2 border-t-[#315C46] border-slate-200 animate-spin mx-auto mb-4"></div>
          <p className="text-xs text-black font-semibold">Loading course lectures...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Left: Lectures list */}
          <div className="md:col-span-1 space-y-3">
            <h4 className="font-outfit font-extrabold text-xs text-black uppercase tracking-wider pl-1">Lectures</h4>
            {lectures.length === 0 ? (
              <div className="p-4 rounded-2xl border border-[#D9E1D2] bg-[#E2E8D8] text-xs text-black font-medium">
                No lectures found.
              </div>
            ) : (
              lectures.map((lec) => (
                <button
                  key={lec.id}
                  onClick={() => handleSelectLecture(lec.id)}
                  className={`w-full p-4 rounded-2xl text-left border text-xs font-bold transition-all cursor-pointer ${
                    selectedId === lec.id
                      ? 'bg-black border-black text-white shadow-sm'
                      : 'bg-[#E2E8D8] border-[#D9E1D2] text-black hover:bg-[#E8EDE1]'
                  }`}
                >
                  <div className="line-clamp-2 leading-snug mb-2">{lec.title}</div>
                  <div className="flex items-center gap-1.5 opacity-80 text-[11px]">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{lec.duration || '15 mins'}</span>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Right: Revision sheet content */}
          <div className="md:col-span-3">
            {lectureError && !selectedId ? (
              <div className="bg-rose-50 rounded-3xl p-10 border border-rose-200 text-center space-y-4">
                <AlertCircle className="h-8 w-8 text-rose-500 mx-auto" />
                <h4 className="font-outfit font-bold text-base text-rose-900">Lecture Selection Notice</h4>
                <p className="text-xs text-rose-700 max-w-md mx-auto leading-relaxed">{lectureError}</p>
                {lectures.length > 0 && (
                  <button
                    onClick={() => handleSelectLecture(lectures[0].id)}
                    className="px-4 py-2 bg-[#315C46] hover:bg-[#264B39] text-[#26332A] rounded-full text-xs font-bold transition-all"
                  >
                    Load First Available Lecture
                  </button>
                )}
              </div>
            ) : loadingAnalysis ? (
              <div className="bg-[#E2E8D8] rounded-3xl p-16 text-center border border-[#D9E1D2]">
                <div className="h-8 w-8 rounded-full border-2 border-t-[#315C46] border-slate-200 animate-spin mx-auto mb-4"></div>
                <p className="text-xs text-[#68766B] font-medium">
                  Assembling study checklist and formula blocks...
                </p>
              </div>
            ) : analysisError ? (
              <div className="bg-[#E2E8D8] rounded-3xl p-10 border border-[#D9E1D2] text-center space-y-4">
                <BookOpen className="h-8 w-8 text-[#315C46] mx-auto" />
                <h4 className="font-outfit font-extrabold text-base text-black">
                  {selectedLecture?.title || 'Lecture Revision Sheet'}
                </h4>
                <p className="text-xs text-black/80 max-w-md mx-auto leading-relaxed font-medium">{analysisError}</p>
                {selectedLecture?.id && (
                  <button
                    onClick={() => navigate(`/student/session?play=${selectedLecture.id}`)}
                    className="px-4 py-2 bg-[#315C46] hover:bg-[#264B39] text-white rounded-full text-xs font-bold transition-all"
                  >
                    Open Lecture Session
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-[#E2E8D8] rounded-3xl p-8 border border-[#D9E1D2] shadow-sm">
                {/* Header */}
                <div className="flex items-center justify-between pb-6 border-b border-[#D9E1D2]">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-[#FCFCF8] border border-[#D9E1D2] rounded-xl text-[#315C46] shadow-xs">
                      <FileText className="h-5 w-5 text-[#315C46]" />
                    </div>
                    <div>
                      <h4 className="font-outfit font-extrabold text-base text-black">
                        {selectedLecture?.title || 'Study Sheet'}
                      </h4>
                      <p className="text-[10px] text-black font-extrabold tracking-wider uppercase">
                        Latex &amp; Review Checklist enabled
                      </p>
                    </div>
                  </div>

                  {/* Print/Download button */}
                  <button
                    onClick={handleExportPDF}
                    className="text-xs font-bold text-[#315C46] hover:text-[#264B39] bg-[#E2E8D8] hover:bg-[#E8EDE1] px-4 py-2 rounded-full border border-[#D9E1D2] transition-colors shadow-xs cursor-pointer"
                  >
                    Export PDF
                  </button>
                </div>

                {/* Rendered content */}
                <div className="pt-4 text-xs font-sans text-black font-medium">
                  {renderNotesContent(analysisData?.ai_revision_notes)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
