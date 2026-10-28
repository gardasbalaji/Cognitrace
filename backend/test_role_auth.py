from fastapi import HTTPException
from unittest.mock import Mock

from app.dependencies import get_current_student, get_current_faculty

student = Mock()
student.role = "student"

faculty = Mock()
faculty.role = "faculty"

# Student accessing student dependency
assert get_current_student(student) == student
print("PASS: Student can access student resources")

# Faculty accessing faculty dependency
assert get_current_faculty(faculty) == faculty
print("PASS: Faculty can access faculty resources")

# Faculty attempting student access
try:
    get_current_student(faculty)
    raise AssertionError("Faculty was incorrectly allowed student access")
except HTTPException as e:
    assert e.status_code == 403
    print("PASS: Faculty blocked from student resources (403)")

# Student attempting faculty access
try:
    get_current_faculty(student)
    raise AssertionError("Student was incorrectly allowed faculty access")
except HTTPException as e:
    assert e.status_code == 403
    print("PASS: Student blocked from faculty resources (403)")

print("\nK.2 ROLE AUTHORIZATION TESTS PASSED")
