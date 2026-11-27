import React, { useState, useEffect } from 'react';
import { Info, RefreshCw } from 'lucide-react';
import { apiRequest } from '../../services/api';

export default function LectureComparison() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchComparison = async () => {
    setLoading(true);
    setError('');

    try {
      const json = await apiRequest('/api/faculty/compare-lectures');

      setData({
        labels: Array.isArray(json.labels)
          ? json.labels
          : [],

        views: Array.isArray(json.views)
          ? json.views
          : [],

        engagement_scores: Array.isArray(
          json.engagement_scores
        )
          ? json.engagement_scores
          : [],

        quality_scores: Array.isArray(
          json.quality_scores
        )
          ? json.quality_scores
          : [],

        risk_percentages: Array.isArray(
          json.risk_percentages
        )
          ? json.risk_percentages
          : [],

        avg_watch_percentages: Array.isArray(
          json.avg_watch_percentages
        )
          ? json.avg_watch_percentages
          : []
      });
    } catch (err) {
      console.error(
        'Lecture comparison loading error:',
        err
      );

      setError(
        'Unable to load lecture comparison data.'
      );

      setData({
        labels: [],
        views: [],
        engagement_scores: [],
        quality_scores: [],
        risk_percentages: [],
        avg_watch_percentages: []
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComparison();
  }, []);

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="h-8 w-8 rounded-full border-2 border-t-primary-500 border-[#D9E1D2] animate-spin"></div>
      </div>
    );
  }

  // --------------------------------------------------
  // EMPTY DATA
  // --------------------------------------------------

  const hasLectures =
    data &&
    Array.isArray(data.labels) &&
    data.labels.length > 0;

  if (!hasLectures) {
    return (
      <div className="flex-1 p-8 overflow-y-auto bg-[#F8F8F2] text-[#26332A]">
        <div className="max-w-5xl mx-auto space-y-8">

          {/* Header */}
          <div className="space-y-2 border-b border-[#D9E1D2] pb-6">
            <div className="flex items-start justify-between gap-4">

              <div>
                <h3 className="font-outfit font-extrabold text-2xl text-[#26332A]">
                  Lecture Comparison
                </h3>

                <p className="text-sm text-[#68766B] mt-2">
                  Compare student engagement and lecture
                  analytics using data from your imported
                  lectures.
                </p>
              </div>

              <button
                onClick={fetchComparison}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-black/10 border border-[#315C46]/20 text-[#315C46] hover:bg-black hover:text-[#26332A] transition-all text-xs font-bold shrink-0"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>

            </div>
          </div>

          {/* Empty State */}
          <div className="glass-panel rounded-2xl p-10 text-center">

            <div className="mx-auto mb-5 h-14 w-14 rounded-full bg-slate-800/70 flex items-center justify-center">
              <Info className="h-7 w-7 text-[#68766B]" />
            </div>

            <h4 className="font-outfit font-bold text-lg text-[#26332A]">
              No Lecture Comparison Data
            </h4>

            <p className="text-sm text-[#68766B] mt-2 max-w-md mx-auto">
              Import a lecture from the Faculty lecture
              section first. Comparison data will appear
              here from the lectures currently stored in
              the backend.
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

  // --------------------------------------------------
  // HELPERS
  // --------------------------------------------------

  const getValue = (array, index, fallback = 0) => {
    const value = array?.[index];

    if (
      value === null ||
      value === undefined ||
      Number.isNaN(Number(value))
    ) {
      return fallback;
    }

    return Number(value);
  };

  // --------------------------------------------------
  // MAIN UI
  // --------------------------------------------------

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-8 max-w-5xl mx-auto bg-[#F8F8F2] text-[#26332A]">

      {/* Header */}
      <div className="space-y-2 border-b border-[#D9E1D2] pb-6">

        <div className="flex items-start justify-between gap-4">

          <div>
            <h3 className="font-outfit font-extrabold text-2xl text-[#26332A]">
              Lecture Comparison
            </h3>

            <p className="text-sm text-[#68766B] mt-2">
              Compare student engagement and lecture
              analytics across the lectures currently
              stored in CogniTrace.
            </p>
          </div>

          <button
            onClick={fetchComparison}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-black/10 border border-[#315C46]/20 text-[#315C46] hover:bg-black hover:text-[#26332A] transition-all text-xs font-bold shrink-0"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>

        </div>

      </div>

      {/* ------------------------------------------------
          MAIN STATS COMPARISON TABLE
      ------------------------------------------------ */}

      <div className="glass-panel rounded-2xl overflow-hidden border-[#D9E1D2]">

        <div className="p-5 bg-[#D9E1D2]/40 border-b border-[#D9E1D2]">
          <h4 className="font-outfit font-bold text-xs text-[#26332A] uppercase tracking-wider">
            Metrics Table
          </h4>
        </div>

        <div className="overflow-x-auto">

          <table className="w-full text-left text-xs">

            <thead>
              <tr className="border-b border-[#D9E1D2] text-[#68766B] uppercase tracking-wider font-semibold bg-[#D9E1D2]/40">

                <th className="py-4 px-6">
                  Lecture
                </th>

                <th className="py-4 px-6 text-center">
                  Student Views
                </th>

                <th className="py-4 px-6 text-center">
                  Avg Watch Time %
                </th>

                <th className="py-4 px-6 text-center">
                  Engagement Rating
                </th>

                <th className="py-4 px-6 text-center">
                  Risk Percentage
                </th>

                <th className="py-4 px-6 text-center">
                  Quality Score
                </th>

              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/40">

              {data.labels.map((label, index) => {

                const views = getValue(
                  data.views,
                  index
                );

                const watchPercentage = getValue(
                  data.avg_watch_percentages,
                  index
                );

                const engagementScore = getValue(
                  data.engagement_scores,
                  index
                );

                const riskPercentage = getValue(
                  data.risk_percentages,
                  index
                );

                const qualityScore = getValue(
                  data.quality_scores,
                  index
                );

                return (
                  <tr
                    key={`${label}-${index}`}
                    className="text-[#68766B]"
                  >

                    <td className="py-5 px-6 font-semibold text-[#26332A]">
                      {label}
                    </td>

                    <td className="py-5 px-6 text-center font-bold">
                      {views}
                    </td>

                    <td className="py-5 px-6 text-center font-bold text-[#26332A]">
                      {watchPercentage}%
                    </td>

                    <td className="py-5 px-6 text-center font-semibold text-[#315C46]">
                      {engagementScore}%
                    </td>

                    <td className="py-5 px-6 text-center font-semibold text-rose-400">
                      {riskPercentage}%
                    </td>

                    <td className="py-5 px-6 text-center font-mono font-bold text-emerald-400">
                      {qualityScore}/100
                    </td>

                  </tr>
                );
              })}

            </tbody>

          </table>

        </div>

      </div>

      {/* ------------------------------------------------
          CHARTS
      ------------------------------------------------ */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* Lecture Quality Score */}
        <div className="glass-panel p-6 rounded-2xl">

          <h5 className="font-outfit font-bold text-xs text-[#26332A] uppercase tracking-wider mb-6">
            Lecture Quality Score Comparison
          </h5>

          <div className="space-y-5">

            {data.labels.map((label, index) => {

              const qualityScore = Math.max(
                0,
                Math.min(
                  100,
                  getValue(
                    data.quality_scores,
                    index
                  )
                )
              );

              return (
                <div
                  key={`quality-${label}-${index}`}
                  className="space-y-2"
                >

                  <div className="flex justify-between text-xs">

                    <span className="text-slate-450 font-medium">
                      {label}
                    </span>

                    <span className="text-emerald-400 font-bold">
                      {qualityScore}/100
                    </span>

                  </div>

                  <div className="w-full bg-slate-800 h-3 rounded-lg overflow-hidden">

                    <div
                      className="bg-emerald-500 h-full rounded-lg transition-all duration-500"
                      style={{
                        width: `${qualityScore}%`
                      }}
                    ></div>

                  </div>

                </div>
              );
            })}

          </div>

        </div>

        {/* Student Risk */}
        <div className="glass-panel p-6 rounded-2xl">

          <h5 className="font-outfit font-bold text-xs text-[#26332A] uppercase tracking-wider mb-6">
            Student Risk Rates (%)
          </h5>

          <div className="space-y-5">

            {data.labels.map((label, index) => {

              const riskPercentage = Math.max(
                0,
                Math.min(
                  100,
                  getValue(
                    data.risk_percentages,
                    index
                  )
                )
              );

              return (
                <div
                  key={`risk-${label}-${index}`}
                  className="space-y-2"
                >

                  <div className="flex justify-between text-xs">

                    <span className="text-slate-450 font-medium">
                      {label}
                    </span>

                    <span className="text-rose-500 font-bold">
                      {riskPercentage}%
                    </span>

                  </div>

                  <div className="w-full bg-slate-800 h-3 rounded-lg overflow-hidden">

                    <div
                      className="bg-rose-500 h-full rounded-lg transition-all duration-500"
                      style={{
                        width: `${riskPercentage}%`
                      }}
                    ></div>

                  </div>

                </div>
              );
            })}

          </div>

        </div>

      </div>

      {/* ------------------------------------------------
          INFORMATION
      ------------------------------------------------ */}

      <div className="p-4 bg-[#FCFCF8] border border-[#D9E1D2] rounded-xl flex gap-3 text-xs text-[#68766B] leading-relaxed">

        <Info className="h-5 w-5 text-[#315C46] shrink-0 mt-0.5" />

        <div>

          <p className="font-bold text-[#26332A] mb-0.5">
            Lecture Analytics
          </p>

          <p>
            The metrics shown above are loaded directly
            from the Faculty backend for the lectures
            currently available in persistent lecture
            storage. Newly imported lectures will appear
            automatically after refreshing the data.
          </p>

        </div>

      </div>

    </div>
  );
}