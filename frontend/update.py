import re

with open(r'c:\Users\bakun\Downloads\COGNITRACE _auth_data\COGNITRACE _auth_data\COGNITRACE\COGNITRACE\frontend\src\pages\faculty\FacultyLectures.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Insert state
state_code = """
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
"""

code = code.replace("  const fileInputRef = useRef(null);", "  const fileInputRef = useRef(null);\n" + state_code)

classification_ui = """
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
              </div>
"""

yt_label = '<label className="block text-xs font-semibold text-slate-300 mb-2">\n                  YouTube URL\n                </label>'
code = code.replace(yt_label, classification_ui + "\n" + yt_label)

local_label = '<label className="block text-xs font-semibold text-slate-300 mb-2">\n                  Video File\n                </label>'
code = code.replace(local_label, classification_ui + "\n" + local_label)

# Update submit blocks
yt_submit = 'url: youtubeUrl.trim()'
code = code.replace(yt_submit, 'url: youtubeUrl.trim(), subject: subjects.find(s=>s.id===selectedSubject)?.name, category: categories.find(c=>c.id===selectedCategory)?.name, subcategory: subcategories.find(s=>s.id===selectedSubcategory)?.name')

yt_valid = '!youtubeUrl.trim()'
code = code.replace(yt_valid, '!youtubeUrl.trim() || !selectedSubject || !selectedCategory')

local_submit = "formData.append('title', localTitle.trim());"
local_payload = """formData.append('title', localTitle.trim());
    if (selectedSubject) formData.append('subject', subjects.find(s=>s.id===selectedSubject)?.name);
    if (selectedCategory) formData.append('category', categories.find(c=>c.id===selectedCategory)?.name);
    if (selectedSubcategory) formData.append('subcategory', subcategories.find(s=>s.id===selectedSubcategory)?.name);
"""
code = code.replace(local_submit, local_payload)

local_valid = '!localTitle.trim()'
code = code.replace(local_valid, '!localTitle.trim() || !selectedSubject || !selectedCategory')

# Update Lecture Display in Faculty Library
library_title = '<p className="text-sm text-white font-semibold line-clamp-2">\n                            {lecture.title || \'Lecture\'}\n                          </p>'
updated_library_title = """
                          {lecture.subject && lecture.category && (
                            <div className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">
                              {lecture.subject} &rsaquo; {lecture.category} {lecture.subcategory && `&rsaquo; ${lecture.subcategory}`}
                            </div>
                          )}
                          <p className="text-sm text-white font-semibold line-clamp-2">
                            {lecture.title || 'Lecture'}
                          </p>
"""
code = code.replace(library_title, updated_library_title)

with open(r'c:\Users\bakun\Downloads\COGNITRACE _auth_data\COGNITRACE _auth_data\COGNITRACE\COGNITRACE\frontend\src\pages\faculty\FacultyLectures.jsx', 'w', encoding='utf-8') as f:
    f.write(code)
