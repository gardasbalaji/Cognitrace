// frontend/src/pages/faculty/ConfusionHeatmap.jsx

import React, { useEffect, useState } from "react";
import {
  Flame,
  AlertTriangle,
  RefreshCw,
  Info,
} from "lucide-react";

export default function ConfusionHeatmap() {
  const [lectures, setLectures] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [heatmap, setHeatmap] = useState([]);
  const [loadingLectures, setLoadingLectures] = useState(true);
  const [loadingHeatmap, setLoadingHeatmap] = useState(false);
  const [error, setError] = useState("");

  const loadLectures = async () => {
    setLoadingLectures(true);
    setError("");

    try {
      const response = await fetch("/api/faculty/lectures");

      if (!response.ok) {
        throw new Error("Failed to load lectures.");
      }

      const data = await response.json();

      const realLectures = Array.isArray(data)
        ? data
        : Array.isArray(data?.lectures)
          ? data.lectures
          : [];

      setLectures(realLectures);

      /*
       * Select the first lecture that actually exists in the backend.
       * There is NO hardcoded lecture ID.
       */
      if (realLectures.length > 0) {
        const firstLectureId =
          realLectures[0].id ||
          realLectures[0].lecture_id ||
          "";

        setSelectedId(firstLectureId);
      } else {
        setSelectedId("");
        setHeatmap([]);
      }
    } catch (err) {
      console.error("Lecture loading error:", err);
      setLectures([]);
      setSelectedId("");
      setHeatmap([]);
      setError("Unable to load lectures from the Faculty backend.");
    } finally {
      setLoadingLectures(false);
    }
  };

  const loadHeatmap = async (lectureId) => {
    if (!lectureId) {
      setHeatmap([]);
      return;
    }

    setLoadingHeatmap(true);
    setError("");

    try {
      const response = await fetch(
        `/api/faculty/lecture/${encodeURIComponent(
          lectureId
        )}/confusion`
      );

      if (!response.ok) {
        throw new Error("Failed to load confusion data.");
      }

      const data = await response.json();

      /*
       * Backend may return the array directly or wrapped in
       * a heatmap/confusion field.
       */
      const realHeatmap = Array.isArray(data)
        ? data
        : Array.isArray(data?.heatmap)
          ? data.heatmap
          : Array.isArray(data?.confusion)
            ? data.confusion
            : [];

      setHeatmap(realHeatmap);
    } catch (err) {
      console.error("Confusion heatmap loading error:", err);

      /*
       * IMPORTANT:
       * Do NOT insert dummy heatmap values when the API fails.
       */
      setHeatmap([]);
      setError(
        "No confusion analytics are available for this lecture yet."
      );
    } finally {
      setLoadingHeatmap(false);
    }
  };

  useEffect(() => {
    loadLectures();
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadHeatmap(selectedId);
    }
  }, [selectedId]);

  const selectedLecture = lectures.find(
    (lecture) =>
      String(lecture.id || lecture.lecture_id) ===
      String(selectedId)
  );

  const getPercentage = (segment) => {
    const value =
      segment?.percentage ??
      segment?.confusion_percentage ??
      segment?.confusion_score ??
      0;

    const numericValue = Number(value);

    return Number.isFinite(numericValue)
      ? numericValue
      : 0;
  };

  const getCount = (segment) => {
    const value =
      segment?.confusion_count ??
      segment?.count ??
      segment?.flags ??
      0;

    const numericValue = Number(value);

    return Number.isFinite(numericValue)
      ? numericValue
      : 0;
  };

  const getSegmentLabel = (segment) => {
    return (
      segment?.segment ||
      segment?.timestamp ||
      segment?.time_range ||
      "Unknown"
    );
  };

  const getHeatmapStyle = (percentage) => {
    if (percentage >= 50) {
      return {
        container:
          "bg-rose-500/20 border-rose-500/40 text-rose-300",
        shadow:
          "shadow-lg shadow-rose-500/5",
      };
    }

    if (percentage >= 30) {
      return {
        container:
          "bg-amber-500/20 border-amber-500/40 text-amber-300",
        shadow:
          "shadow-lg shadow-amber-500/5",
      };
    }

    return {
      container:
        "bg-brand-900/35 border-slate-850 text-slate-400",
      shadow: "",
    };
  };

  const highConfusionSegments = heatmap.filter(
    (segment) => getPercentage(segment) >= 30
  );

  if (loadingLectures) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 rounded-full border-2 border-t-accent-500 border-slate-800 animate-spin mx-auto mb-4" />

          <p className="text-xs text-slate-400">
            Loading your lectures...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-b border-slate-800 pb-6">

        <div className="space-y-2">

          <h3 className="font-outfit font-extrabold text-2xl text-white">
            Confusion Heatmap
          </h3>

          <p className="text-sm text-slate-400">
            Timeline analysis of student interaction signals
            such as pauses, rewinds, and other confusion indicators.
          </p>

        </div>

        {/* Lecture selector */}
        {lectures.length > 0 && (
          <div className="flex items-center gap-2">

            <label className="text-xs font-semibold text-slate-500">
              Select Lecture:
            </label>

            <select
              value={selectedId}
              onChange={(event) =>
                setSelectedId(event.target.value)
              }
              className="bg-brand-900 border border-slate-800 px-3 py-2 rounded-lg text-xs font-semibold text-white focus:outline-none focus:border-accent-500 max-w-[280px]"
            >
              {lectures.map((lecture) => {

                const lectureId =
                  lecture.id ||
                  lecture.lecture_id;

                const title =
                  lecture.title ||
                  lecture.name ||
                  lecture.metadata?.title ||
                  "Untitled Lecture";

                return (
                  <option
                    key={lectureId}
                    value={lectureId}
                  >
                    {title}
                  </option>
                );
              })}
            </select>

          </div>
        )}

      </div>

      {/* No lectures */}
      {lectures.length === 0 && (
        <div className="glass-panel rounded-2xl p-10 text-center">

          <Info className="h-10 w-10 text-slate-600 mx-auto mb-4" />

          <h4 className="text-white font-bold mb-2">
            No Lectures Available
          </h4>

          <p className="text-sm text-slate-500 mb-6">
            Import a lecture first. The heatmap will use analytics
            from lectures that actually exist in your backend storage.
          </p>

          <button
            onClick={loadLectures}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-500/10 border border-accent-500/30 text-accent-400 text-xs font-bold hover:bg-accent-500/20"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>

        </div>
      )}

      {/* Selected lecture */}
      {lectures.length > 0 && selectedLecture && (
        <div className="glass-panel rounded-2xl p-5 border-slate-850">

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

            <div>
              <span className="text-[9px] text-accent-400 font-bold uppercase tracking-widest">
                Selected Lecture
              </span>

              <h4 className="text-lg font-bold text-white mt-1">
                {selectedLecture.title ||
                  selectedLecture.name ||
                  selectedLecture.metadata?.title ||
                  "Untitled Lecture"}
              </h4>

              <p className="text-[10px] text-slate-500 mt-1 font-mono">
                ID:{" "}
                {selectedLecture.id ||
                  selectedLecture.lecture_id}
              </p>
            </div>

            <button
              onClick={() => loadHeatmap(selectedId)}
              disabled={loadingHeatmap}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 text-xs font-semibold disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  loadingHeatmap
                    ? "animate-spin"
                    : ""
                }`}
              />
              Refresh Analytics
            </button>

          </div>

        </div>
      )}

      {/* Error / no analytics */}
      {error && (
        <div className="glass-panel rounded-2xl p-5 border border-amber-500/20 bg-amber-500/5">

          <div className="flex gap-3 items-start">

            <Info className="h-5 w-5 text-amber-400 shrink-0" />

            <div>
              <p className="text-sm font-semibold text-amber-300">
                Analytics Information
              </p>

              <p className="text-xs text-slate-400 mt-1">
                {error}
              </p>
            </div>

          </div>

        </div>
      )}

      {/* Heatmap loading */}
      {loadingHeatmap && (
        <div className="glass-panel p-20 text-center rounded-2xl">

          <div className="h-8 w-8 rounded-full border-2 border-t-accent-500 border-slate-800 animate-spin mx-auto mb-4" />

          <p className="text-xs text-slate-400">
            Loading confusion analytics...
          </p>

        </div>
      )}

      {/* No analytics */}
      {!loadingHeatmap &&
        lectures.length > 0 &&
        heatmap.length === 0 && (
          <div className="glass-panel rounded-2xl p-12 text-center">

            <Flame className="h-10 w-10 text-slate-600 mx-auto mb-4" />

            <h4 className="text-white font-bold mb-2">
              No Confusion Data Yet
            </h4>

            <p className="text-sm text-slate-500 max-w-md mx-auto">
              This lecture exists in your backend, but there
              are no confusion analytics available for it yet.
              No artificial values are being displayed.
            </p>

          </div>
        )}

      {/* Heatmap */}
      {!loadingHeatmap &&
        heatmap.length > 0 && (
          <div className="space-y-8">

            {/* Timeline */}
            <div className="glass-panel rounded-2xl p-6 border-slate-850">

              <h4 className="font-outfit font-bold text-xs text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                <Flame className="h-4 w-4 text-accent-500" />
                Timeline Heatmap Density
              </h4>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">

                {heatmap.map((segment, index) => {

                  const percentage =
                    getPercentage(segment);

                  const count =
                    getCount(segment);

                  const label =
                    getSegmentLabel(segment);

                  const style =
                    getHeatmapStyle(
                      percentage
                    );

                  return (
                    <div
                      key={`${label}-${index}`}
                      className={`p-4 rounded-xl border flex flex-col items-center justify-between text-center min-h-[110px] transition-all duration-300 ${style.container} ${style.shadow}`}
                    >

                      <span className="text-[9px] font-bold opacity-80">
                        {label}
                      </span>

                      <div className="my-2">

                        <span className="text-xl font-bold font-mono block">
                          {percentage}%
                        </span>

                        <span className="text-[8px] opacity-70 uppercase tracking-widest font-semibold block">
                          Confusion
                        </span>

                      </div>

                      <span className="text-[9px] opacity-80">
                        {count} flags
                      </span>

                    </div>
                  );
                })}

              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 mt-6 pt-5 border-t border-slate-800/45 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">

                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-brand-900 border border-slate-850" />
                  &lt; 30% Normal
                </span>

                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-amber-500/20 border border-amber-500/40" />
                  30% - 49% Elevated
                </span>

                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-rose-500/20 border border-rose-500/40" />
                  ≥ 50% High
                </span>

              </div>

            </div>

            {/* Detailed annotations */}
            <div className="glass-panel rounded-2xl p-6 border-slate-850 space-y-4">

              <h4 className="font-outfit font-bold text-xs text-white uppercase tracking-wider">
                Detailed Timeline Annotations
              </h4>

              {highConfusionSegments.length === 0 ? (
                <div className="p-5 bg-brand-950/40 rounded-xl border border-slate-850">

                  <p className="text-xs text-slate-500">
                    No elevated confusion segments were returned
                    by the backend for this lecture.
                  </p>

                </div>
              ) : (
                <div className="space-y-3">

                  {highConfusionSegments.map(
                    (segment, index) => {

                      const percentage =
                        getPercentage(segment);

                      const count =
                        getCount(segment);

                      const label =
                        getSegmentLabel(segment);

                      return (
                        <div
                          key={`${label}-annotation-${index}`}
                          className="p-4 bg-brand-950/40 rounded-xl border border-slate-850 flex gap-3 text-xs leading-relaxed text-slate-400"
                        >

                          <AlertTriangle
                            className={`h-5 w-5 shrink-0 mt-0.5 ${
                              percentage >= 50
                                ? "text-rose-500"
                                : "text-amber-500"
                            }`}
                          />

                          <div>

                            <p className="font-bold text-white mb-1">
                              Confusion activity at{" "}
                              {label}
                            </p>

                            <p>
                              Backend reported{" "}
                              <span className="font-semibold text-white">
                                {count}
                              </span>{" "}
                              confusion flag(s), representing{" "}
                              <span className="font-semibold text-white">
                                {percentage}%
                              </span>{" "}
                              confusion for this segment.
                            </p>

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>
              )}

            </div>

          </div>
        )}

    </div>
  );
}