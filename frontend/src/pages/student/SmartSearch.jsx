import React, { useState } from 'react';
import { Search, Sparkles, Clock, Play, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { studentAPI } from '../../services/api';

export default function SmartSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);
    setError(null);

    try {
      const data = await studentAPI.search(query.trim());
      const hits = Array.isArray(data?.results) ? data.results : [];
      setResults(hits);
    } catch (err) {
      console.error('Smart search error:', err);
      setResults([]);
      setError(err?.message || 'Unable to perform search at this time. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-8 max-w-4xl mx-auto">
      {/* Search Header */}
      <div className="text-center space-y-3 py-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-950/80 border border-primary-500/20 text-xs font-semibold text-primary-400">
          <Sparkles className="h-3.5 w-3.5" />
          Semantic Indexing Active
        </div>
        <h3 className="font-outfit font-extrabold text-3xl text-white">Smart Search</h3>
        <p className="text-sm text-slate-400 max-w-lg mx-auto">
          Query topics in plain English. CogniTrace searches video transcripts, slides, and class notes to pinpoint the exact lecture timestamps.
        </p>
      </div>

      {/* Search Input Bar */}
      <form onSubmit={handleSearch} className="max-w-2xl mx-auto flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for 'pointer manipulation', 'Big-O array', etc..."
            className="w-full pl-12 pr-4 py-3.5 bg-brand-900/40 rounded-xl border border-slate-800 focus:outline-none focus:border-primary-500 text-sm text-white placeholder-slate-500 transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm shadow-lg shadow-primary-600/10 flex items-center gap-2 transition-all"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {/* Search results */}
      <div className="max-w-2xl mx-auto mt-8 space-y-4">
        {loading && (
          <div className="text-center py-12">
            <div className="h-8 w-8 rounded-full border-2 border-t-primary-500 border-slate-800 animate-spin mx-auto mb-4"></div>
            <p className="text-xs text-slate-400 font-medium">Analyzing transcripts and matching concepts...</p>
          </div>
        )}

        {!loading && error && (
          <div className="glass-panel rounded-xl p-6 border-rose-900/30 bg-rose-950/10 text-center text-rose-300 text-xs flex items-center justify-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && searched && results.length === 0 && (
          <div className="glass-panel rounded-xl p-8 text-center text-slate-400 text-xs">
            No matching clips found for "{query}". Try a different search query or concept keyword.
          </div>
        )}

        {!loading && !error && results.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-outfit font-semibold text-xs text-slate-400 uppercase tracking-widest pl-2">
              Matching Video Segments
            </h4>
            {results.map((hit, i) => (
              <div
                key={hit.lecture_id ? `${hit.lecture_id}-${i}` : i}
                className="glass-panel p-5 rounded-xl border-slate-850 hover:border-slate-750 transition-colors flex gap-4"
              >
                <div className="flex flex-col items-center justify-center p-3 bg-brand-950/80 rounded-xl border border-slate-800 text-slate-400 shrink-0 select-none">
                  <Clock className="h-5 w-5 text-primary-400 mb-1" />
                  <span className="text-xs font-bold text-slate-200">{hit.timestamp}</span>
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex justify-between items-start">
                    <h5 className="text-xs font-bold text-white leading-snug">{hit.lecture_title}</h5>
                    {hit.relevance && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 uppercase">
                        {hit.relevance}% Match
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed italic bg-brand-950/20 p-2.5 rounded-lg border border-slate-900/60">
                    {hit.snippet}
                  </p>

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() =>
                        navigate(`/student/session?play=${hit.lecture_id}&t=${hit.seconds || 0}`)
                      }
                      className="inline-flex items-center gap-1 text-xs font-bold text-primary-400 hover:text-primary-300 transition-colors"
                    >
                      Jump to video segment
                      <Play className="h-3 w-3 ml-1 fill-current" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
