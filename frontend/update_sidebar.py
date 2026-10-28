import re

with open(r'c:\Users\bakun\Downloads\COGNITRACE _auth_data\COGNITRACE _auth_data\COGNITRACE\COGNITRACE\frontend\src\components\Sidebar.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Add Video to imports if needed, but we can just use BookOpen or something existing, or import Video.
# Let's import Video from lucide-react if not there.
if "Video" not in code:
    code = code.replace("Upload", "Upload, Video")

my_lectures_link = """    {
      name: "My Lectures",
      path: "/faculty/my-lectures",
      icon: Video
    },
    {
      name: "Upload / Import Lecture","""

code = code.replace('    {\n      name: "Upload / Import Lecture",', my_lectures_link)

with open(r'c:\Users\bakun\Downloads\COGNITRACE _auth_data\COGNITRACE _auth_data\COGNITRACE\COGNITRACE\frontend\src\components\Sidebar.jsx', 'w', encoding='utf-8') as f:
    f.write(code)
