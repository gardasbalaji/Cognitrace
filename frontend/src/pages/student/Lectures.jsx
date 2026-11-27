import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, Play, Search, X, Filter } from 'lucide-react';

export default function Lectures() {
  const navigate = useNavigate();
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');

  const fetchLectures = async () => {
    try {
      const res = await fetch('/api/student/lectures');
      if (res.ok) {
        const data = await res.json();
        setLectures(data);
      } else {
        setLectures([]);
      }
    } catch (err) {
      console.error(err);
      setLectures([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLectures();
  }, []);

  // Filter options based on available lectures
  const teachers = useMemo(() => {
    const list = new Set();
    lectures.forEach(l => {
      if (l.faculty_name) list.add(l.faculty_name);
    });
    return Array.from(list).sort();
  }, [lectures]);

  const subjects = useMemo(() => {
    const list = new Set();
    lectures.forEach(l => {
      if (l.subject) list.add(l.subject);
    });
    return Array.from(list).sort();
  }, [lectures]);

  const categories = useMemo(() => {
    const list = new Set();
    lectures.forEach(l => {
      if (l.category && (!selectedSubject || l.subject === selectedSubject)) {
        list.add(l.category);
      }
    });
    return Array.from(list).sort();
  }, [lectures, selectedSubject]);

  const subcategories = useMemo(() => {
    const list = new Set();
    lectures.forEach(l => {
      if (l.subcategory && (!selectedCategory || l.category === selectedCategory)) {
        list.add(l.subcategory);
      }
    });
    return Array.from(list).sort();
  }, [lectures, selectedCategory]);

  // When subject changes, reset category and subcategory
  useEffect(() => {
    setSelectedCategory('');
    setSelectedSubcategory('');
  }, [selectedSubject]);

  // When category changes, reset subcategory
  useEffect(() => {
    setSelectedSubcategory('');
  }, [selectedCategory]);

  const filteredLectures = useMemo(() => {
    return lectures.filter(lec => {
      // Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matches = (
          (lec.title || '').toLowerCase().includes(query) ||
          (lec.faculty_name || '').toLowerCase().includes(query) ||
          (lec.subject || '').toLowerCase().includes(query) ||
          (lec.category || '').toLowerCase().includes(query) ||
          (lec.subcategory || '').toLowerCase().includes(query)
        );
        if (!matches) return false;
      }
      // Filters
      if (selectedTeacher && lec.faculty_name !== selectedTeacher) return false;
      if (selectedSubject && lec.subject !== selectedSubject) return false;
      if (selectedCategory && lec.category !== selectedCategory) return false;
      if (selectedSubcategory && lec.subcategory !== selectedSubcategory) return false;
      
      return true;
    });
  }, [lectures, searchQuery, selectedTeacher, selectedSubject, selectedCategory, selectedSubcategory]);

  const handleStartLecture = (id) => {
    navigate(`/student/session?play=${id}`);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTeacher('');
    setSelectedSubject('');
    setSelectedCategory('');
    setSelectedSubcategory('');
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-[#F8F8F2] text-[#68766B]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-t-[#315C46] border-[#D9E1D2] animate-spin"></div>
          <span className="text-[#68766B] text-sm font-medium">Loading Course Lectures...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-8 max-w-6xl mx-auto relative bg-[#F8F8F2] text-[#26332A]">
      {/* Page Header */}
      <div className="space-y-2 border-b border-[#D9E1D2] pb-6">
        <h3 className="font-outfit font-extrabold text-2xl text-[#26332A]">Course Lectures</h3>
        <p className="text-sm text-[#68766B]">
          Browse lectures uploaded by your teachers. Search, filter, and select a lecture to start learning.
        </p>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="bg-[#E2E8D8] rounded-3xl p-6 border border-[#D9E1D2] space-y-4 shadow-sm">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#68766B]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search lectures, teachers, subjects..."
            className="w-full pl-11 pr-4 py-3 bg-[#FCFCF8] border border-[#D9E1D2] rounded-full text-sm text-[#26332A] focus:outline-none focus:border-[#315C46] transition-colors font-medium placeholder-[#879187]"
          />
        </div>
        
        {/* Dropdowns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-1 relative flex items-center">
            <Filter className="absolute left-3 w-4 h-4 text-[#68766B]" />
            <select
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-[#FCFCF8] border border-[#D9E1D2] rounded-xl text-xs text-[#26332A] focus:outline-none focus:border-[#315C46] transition-colors"
            >
              <option value="">All Teachers</option>
              {teachers.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full px-4 py-2.5 bg-[#FCFCF8] border border-[#D9E1D2] rounded-xl text-xs text-[#26332A] focus:outline-none focus:border-[#315C46] transition-colors"
          >
            <option value="">All Subjects</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            disabled={!selectedSubject && categories.length === 0}
            className="w-full px-4 py-2.5 bg-[#FCFCF8] border border-[#D9E1D2] rounded-xl text-xs text-[#26332A] focus:outline-none focus:border-[#315C46] transition-colors disabled:opacity-50"
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select
            value={selectedSubcategory}
            onChange={(e) => setSelectedSubcategory(e.target.value)}
            disabled={!selectedCategory && subcategories.length === 0}
            className="w-full px-4 py-2.5 bg-[#FCFCF8] border border-[#D9E1D2] rounded-xl text-xs text-[#26332A] focus:outline-none focus:border-[#315C46] transition-colors disabled:opacity-50"
          >
            <option value="">All Subcategories</option>
            {subcategories.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <button
            onClick={clearFilters}
            className="w-full px-4 py-2.5 bg-[#FCFCF8] border border-[#D9E1D2] hover:bg-[#FCFCF8] text-[#68766B] rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <X className="w-3 h-3" /> Clear Filters
          </button>
        </div>
      </div>

      {/* Lectures Cards Grid */}
      {lectures.length === 0 ? (
        <div className="bg-[#E2E8D8] p-12 text-center rounded-3xl border border-[#D9E1D2] space-y-3">
          <p className="text-base text-black font-extrabold">No lectures available yet</p>
          <p className="text-xs text-black/80 max-w-sm mx-auto leading-relaxed font-medium">
            Your teachers haven't uploaded any lectures yet. Please check again later.
          </p>
        </div>
      ) : filteredLectures.length === 0 ? (
        <div className="bg-[#E2E8D8] p-12 text-center rounded-3xl border border-[#D9E1D2] space-y-3">
          <p className="text-base text-black font-extrabold">No lectures found</p>
          <p className="text-xs text-black/80 max-w-sm mx-auto leading-relaxed font-medium">
            Try changing your search or filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLectures.map((lec) => (
            <div 
              key={lec.id}
              className="bg-[#E2E8D8] rounded-3xl border border-[#D9E1D2] hover:border-[#315C46]/50 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group overflow-hidden"
            >
              {/* Visual Thumbnail Overlay */}
              <div className="h-40 w-full relative flex items-center justify-center border-b border-[#D9E1D2] overflow-hidden bg-[#FCFCF8]">
                {lec.thumbnail_url ? (
                  <img src={lec.thumbnail_url} alt={lec.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-tr from-[#DCE8DC] to-[#EFF1E7] flex items-center justify-center">
                    <BookOpen className="h-10 w-10 text-[#315C46]/40 group-hover:scale-110 transition-transform duration-300" />
                  </div>
                )}
                <div className="absolute bottom-3 left-3 flex gap-2">
                  <span className="text-[10px] font-bold bg-[#FCFCF8] border border-[#D9E1D2] text-black px-2.5 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-sm shadow-xs">
                    <Clock className="h-3 w-3 text-[#315C46]" /> {lec.duration}
                  </span>
                </div>
              </div>

              {/* Content Details */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  {/* Taxonomy */}
                  <div className="text-[10px] text-[#315C46] font-extrabold uppercase tracking-wider line-clamp-1">
                    {lec.subject ? (
                      <>
                        {lec.subject}
                        {lec.category && ` › ${lec.category}`}
                        {lec.subcategory && ` › ${lec.subcategory}`}
                      </>
                    ) : (
                      <span className="text-black/70">Uncategorized</span>
                    )}
                  </div>
                  
                  <h4 className="font-outfit font-extrabold text-base text-black group-hover:text-[#315C46] transition-colors line-clamp-2 leading-snug">
                    {lec.title}
                  </h4>
                  
                  <div className="text-xs text-black/80 font-medium">
                    👨‍🏫 Teacher: <span className="text-black font-extrabold">{lec.faculty_name}</span>
                  </div>
                </div>

                <div className="pt-4 mt-auto">
                  <button 
                    onClick={() => handleStartLecture(lec.id)}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-[#315C46] hover:bg-[#264B39] text-white transition-all text-xs font-bold shadow-sm cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" /> Watch Lecture
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}