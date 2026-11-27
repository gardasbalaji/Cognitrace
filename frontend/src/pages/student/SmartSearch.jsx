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
    <div className="flex-1 p-8 overflow-y-auto space-y-8 max-w-4xl mx-auto bg-[#F8F8F2] text-[#26332A]">
      {/* Search Header */}
      <div className="text-center space-y-3 py-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#DCE8DC] border border-[#D9E1D2] text-xs font-bold text-[#264B39]">
          <Sparkles className="h-3.5 w-3.5 text-[#315C46]" />
          Semantic Indexing Active
        </div>
        <h3 className="font-outfit font-extrabold text-3xl text-[#26332A]">Smart Search</h3>
        <p className="text-sm text-[#68766B] max-w-lg mx-auto leading-relaxed">
          Query topics in plain English. CogniTrace searches video transcripts, slides, and class notes to pinpoint the exact lecture timestamps.
        </p>
      </div>

      {/* Search Input Bar */}
      <form onSubmit={handleSearch} className="max-w-2xl mx-auto flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#68766B]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for 'pointer manipulation', 'Big-O array', etc..."
            className="w-full pl-12 pr-4 py-3.5 bg-[#FCFCF8] rounded-full border border-[#D9E1D2] focus:outline-none focus:border-[#315C46] text-sm text-[#26332A] placeholder-[#879187] font-medium transition-colors shadow-xs"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3.5 bg-black hover:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-full text-sm shadow-sm flex items-center gap-2 transition-all cursor-pointer"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {/* Search results */}
      <div className="max-w-2xl mx-auto mt-8 space-y-4">
        {loading && (
          <div className="text-center py-12">
            <div className="h-8 w-8 rounded-full border-2 border-t-[#315C46] border-slate-200 animate-spin mx-auto mb-4"></div>
            <p className="text-xs text-[#68766B] font-medium">Analyzing transcripts and matching concepts...</p>
          </div>
        )}

        {!loading && error && (
          <div className="bg-rose-50 rounded-2xl p-6 border border-rose-200 text-center text-rose-700 text-xs flex items-center justify-center gap-2 font-medium">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && searched && results.length === 0 && (
          <div className="bg-[#E2E8D8] rounded-2xl p-8 text-center text-black font-medium text-xs border border-[#D9E1D2]">
            No matching clips found for "{query}". Try a different search query or concept keyword.
          </div>
        )}

        {!loading && !error && results.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-outfit font-extrabold text-xs text-black uppercase tracking-widest pl-2">
              Matching Video Segments
            </h4>
            {results.map((hit, i) => (
              <div
                key={hit.lecture_id ? `${hit.lecture_id}-${i}` : i}
                className="bg-[#E2E8D8] p-5 rounded-2xl border border-[#D9E1D2] hover:border-[#315C46]/50 transition-colors flex gap-4 shadow-sm"
              >
                <div className="flex flex-col items-center justify-center p-3 bg-[#FCFCF8] rounded-xl border border-[#D9E1D2] text-black shrink-0 select-none shadow-xs">
                  <Clock className="h-5 w-5 text-[#315C46] mb-1" />
                  <span className="text-xs font-extrabold text-black">{hit.timestamp}</span>
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex justify-between items-start">
                    <h5 className="text-xs font-extrabold text-black leading-snug">{hit.lecture_title}</h5>
                    {hit.relevance && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#315C46] text-white border border-[#D9E1D2] uppercase">
                        {hit.relevance}% Match
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-black leading-relaxed italic bg-[#FCFCF8] p-3 rounded-xl border border-[#D9E1D2] font-medium">
                    {hit.snippet}
                  </p>

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() =>
                        navigate(`/student/session?play=${hit.lecture_id}&t=${hit.seconds || 0}`)
                      }
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#315C46] hover:bg-[#264B39] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      Jump to video segment
                      <Play className="h-3 w-3 fill-current" />
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
