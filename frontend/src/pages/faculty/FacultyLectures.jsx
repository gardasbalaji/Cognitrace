//frontend/src/pages/faculty/FacultyLectures.jsx

import React, { useEffect, useRef, useState } from 'react';
import {
  UploadCloud,
  Link,
  FileVideo,
  BookOpen,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileText,
  Database,
  RefreshCw,
  Play,
  ExternalLink
} from 'lucide-react';

export default function FacultyLectures() {
  // ============================================================
  // STATE
  // ============================================================

  const [lectures, setLectures] = useState([]);

  const [loadingLectures, setLoadingLectures] = useState(true);

  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeLoading, setYoutubeLoading] = useState(false);
  const [youtubeError, setYoutubeError] = useState('');
  const [youtubeSuccess, setYoutubeSuccess] = useState('');
  const [youtubeResult, setYoutubeResult] = useState(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [localTitle, setLocalTitle] = useState('');
  const [localDescription, setLocalDescription] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploadResult, setUploadResult] = useState(null);

  const [selectedLecture, setSelectedLecture] = useState(null);

  const fileInputRef = useRef(null);

  // Classification State
  const [subjects, setSubjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');

  const [addingSubject, setAddingSubject] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [addingSubcategory, setAddingSubcategory] = useState(false);
  const [newSubcategory, setNewSubcategory] = useState('');

  // Prerequisite Video State
  const [selectedPrerequisiteLectureId, setSelectedPrerequisiteLectureId] = useState('');

  const loadSubjects = async () => {
    try {
      const res = await fetch('/api/faculty/subjects');
      if (res.ok) {
        const data = await res.json();
        setSubjects(data);
      }
    } catch (err) { console.error(err); }
  };

  const loadCategories = async (subjectId) => {
    if (!subjectId) {
      setCategories([]);
      return;
    }
    try {
      const res = await fetch(`/api/faculty/subjects/${subjectId}/categories`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) { console.error(err); }
  };

  const loadSubcategories = async (categoryId) => {
    if (!categoryId) {
      setSubcategories([]);
      return;
    }
    try {
      const res = await fetch(`/api/faculty/categories/${categoryId}/subcategories`);
      if (res.ok) {
        const data = await res.json();
        setSubcategories(data);
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
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

  const handleAddSubject = async () => {
    if(!newSubject.trim()) return;
    try {
      const res = await fetch('/api/faculty/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSubject.trim() })
      });
      if (res.ok) {
        const added = await res.json();
        setSubjects([...subjects, added]);
        setSelectedSubject(added.id);
        setAddingSubject(false);
        setNewSubject('');
      } else {
        alert('Failed to create subject.');
      }
    } catch (e) { console.error(e); }
  };

  const handleAddCategory = async () => {
    if(!newCategory.trim() || !selectedSubject) return;
    try {
      const res = await fetch(`/api/faculty/subjects/${selectedSubject}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategory.trim() })
      });
      if (res.ok) {
        const added = await res.json();
        setCategories([...categories, added]);
        setSelectedCategory(added.id);
        setAddingCategory(false);
        setNewCategory('');
      } else {
        alert('Failed to create category.');
      }
    } catch (e) { console.error(e); }
  };

  const handleAddSubcategory = async () => {
    if(!newSubcategory.trim() || !selectedCategory) return;
    try {
      const res = await fetch(`/api/faculty/categories/${selectedCategory}/subcategories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSubcategory.trim() })
      });
      if (res.ok) {
        const added = await res.json();
        setSubcategories([...subcategories, added]);
        setSelectedSubcategory(added.id);
        setAddingSubcategory(false);
        setNewSubcategory('');
      } else {
        alert('Failed to create subcategory.');
      }
    } catch (e) { console.error(e); }
  };


  // ============================================================
  // LOAD FACULTY LECTURES
  // ============================================================

  const loadLectures = async () => {
    setLoadingLectures(true);

    try {
      const response = await fetch('/api/faculty/lectures');

      if (!response.ok) {
        throw new Error('Failed to load faculty lectures.');
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        setLectures(data);
      } else {
        setLectures([]);
      }
    } catch (error) {
      console.error('[FACULTY LECTURES]', error);
      setLectures([]);
    } finally {
      setLoadingLectures(false);
    }
  };

  useEffect(() => {
    loadLectures();
  }, []);

  // ============================================================
  // YOUTUBE IMPORT
  // ============================================================

  const handleYoutubeImport = async (event) => {
    event.preventDefault();

    if (!youtubeUrl.trim() || !selectedSubject || !selectedCategory) {
      setYoutubeError('Please enter a YouTube URL, Subject, and Category.');
      return;
    }

    setYoutubeLoading(true);
    setYoutubeError('');
    setYoutubeSuccess('');
    setYoutubeResult(null);

    try {
      const response = await fetch(
        '/api/faculty/lectures/import-youtube',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url: youtubeUrl.trim(),
            subject: subjects.find(s=>s.id===selectedSubject)?.name,
            category: categories.find(c=>c.id===selectedCategory)?.name,
            subcategory: subcategories.find(s=>s.id===selectedSubcategory)?.name,
            prerequisite_lecture_id: selectedPrerequisiteLectureId || null,
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
          'Failed to import the YouTube lecture.'
        );
      }

      setYoutubeResult(data);

      setYoutubeSuccess(
        `Lecture "${data.lecture?.title || 'Lecture'}" imported successfully.`
      );

      setYoutubeUrl('');
      setSelectedPrerequisiteLectureId('');

      await loadLectures();
    } catch (error) {
      console.error('[YOUTUBE IMPORT]', error);

      setYoutubeError(
        error.message ||
        'Failed to import YouTube lecture.'
      );
    } finally {
      setYoutubeLoading(false);
    }
  };

  // ============================================================
  // LOCAL FILE SELECTION
  // ============================================================

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      setSelectedFile(null);
      return;
    }

    setUploadError('');
    setUploadSuccess('');
    setUploadResult(null);

    setSelectedFile(file);

    if (!localTitle.trim()) {
      const filenameWithoutExtension =
        file.name.replace(/\.[^/.]+$/, '');

      setLocalTitle(filenameWithoutExtension);
    }
  };

  // ============================================================
  // LOCAL VIDEO UPLOAD
  // ============================================================

  const handleLocalUpload = async (event) => {
    event.preventDefault();

    setUploadError('');
    setUploadSuccess('');
    setUploadResult(null);

    if (!selectedFile) {
      setUploadError('Please select a video file.');
      return;
    }

    if (!localTitle.trim() || !selectedSubject || !selectedCategory) {
      setUploadError('Please enter a title, subject, and category.');
      return;
    }

    const formData = new FormData();

    formData.append('video', selectedFile);
    formData.append('title', localTitle.trim());
    if (selectedSubject) formData.append('subject', subjects.find(s=>s.id===selectedSubject)?.name);
    if (selectedCategory) formData.append('category', categories.find(c=>c.id===selectedCategory)?.name);
    if (selectedSubcategory) formData.append('subcategory', subcategories.find(s=>s.id===selectedSubcategory)?.name);

    if (selectedPrerequisiteLectureId) {
      formData.append('prerequisite_lecture_id', selectedPrerequisiteLectureId);
    }

    formData.append(
      'description',
      localDescription.trim()
    );

    setUploadLoading(true);

    try {
      const response = await fetch(
        '/api/faculty/lectures/upload',
        {
          method: 'POST',
          body: formData
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
          'Failed to upload lecture.'
        );
      }

      setUploadResult(data);

      setUploadSuccess(
        `Lecture "${data.lecture?.title || localTitle}" uploaded successfully.`
      );

      setSelectedFile(null);
      setLocalTitle('');
      setLocalDescription('');
      setSelectedPrerequisiteLectureId('');

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      await loadLectures();
    } catch (error) {
      console.error('[LOCAL UPLOAD]', error);

      setUploadError(
        error.message ||
        'Failed to upload lecture.'
      );
    } finally {
      setUploadLoading(false);
    }
  };

  // ============================================================
  // SELECT LECTURE
  // ============================================================

  const handleSelectLecture = (lecture) => {
    setSelectedLecture(lecture);
  };

  // ============================================================
  // YOUTUBE EMBED
  // ============================================================

  const getYoutubeEmbedUrl = (lecture) => {
    if (!lecture?.youtube_id) {
      return null;
    }

    return `https://www.youtube.com/embed/${lecture.youtube_id}`;
  };

  // ============================================================
  // FORMAT SOURCE
  // ============================================================

  const getSourceLabel = (lecture) => {
    if (
      lecture?.source_type === 'youtube' ||
      lecture?.youtube_id
    ) {
      return 'YouTube';
    }

    return 'Uploaded Video';
  };

  // ============================================================
  // STATUS
  // ============================================================

  const getStatusClass = (status) => {
    const value = String(
      status || 'READY'
    ).toUpperCase();

    if (value === 'READY') {
      return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    }

    if (
      value.includes('FAILED') ||
      value.includes('ERROR')
    ) {
      return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    }

    if (
      value.includes('PROCESS')
    ) {
      return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    }

    return 'text-slate-300 bg-slate-800 border-slate-700';
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="flex-1 overflow-y-auto bg-brand-950">

      <div className="max-w-7xl mx-auto p-6 lg:p-8 space-y-8">

        {/* ======================================================
            PAGE HEADER
        ====================================================== */}

        <section className="space-y-2">

          <div className="flex items-center gap-3">

            <div className="h-11 w-11 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary-400" />
            </div>

            <div>
              <h1 className="text-2xl font-outfit font-bold text-white">
                Upload / Import Lecture
              </h1>

              <p className="text-sm text-slate-400 mt-1">
                Add lecture videos to CogniTrace for
                transcript generation, analytics and
                AI-powered learning assistance.
              </p>
            </div>

          </div>

        </section>


        {/* ======================================================
            IMPORT OPTIONS
        ====================================================== */}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* ====================================================
              YOUTUBE IMPORT
          ==================================================== */}

          <section className="glass-panel rounded-2xl border border-slate-800 p-6">

            <div className="flex items-start gap-4 mb-6">

              <div className="h-11 w-11 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <Link className="h-5 w-5 text-red-400" />
              </div>

              <div>
                <h2 className="text-lg font-outfit font-bold text-white">
                  Import from YouTube
                </h2>

                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Paste a YouTube lecture URL. CogniTrace
                  will fetch metadata, retrieve the available
                  transcript and index it for AI search.
                </p>
              </div>

            </div>


            <form
              onSubmit={handleYoutubeImport}
              className="space-y-4"
            >

              <div>

                
              {/* Classification */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">Subject</label>
                  <div className="flex gap-2">
                    <select
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      className="flex-1 px-4 py-3 rounded-xl bg-brand-900/60 border border-slate-800 text-sm text-white focus:border-primary-500"
                    >
                      <option value="">Select a subject...</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <button type="button" onClick={() => setAddingSubject(!addingSubject)} className="px-3 py-2 bg-slate-800 text-white rounded-xl text-xs">+ Add</button>
                  </div>
                  {addingSubject && (
                    <div className="flex gap-2 mt-2">
                      <input type="text" value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="New Subject" className="flex-1 px-3 py-2 rounded-lg bg-brand-800 text-xs text-white" />
                      <button type="button" onClick={handleAddSubject} className="px-3 py-2 bg-primary-600 text-white rounded-lg text-xs">Save</button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">Category</label>
                  <div className="flex gap-2">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      disabled={!selectedSubject}
                      className="flex-1 px-4 py-3 rounded-xl bg-brand-900/60 border border-slate-800 text-sm text-white focus:border-primary-500 disabled:opacity-50"
                    >
                      <option value="">Select a category...</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button type="button" disabled={!selectedSubject} onClick={() => setAddingCategory(!addingCategory)} className="px-3 py-2 bg-slate-800 text-white rounded-xl text-xs disabled:opacity-50">+ Add</button>
                  </div>
                  {addingCategory && (
                    <div className="flex gap-2 mt-2">
                      <input type="text" value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="New Category" className="flex-1 px-3 py-2 rounded-lg bg-brand-800 text-xs text-white" />
                      <button type="button" onClick={handleAddCategory} className="px-3 py-2 bg-primary-600 text-white rounded-lg text-xs">Save</button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">Subcategory (optional)</label>
                  <div className="flex gap-2">
                    <select
                      value={selectedSubcategory}
                      onChange={(e) => setSelectedSubcategory(e.target.value)}
                      disabled={!selectedCategory}
                      className="flex-1 px-4 py-3 rounded-xl bg-brand-900/60 border border-slate-800 text-sm text-white focus:border-primary-500 disabled:opacity-50"
                    >
                      <option value="">Select a subcategory...</option>
                      {subcategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <button type="button" disabled={!selectedCategory} onClick={() => setAddingSubcategory(!addingSubcategory)} className="px-3 py-2 bg-slate-800 text-white rounded-xl text-xs disabled:opacity-50">+ Add</button>
                  </div>
                  {addingSubcategory && (
                    <div className="flex gap-2 mt-2">
                      <input type="text" value={newSubcategory} onChange={e => setNewSubcategory(e.target.value)} placeholder="New Subcategory" className="flex-1 px-3 py-2 rounded-lg bg-brand-800 text-xs text-white" />
                      <button type="button" onClick={handleAddSubcategory} className="px-3 py-2 bg-primary-600 text-white rounded-lg text-xs">Save</button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">Prerequisite Video (optional)</label>
                  <select
                    value={selectedPrerequisiteLectureId}
                    onChange={(e) => setSelectedPrerequisiteLectureId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-brand-900/60 border border-slate-800 text-sm text-white focus:border-primary-500"
                  >
                    <option value="">None (No prerequisite video)</option>
                    {lectures.map((lec) => (
                      <option key={lec.id} value={lec.id}>
                        {lec.title || 'Untitled Lecture'} {lec.duration ? `(${lec.duration})` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Select an existing lecture video that students should watch before this one.
                  </p>
                </div>
              </div>

<label className="block text-xs font-semibold text-slate-300 mb-2">
                  YouTube URL
                </label>

                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(event) =>
                    setYoutubeUrl(event.target.value)
                  }
                  placeholder="https://www.youtube.com/watch?v=..."
                  disabled={youtubeLoading}
                  className="w-full px-4 py-3 rounded-xl bg-brand-900/60 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-primary-500 transition-colors disabled:opacity-60"
                />

              </div>


              <button
                type="submit"
                disabled={
                  youtubeLoading ||
                  !youtubeUrl.trim() || !selectedSubject || !selectedCategory
                }
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-sm font-semibold transition-all"
              >

                {youtubeLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importing Lecture...
                  </>
                ) : (
                  <>
                    <Link className="h-4 w-4" />
                    Import YouTube Lecture
                  </>
                )}

              </button>

            </form>


            {/* YouTube Error */}

            {youtubeError && (
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3">

                <AlertCircle className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />

                <p className="text-xs text-rose-300">
                  {youtubeError}
                </p>

              </div>
            )}


            {/* YouTube Success */}

            {youtubeSuccess && (
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">

                <CheckCircle className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />

                <p className="text-xs text-emerald-300">
                  {youtubeSuccess}
                </p>

              </div>
            )}

          </section>


          {/* ====================================================
              LOCAL VIDEO UPLOAD
          ==================================================== */}

          <section className="glass-panel rounded-2xl border border-slate-800 p-6">

            <div className="flex items-start gap-4 mb-6">

              <div className="h-11 w-11 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center shrink-0">
                <UploadCloud className="h-5 w-5 text-primary-400" />
              </div>

              <div>
                <h2 className="text-lg font-outfit font-bold text-white">
                  Upload Video File
                </h2>

                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Upload a local lecture video. CogniTrace
                  will store the video and generate its
                  transcript using Whisper.
                </p>
              </div>

            </div>


            <form
              onSubmit={handleLocalUpload}
              className="space-y-4"
            >

              {/* File */}

              <div>

                
              {/* Classification */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">Subject</label>
                  <div className="flex gap-2">
                    <select
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      className="flex-1 px-4 py-3 rounded-xl bg-brand-900/60 border border-slate-800 text-sm text-white focus:border-primary-500"
                    >
                      <option value="">Select a subject...</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <button type="button" onClick={() => setAddingSubject(!addingSubject)} className="px-3 py-2 bg-slate-800 text-white rounded-xl text-xs">+ Add</button>
                  </div>
                  {addingSubject && (
                    <div className="flex gap-2 mt-2">
                      <input type="text" value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="New Subject" className="flex-1 px-3 py-2 rounded-lg bg-brand-800 text-xs text-white" />
                      <button type="button" onClick={handleAddSubject} className="px-3 py-2 bg-primary-600 text-white rounded-lg text-xs">Save</button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">Category</label>
                  <div className="flex gap-2">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      disabled={!selectedSubject}
                      className="flex-1 px-4 py-3 rounded-xl bg-brand-900/60 border border-slate-800 text-sm text-white focus:border-primary-500 disabled:opacity-50"
                    >
                      <option value="">Select a category...</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button type="button" disabled={!selectedSubject} onClick={() => setAddingCategory(!addingCategory)} className="px-3 py-2 bg-slate-800 text-white rounded-xl text-xs disabled:opacity-50">+ Add</button>
                  </div>
                  {addingCategory && (
                    <div className="flex gap-2 mt-2">
                      <input type="text" value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="New Category" className="flex-1 px-3 py-2 rounded-lg bg-brand-800 text-xs text-white" />
                      <button type="button" onClick={handleAddCategory} className="px-3 py-2 bg-primary-600 text-white rounded-lg text-xs">Save</button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">Subcategory (optional)</label>
                  <div className="flex gap-2">
                    <select
                      value={selectedSubcategory}
                      onChange={(e) => setSelectedSubcategory(e.target.value)}
                      disabled={!selectedCategory}
                      className="flex-1 px-4 py-3 rounded-xl bg-brand-900/60 border border-slate-800 text-sm text-white focus:border-primary-500 disabled:opacity-50"
                    >
                      <option value="">Select a subcategory...</option>
                      {subcategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <button type="button" disabled={!selectedCategory} onClick={() => setAddingSubcategory(!addingSubcategory)} className="px-3 py-2 bg-slate-800 text-white rounded-xl text-xs disabled:opacity-50">+ Add</button>
                  </div>
                  {addingSubcategory && (
                    <div className="flex gap-2 mt-2">
                      <input type="text" value={newSubcategory} onChange={e => setNewSubcategory(e.target.value)} placeholder="New Subcategory" className="flex-1 px-3 py-2 rounded-lg bg-brand-800 text-xs text-white" />
                      <button type="button" onClick={handleAddSubcategory} className="px-3 py-2 bg-primary-600 text-white rounded-lg text-xs">Save</button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">Prerequisite Video (optional)</label>
                  <select
                    value={selectedPrerequisiteLectureId}
                    onChange={(e) => setSelectedPrerequisiteLectureId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-brand-900/60 border border-slate-800 text-sm text-white focus:border-primary-500"
                  >
                    <option value="">None (No prerequisite video)</option>
                    {lectures.map((lec) => (
                      <option key={lec.id} value={lec.id}>
                        {lec.title || 'Untitled Lecture'} {lec.duration ? `(${lec.duration})` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Select an existing lecture video that students should watch before this one.
                  </p>
                </div>
              </div>

<label className="block text-xs font-semibold text-slate-300 mb-2">
                  Video File
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".mp4,.mov,.mkv,.avi,.webm,.m4v,video/*"
                  onChange={handleFileChange}
                  disabled={uploadLoading}
                  className="block w-full text-xs text-slate-400 file:mr-3 file:px-4 file:py-2.5 file:rounded-lg file:border-0 file:bg-primary-600 file:text-white file:font-semibold file:cursor-pointer hover:file:bg-primary-500"
                />

                {selectedFile && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">

                    <FileVideo className="h-4 w-4 text-primary-400" />

                    <span className="truncate">
                      {selectedFile.name}
                    </span>

                    <span className="text-slate-600">
                      (
                      {(
                        selectedFile.size /
                        (1024 * 1024)
                      ).toFixed(1)}
                      MB)
                    </span>

                  </div>
                )}

              </div>


              {/* Title */}

              <div>

                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Lecture Title
                </label>

                <input
                  type="text"
                  value={localTitle}
                  onChange={(event) =>
                    setLocalTitle(event.target.value)
                  }
                  placeholder="Enter lecture title"
                  disabled={uploadLoading}
                  className="w-full px-4 py-3 rounded-xl bg-brand-900/60 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-primary-500 transition-colors disabled:opacity-60"
                />

              </div>


              {/* Description */}

              <div>

                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Description
                  <span className="text-slate-600 ml-1">
                    (optional)
                  </span>
                </label>

                <textarea
                  value={localDescription}
                  onChange={(event) =>
                    setLocalDescription(
                      event.target.value
                    )
                  }
                  placeholder="Brief description of the lecture"
                  rows={2}
                  disabled={uploadLoading}
                  className="w-full px-4 py-3 rounded-xl bg-brand-900/60 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-primary-500 transition-colors resize-none disabled:opacity-60"
                />

              </div>


              <button
                type="submit"
                disabled={
                  uploadLoading ||
                  !selectedFile ||
                  !localTitle.trim() || !selectedSubject || !selectedCategory
                }
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-sm font-semibold transition-all"
              >

                {uploadLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing Video...
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-4 w-4" />
                    Upload & Process Lecture
                  </>
                )}

              </button>

            </form>


            {/* Upload Error */}

            {uploadError && (
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3">

                <AlertCircle className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />

                <p className="text-xs text-rose-300">
                  {uploadError}
                </p>

              </div>
            )}


            {/* Upload Success */}

            {uploadSuccess && (
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">

                <CheckCircle className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />

                <p className="text-xs text-emerald-300">
                  {uploadSuccess}
                </p>

              </div>
            )}

          </section>

        </div>


        {/* ======================================================
            PROCESSING RESULT
        ====================================================== */}

        {(youtubeResult || uploadResult) && (
          <section className="glass-panel rounded-2xl border border-slate-800 p-6">

            <div className="flex items-center gap-2 mb-5">

              <CheckCircle className="h-5 w-5 text-emerald-400" />

              <h2 className="text-lg font-outfit font-bold text-white">
                Lecture Processing Complete
              </h2>

            </div>


            {(() => {

              const result =
                youtubeResult ||
                uploadResult;

              const lecture =
                result?.lecture || {};

              const transcript =
                result?.transcript || {};

              const rag =
                result?.rag || {};

              return (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

                  {/* Lecture */}

                  <div className="rounded-xl border border-slate-800 bg-brand-900/40 p-4">

                    <div className="flex items-center gap-2 mb-2">

                      <BookOpen className="h-4 w-4 text-primary-400" />

                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                        Lecture
                      </span>

                    </div>

                    <p className="text-sm text-white font-semibold line-clamp-2">
                      {lecture.title || 'Lecture'}
                    </p>

                  </div>


                  {/* Transcript */}

                  <div className="rounded-xl border border-slate-800 bg-brand-900/40 p-4">

                    <div className="flex items-center gap-2 mb-2">

                      <FileText className="h-4 w-4 text-primary-400" />

                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                        Transcript
                      </span>

                    </div>

                    <p className="text-sm text-white font-semibold">
                      {transcript.available
                        ? `${transcript.entries || 0} entries`
                        : 'Available'}
                    </p>

                  </div>


                  {/* Duration */}

                  <div className="rounded-xl border border-slate-800 bg-brand-900/40 p-4">

                    <div className="flex items-center gap-2 mb-2">

                      <Clock className="h-4 w-4 text-primary-400" />

                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                        Duration
                      </span>

                    </div>

                    <p className="text-sm text-white font-semibold">
                      {lecture.duration ||
                        transcript.duration ||
                        'N/A'}
                    </p>

                  </div>


                  {/* RAG */}

                  <div className="rounded-xl border border-slate-800 bg-brand-900/40 p-4">

                    <div className="flex items-center gap-2 mb-2">

                      <Database className="h-4 w-4 text-primary-400" />

                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                        AI Index
                      </span>

                    </div>

                    <p className="text-sm text-white font-semibold">
                      {rag.indexed
                        ? `${rag.chunks || 0} chunks`
                        : 'Processed'}
                    </p>

                  </div>

                </div>
              );

            })()}

          </section>
        )}


        {/* ======================================================
            FACULTY LECTURE LIBRARY
        ====================================================== */}

        <section className="space-y-4">

          <div className="flex items-center justify-between">

            <div>

              <h2 className="text-lg font-outfit font-bold text-white">
                Faculty Lecture Library
              </h2>

              <p className="text-xs text-slate-500 mt-1">
                Lectures currently available in CogniTrace.
              </p>

            </div>


            <button
              onClick={loadLectures}
              disabled={loadingLectures}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-800 bg-brand-900/40 text-xs text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
            >

              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  loadingLectures
                    ? 'animate-spin'
                    : ''
                }`}
              />

              Refresh

            </button>

          </div>


          {/* Loading */}

          {loadingLectures && (
            <div className="glass-panel rounded-2xl border border-slate-800 p-10 flex items-center justify-center">

              <div className="flex items-center gap-3 text-sm text-slate-400">

                <Loader2 className="h-5 w-5 animate-spin text-primary-400" />

                Loading lectures...

              </div>

            </div>
          )}


          {/* Empty */}

          {!loadingLectures &&
            lectures.length === 0 && (

              <div className="glass-panel rounded-2xl border border-slate-800 p-10 text-center">

                <FileVideo className="h-10 w-10 text-slate-700 mx-auto mb-3" />

                <h3 className="text-sm font-semibold text-slate-300">
                  No lectures imported yet
                </h3>

                <p className="text-xs text-slate-500 mt-1">
                  Upload a video or import a YouTube lecture
                  above to create your first lecture.
                </p>

              </div>
            )}


          {/* Lecture Grid */}

          {!loadingLectures &&
            lectures.length > 0 && (

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

                {lectures.map((lecture) => {

                  const isYoutube =
                    lecture.source_type === 'youtube' ||
                    !!lecture.youtube_id;

                  return (
                    <div
                      key={lecture.id}
                      className="glass-panel rounded-2xl border border-slate-800 overflow-hidden hover:border-primary-500/30 transition-colors"
                    >

                      {/* Thumbnail */}

                      <div className="relative aspect-video bg-brand-900">

                        {isYoutube &&
                        lecture.thumbnail ? (
                          <img
                            src={lecture.thumbnail}
                            alt={lecture.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">

                            <FileVideo className="h-10 w-10 text-slate-700" />

                          </div>
                        )}


                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />


                        <div className="absolute top-3 left-3">

                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-black/60 border border-white/10 text-slate-200 backdrop-blur-sm">
                            {getSourceLabel(lecture)}
                          </span>

                        </div>


                        <div className="absolute bottom-3 right-3">

                          <span className="text-[10px] font-semibold px-2 py-1 rounded-md bg-black/70 text-white">
                            {lecture.duration || 'N/A'}
                          </span>

                        </div>

                      </div>


                      {/* Card Content */}

                      <div className="p-5 space-y-4">

                        <div>

                          <h3 className="text-sm font-outfit font-bold text-white line-clamp-2">
                            {lecture.title}
                          </h3>

                          {lecture.description && (
                            <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                              {lecture.description}
                            </p>
                          )}

                        </div>


                        {/* Status */}

                        <div className="flex items-center justify-between gap-2">

                          <span
                            className={`text-[9px] uppercase tracking-wider font-bold px-2 py-1 rounded-md border ${getStatusClass(
                              lecture.status
                            )}`}
                          >
                            {lecture.status || 'READY'}
                          </span>


                          {lecture.transcript_language && (
                            <span className="text-[10px] text-slate-500">
                              Transcript:{' '}
                              {String(
                                lecture.transcript_language
                              ).toUpperCase()}
                            </span>
                          )}

                        </div>


                        {/* Actions */}

                        <div className="flex gap-2">

                          <button
                            onClick={() =>
                              handleSelectLecture(
                                lecture
                              )
                            }
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold transition-colors"
                          >

                            <Play className="h-3.5 w-3.5" />

                            View

                          </button>


                          {isYoutube &&
                            lecture.video_url && (
                              <a
                                href={lecture.video_url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-center px-3 py-2.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
                                title="Open YouTube video"
                              >

                                <ExternalLink className="h-3.5 w-3.5" />

                              </a>
                            )}

                        </div>

                      </div>

                    </div>
                  );
                })}

              </div>
            )}

        </section>


        {/* ======================================================
            SELECTED LECTURE PREVIEW
        ====================================================== */}

        {selectedLecture && (

          <section className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-5">

            <div className="flex items-start justify-between gap-4">

              <div>

                <span className="text-[10px] text-primary-400 font-bold uppercase tracking-widest">
                  Lecture Preview
                </span>

                <h2 className="text-xl font-outfit font-bold text-white mt-1">
                  {selectedLecture.title}
                </h2>

                <p className="text-xs text-slate-500 mt-1">
                  {selectedLecture.course_name ||
                    'CS 101: Fundamentals of Database Systems'}
                </p>

              </div>


              <button
                onClick={() =>
                  setSelectedLecture(null)
                }
                className="text-xs text-slate-500 hover:text-white"
              >
                Close
              </button>

            </div>


            {/* YouTube preview */}

            {selectedLecture.youtube_id ? (

              <div className="relative aspect-video max-w-4xl mx-auto rounded-xl overflow-hidden bg-black border border-slate-800">

                <iframe
                  src={getYoutubeEmbedUrl(
                    selectedLecture
                  )}
                  title={selectedLecture.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />

              </div>

            ) : (

              <div className="rounded-xl border border-slate-800 bg-brand-900/40 p-10 text-center">

                <FileVideo className="h-10 w-10 text-slate-700 mx-auto mb-3" />

                <p className="text-sm text-slate-400">
                  This lecture is stored as a local
                  video file on the backend.
                </p>

                <p className="text-xs text-slate-600 mt-1">
                  Local video playback can be connected
                  to the Student lecture player later.
                </p>

              </div>

            )}


            {/* Metadata */}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

              <div className="rounded-xl bg-brand-900/40 border border-slate-800 p-3">

                <p className="text-[9px] uppercase tracking-wider text-slate-600 font-bold">
                  Source
                </p>

                <p className="text-xs text-slate-300 font-semibold mt-1">
                  {getSourceLabel(
                    selectedLecture
                  )}
                </p>

              </div>


              <div className="rounded-xl bg-brand-900/40 border border-slate-800 p-3">

                <p className="text-[9px] uppercase tracking-wider text-slate-600 font-bold">
                  Duration
                </p>

                <p className="text-xs text-slate-300 font-semibold mt-1">
                  {selectedLecture.duration ||
                    'N/A'}
                </p>

              </div>


              <div className="rounded-xl bg-brand-900/40 border border-slate-800 p-3">

                <p className="text-[9px] uppercase tracking-wider text-slate-600 font-bold">
                  Status
                </p>

                <p className="text-xs text-emerald-400 font-semibold mt-1">
                  {selectedLecture.status ||
                    'READY'}
                </p>

              </div>


              <div className="rounded-xl bg-brand-900/40 border border-slate-800 p-3">

                <p className="text-[9px] uppercase tracking-wider text-slate-600 font-bold">
                  Lecture ID
                </p>

                <p className="text-xs text-slate-300 font-semibold mt-1">
                  {selectedLecture.id}
                </p>

              </div>

            </div>

          </section>

        )}

      </div>

    </div>
  );
}