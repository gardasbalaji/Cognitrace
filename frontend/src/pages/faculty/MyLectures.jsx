import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, 
  BarChart2, 
  Search,
  Filter,
  FileVideo,
  X,
  Trash2
} from 'lucide-react';

export default function MyLectures() {
  const navigate = useNavigate();

  const [lectures, setLectures] = useState([]);
  const [selectedLecture, setSelectedLecture] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtering and search state
  const [searchQuery, setSearchQuery] = useState('');
  
  const [subjects, setSubjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');

  // Load lectures
  const loadLectures = async () => {
    setLoading(true);
    setError('');
    
    // We assume the auth token is already handled by the app's interceptors/fetch wrapper
    // The backend uses JWT to find current faculty.
    try {
      const response = await fetch('/api/faculty/my-lectures');

      if (!response.ok) {
        throw new Error('Failed to load my lectures.');
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        setLectures(data);
      } else {
        setLectures([]);
      }
    } catch (err) {
      console.error('[MY LECTURES]', err);
      setError('Could not load your lectures. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load classification data for filters
  const loadSubjects = async () => {
    try {
      const res = await fetch('/api/faculty/subjects');
      if (res.ok) setSubjects(await res.json());
    } catch (err) { console.error(err); }
  };

  const loadCategories = async (subjectId) => {
    if (!subjectId) {
      setCategories([]);
      return;
    }
    try {
      const res = await fetch(`/api/faculty/subjects/${subjectId}/categories`);
      if (res.ok) setCategories(await res.json());
    } catch (err) { console.error(err); }
  };

  const loadSubcategories = async (categoryId) => {
    if (!categoryId) {
      setSubcategories([]);
      return;
    }
    try {
      const res = await fetch(`/api/faculty/categories/${categoryId}/subcategories`);
      if (res.ok) setSubcategories(await res.json());
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    loadLectures();
    loadSubjects();
  }, []);

  useEffect(() => {
    loadCategories(selectedSubject);
    setSelectedCategory('');
    setSelectedSubcategory('');
  }, [selectedSubject]);

  useEffect(() => {
    loadSubcategories(selectedCategory);
    setSelectedSubcategory('');
  }, [selectedCategory]);

  // Filter lectures
  const filteredLectures = lectures.filter((lecture) => {
    // 1. Search match
    const query = searchQuery.toLowerCase();
    const titleMatch = (lecture.title || '').toLowerCase().includes(query);
    const descMatch = (lecture.description || '').toLowerCase().includes(query);
    const matchesSearch = titleMatch || descMatch;

    if (!matchesSearch) return false;

    // 2. Taxonomy match
    if (selectedSubject) {
      const subjName = subjects.find(s => s.id === selectedSubject)?.name;
      if (lecture.subject !== subjName) return false;
    }

    if (selectedCategory) {
      const catName = categories.find(c => c.id === selectedCategory)?.name;
      if (lecture.category !== catName) return false;
    }

    if (selectedSubcategory) {
      const subcatName = subcategories.find(s => s.id === selectedSubcategory)?.name;
      if (lecture.subcategory !== subcatName) return false;
    }

    return true;
  });

  
  const getYoutubeEmbedUrl = (lecture) => {
    if (!lecture.youtube_id) return '';
    return `https://www.youtube.com/embed/${lecture.youtube_id}`;
  };

  const handleDeleteLecture = async (lectureId) => {
    if (!window.confirm('Are you sure you want to remove this lecture?')) return;
    
    try {
      const response = await fetch(`/api/faculty/lectures/${lectureId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete lecture');
      }
      
      setLectures(lectures.filter(l => l.id !== lectureId));
    } catch (err) {
      console.error('[DELETE LECTURE]', err);
      alert('Could not delete the lecture. Please try again.');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#F8F8F2] text-[#26332A]">
      
      {/* HEADER */}
      <header className="shrink-0 h-16 border-b border-[#D9E1D2] bg-[#E2E8D8] backdrop-blur-md flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-outfit font-bold text-[#26332A] tracking-wide">
            My Lectures
          </h1>
          <div className="h-4 w-px bg-slate-800"></div>
          <span className="text-xs text-[#68766B] font-medium tracking-wide">
            Lectures uploaded by you
          </span>
        </div>
      </header>

      {/* CONTENT */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        
        
        {/* VIDEO PREVIEW MODAL */}
        {selectedLecture && (
          <section className="bg-[#E2E8D8] rounded-2xl border border-[#D9E1D2] p-6 space-y-5 animate-fade-in-up">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] text-[#315C46] font-bold uppercase tracking-widest">
                  Lecture Preview
                </span>
                <h2 className="text-xl font-outfit font-bold text-[#26332A] mt-1">
                  {selectedLecture.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedLecture(null)}
                className="text-xs text-[#68766B] hover:text-[#26332A] flex flex-col items-center"
              >
                <X className="w-5 h-5" />
                Close
              </button>
            </div>

            {selectedLecture.source_type === 'youtube' && selectedLecture.youtube_id ? (
              <div className="relative aspect-video max-w-4xl mx-auto rounded-xl overflow-hidden bg-black border border-[#D9E1D2]">
                <iframe
                  src={getYoutubeEmbedUrl(selectedLecture)}
                  title={selectedLecture.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="relative aspect-video max-w-4xl mx-auto rounded-xl overflow-hidden bg-black border border-[#D9E1D2]">
                <video
                  src={`/api/faculty/lectures/${selectedLecture.id}/video`}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                >
                  Your browser does not support HTML5 video.
                </video>
              </div>
            )}
          </section>
        )}

        {/* FILTERS & SEARCH */}
        <div className="bg-[#FCFCF8] border border-[#D9E1D2] rounded-2xl p-4 md:p-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#68766B]" />
              <input
                type="text"
                placeholder="Search by title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#FCFCF8] border border-[#D9E1D2] rounded-xl text-sm text-[#26332A] placeholder-slate-400 focus:outline-none focus:border-[#315C46] transition-colors"
              />
            </div>

            {/* Subject */}
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-4 py-2 bg-[#FCFCF8] border border-[#D9E1D2] rounded-xl text-sm text-[#26332A] focus:outline-none focus:border-[#315C46] transition-colors"
            >
              <option value="">All Subjects</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            {/* Category */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              disabled={!selectedSubject}
              className="px-4 py-2 bg-[#FCFCF8] border border-[#D9E1D2] rounded-xl text-sm text-[#26332A] focus:outline-none focus:border-[#315C46] transition-colors disabled:opacity-50"
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            {/* Subcategory */}
            <select
              value={selectedSubcategory}
              onChange={(e) => setSelectedSubcategory(e.target.value)}
              disabled={!selectedCategory}
              className="px-4 py-2 bg-[#FCFCF8] border border-[#D9E1D2] rounded-xl text-sm text-[#26332A] focus:outline-none focus:border-[#315C46] transition-colors disabled:opacity-50"
            >
              <option value="">All Subcategories</option>
              {subcategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            
          </div>
          
          <div className="text-xs text-[#68766B] font-medium">
            Showing {filteredLectures.length} Lecture{filteredLectures.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* LECTURES GRID */}
        {loading ? (
          <div className="text-center text-[#68766B] py-10 text-sm">Loading your lectures...</div>
        ) : error ? (
          <div className="text-center text-rose-400 py-10 text-sm">{error}</div>
        ) : filteredLectures.length === 0 ? (
          <div className="text-center text-[#68766B] py-10 text-sm">
            {lectures.length === 0 
              ? "You haven't uploaded any lectures yet." 
              : "No lectures match your current filters."}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLectures.map((lecture) => (
              <div 
                key={lecture.id} 
                className="bg-[#FCFCF8] border border-[#D9E1D2] rounded-2xl overflow-hidden flex flex-col hover:border-[#315C46]/20 transition-colors"
              >
                {/* Card Body */}
                <div className="p-5 flex-1">
                  
                  {/* Taxonomy */}
                  {(lecture.subject || lecture.category) ? (
                    <div className="text-[10px] text-[#315C46] font-bold mb-2 uppercase tracking-wider line-clamp-1">
                      {lecture.subject}
                      {lecture.category && ` › ${lecture.category}`}
                      {lecture.subcategory && ` › ${lecture.subcategory}`}
                    </div>
                  ) : (
                    <div className="text-[10px] text-[#26332A] font-bold mb-2 uppercase tracking-wider">
                      Uncategorized
                    </div>
                  )}

                  <h3 className="text-base font-outfit font-bold text-[#26332A] leading-tight mb-2 line-clamp-2">
                    {lecture.title || 'Untitled Lecture'}
                  </h3>

                  <div className="text-xs text-[#68766B] mb-4 line-clamp-2">
                    {lecture.description || 'No description provided.'}
                  </div>

                  {/* Meta */}
                  <div className="space-y-1 mt-auto">
                    <p className="text-xs text-[#68766B]">
                      <span className="font-semibold text-[#68766B]">Source:</span> {lecture.source_type === 'youtube' ? 'YouTube' : 'Local Video'}
                    </p>
                    <p className="text-xs text-[#68766B]">
                      <span className="font-semibold text-[#68766B]">Duration:</span> {lecture.duration || 'Unknown'}
                    </p>
                    {(lecture.prerequisite_lecture_title || lecture.prerequisite_topic || (lecture.prerequisites && lecture.prerequisites[0])) && (
                      <p className="text-xs text-[#68766B] line-clamp-1">
                        <span className="font-semibold text-amber-400">Prerequisite Video:</span> {lecture.prerequisite_lecture_title || lecture.prerequisite_topic || lecture.prerequisites[0]}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Actions */}
                <div className="bg-[#D9E1D2]/40 p-4 border-t border-[#D9E1D2] flex items-center justify-between gap-3">
                  <button 
                    onClick={() => setSelectedLecture(lecture)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#315C46] hover:bg-[#264B39] text-[#26332A] rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Play className="w-3 h-3" />
                    View Lecture
                  </button>
                  <button 
                    onClick={() => navigate(`/faculty/lecture/${lecture.id}`)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#315C46]/10 hover:bg-[#315C46]/20 text-[#315C46] rounded-lg text-xs font-semibold transition-colors"
                  >
                    <BarChart2 className="w-3 h-3" />
                    Analytics
                  </button>
                  <button 
                    onClick={() => handleDeleteLecture(lecture.id)}
                    className="flex items-center justify-center p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                    title="Remove Lecture"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
