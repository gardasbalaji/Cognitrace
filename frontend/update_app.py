import re

with open(r'c:\Users\bakun\Downloads\COGNITRACE _auth_data\COGNITRACE _auth_data\COGNITRACE\COGNITRACE\frontend\src\App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Add import
code = code.replace("import FacultyLectures from './pages/faculty/FacultyLectures';", "import FacultyLectures from './pages/faculty/FacultyLectures';\nimport MyLectures from './pages/faculty/MyLectures';")

# Add getTitle route title
code = code.replace("if (path.includes('/faculty/lectures')) return 'Upload / Import Lecture';", "if (path.includes('/faculty/lectures')) return 'Upload / Import Lecture';\n    if (path.includes('/faculty/my-lectures')) return 'My Lectures';")

# Add route
code = code.replace('<Route path="lectures" element={<FacultyLectures />} />', '<Route path="lectures" element={<FacultyLectures />} />\n            <Route path="my-lectures" element={<MyLectures />} />')

with open(r'c:\Users\bakun\Downloads\COGNITRACE _auth_data\COGNITRACE _auth_data\COGNITRACE\COGNITRACE\frontend\src\App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)
