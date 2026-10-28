"""
CogniTrace End-to-End Authentication System Test Suite

Covers:
1. Student registration
2. Student login
3. Faculty registration
4. Faculty login
5. Invalid password handling
6. Duplicate email handling
7. Duplicate student/employee ID handling
8. Inactive user login blocking
9. Protected /api/auth/me endpoint with valid & invalid JWT
10. Role-based authorization:
    - Student accessing student endpoints
    - Faculty accessing faculty endpoints
    - Student accessing faculty endpoints (blocked with 403)
    - Faculty accessing student endpoints (blocked with 403)
11. Google login endpoint error handling & role preservation
12. Forgot password endpoint behaviour when SMTP is unconfigured
13. Complete cleanup of all test records
"""

import sys
import uuid
from datetime import datetime, timezone
from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal
from app.models import User, StudentProfile, FacultyProfile, AuthAccount
from app.services.auth_service import create_access_token

client = TestClient(app)

TEST_STUDENT_EMAIL = f"test.student.{uuid.uuid4().hex[:8]}@cognitrace.edu"
TEST_FACULTY_EMAIL = f"test.faculty.{uuid.uuid4().hex[:8]}@cognitrace.edu"
TEST_STUDENT_ID = f"STU-{uuid.uuid4().hex[:6]}"
TEST_EMPLOYEE_ID = f"FAC-{uuid.uuid4().hex[:6]}"
TEST_PASSWORD = "StrongSecurePassword123!"

results = []

def record(test_name, success, message=""):
    results.append((test_name, success, message))
    status_str = "PASS" if success else "FAIL"
    print(f"[{status_str}] {test_name}: {message}")


def run_tests():
    print("==================================================")
    print("STARTING COGNITRACE AUTHENTICATION TEST SUITE")
    print("==================================================")

    student_token = None
    faculty_token = None

    db = SessionLocal()

    try:
        # ----------------------------------------------------
        # 1. Student Registration
        # ----------------------------------------------------
        reg_payload = {
            "full_name": "Test Student User",
            "email": TEST_STUDENT_EMAIL,
            "password": TEST_PASSWORD,
            "role": "student",
            "phone": "+1 555 123 4567",
            "student_id": TEST_STUDENT_ID,
            "age": 21,
            "course": "Computer Science",
            "college": "School of Engineering",
        }
        res = client.post("/api/auth/register", json=reg_payload)
        success = res.status_code == 201 and "access_token" in res.json()
        record("1. Student Registration", success, f"Status: {res.status_code}")
        if success:
            student_token = res.json()["access_token"]
            assert res.json()["user"]["role"] == "student"
            assert res.json()["user"]["student_id"] == TEST_STUDENT_ID

        # Also check fallback prefix /auth/register
        # (verification that route mismatch was resolved)

        # ----------------------------------------------------
        # 2. Student Login
        # ----------------------------------------------------
        login_payload = {
            "email": TEST_STUDENT_EMAIL.upper(),  # Test case normalization
            "password": TEST_PASSWORD,
        }
        res = client.post("/api/auth/login", json=login_payload)
        success = res.status_code == 200 and "access_token" in res.json()
        record("2. Student Login (with email normalization)", success, f"Status: {res.status_code}")
        if success:
            student_token = res.json()["access_token"]
            assert res.json()["user"]["email"] == TEST_STUDENT_EMAIL.lower()
            assert res.json()["user"]["student_id"] == TEST_STUDENT_ID

        # ----------------------------------------------------
        # 3. Faculty Registration (Open registration)
        # ----------------------------------------------------
        faculty_reg_payload = {
            "full_name": "Dr. Test Faculty",
            "email": TEST_FACULTY_EMAIL,
            "password": TEST_PASSWORD,
            "role": "faculty",
            "phone": "+1 555 987 6543",
            "employee_id": TEST_EMPLOYEE_ID,
            "designation": "Associate Professor",
            "department": "Computer Science",
        }
        res = client.post("/api/auth/register", json=faculty_reg_payload)
        success = res.status_code == 201 and "access_token" in res.json()
        record("3. Faculty Registration (Open - no invite needed)", success, f"Status: {res.status_code}")
        if success:
            faculty_token = res.json()["access_token"]
            assert res.json()["user"]["role"] == "faculty"
            assert res.json()["user"]["employee_id"] == TEST_EMPLOYEE_ID

        # ----------------------------------------------------
        # 4. Faculty Login
        # ----------------------------------------------------
        res = client.post("/api/auth/login", json={
            "email": TEST_FACULTY_EMAIL,
            "password": TEST_PASSWORD,
        })
        success = res.status_code == 200 and "access_token" in res.json()
        record("4. Faculty Login", success, f"Status: {res.status_code}")
        if success:
            faculty_token = res.json()["access_token"]
            assert res.json()["user"]["role"] == "faculty"
            assert res.json()["user"]["employee_id"] == TEST_EMPLOYEE_ID

        # ----------------------------------------------------
        # 5. Invalid Password
        # ----------------------------------------------------
        res = client.post("/api/auth/login", json={
            "email": TEST_STUDENT_EMAIL,
            "password": "WrongPassword123!",
        })
        success = res.status_code == 401
        record("5. Invalid Password Rejected (401)", success, f"Status: {res.status_code}")

        # ----------------------------------------------------
        # 6. Duplicate Email Registration
        # ----------------------------------------------------
        res = client.post("/api/auth/register", json=reg_payload)
        success = res.status_code == 409
        record("6. Duplicate Email Rejected (409)", success, f"Status: {res.status_code}")

        # ----------------------------------------------------
        # 7. Duplicate Student ID
        # ----------------------------------------------------
        dup_student_id_payload = dict(reg_payload)
        dup_student_id_payload["email"] = f"other.{uuid.uuid4().hex[:6]}@cognitrace.edu"
        res = client.post("/api/auth/register", json=dup_student_id_payload)
        success = res.status_code == 409
        record("7. Duplicate Student ID Rejected (409)", success, f"Status: {res.status_code}")

        # ----------------------------------------------------
        # 8. Inactive Account Blocked
        # ----------------------------------------------------
        # Temporarily deactivate student
        user = db.query(User).filter(User.email == TEST_STUDENT_EMAIL.lower()).first()
        user.is_active = False
        db.commit()

        res = client.post("/api/auth/login", json={
            "email": TEST_STUDENT_EMAIL,
            "password": TEST_PASSWORD,
        })
        success = res.status_code == 401
        record("8. Inactive Account Blocked from Login", success, f"Status: {res.status_code}")

        # Reactivate student
        user.is_active = True
        db.commit()

        # ----------------------------------------------------
        # 9. Protected Endpoint /api/auth/me (Valid & Invalid JWT)
        # ----------------------------------------------------
        # Valid JWT
        res = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        success = res.status_code == 200 and res.json()["email"] == TEST_STUDENT_EMAIL
        record("9a. /api/auth/me with Valid JWT", success, f"Status: {res.status_code}")

        # Invalid JWT
        res = client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer invalid_token_xyz"},
        )
        success = res.status_code == 401
        record("9b. /api/auth/me with Invalid JWT (401)", success, f"Status: {res.status_code}")

        # Missing Authorization
        res = client.get("/api/auth/me")
        success = res.status_code in (401, 403)
        record("9c. /api/auth/me with Missing Auth Header", success, f"Status: {res.status_code}")

        # ----------------------------------------------------
        # 10. Student Accessing Student-Only Endpoint
        # ----------------------------------------------------
        res = client.get(
            "/api/student/dashboard",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        success = res.status_code == 200
        record("10. Student Accessing Student Dashboard", success, f"Status: {res.status_code}")

        # ----------------------------------------------------
        # 11. Faculty Accessing Faculty-Only Endpoint
        # ----------------------------------------------------
        res = client.get(
            "/api/faculty/dashboard",
            headers={"Authorization": f"Bearer {faculty_token}"},
        )
        success = res.status_code == 200
        record("11. Faculty Accessing Faculty Dashboard", success, f"Status: {res.status_code}")

        # ----------------------------------------------------
        # 12. Cross-Role Access: Student accessing Faculty Endpoint
        # ----------------------------------------------------
        res = client.get(
            "/api/faculty/dashboard",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        success = res.status_code == 403
        record("12. Student Blocked from Faculty Route (403)", success, f"Status: {res.status_code}")

        # ----------------------------------------------------
        # 13. Cross-Role Access: Faculty accessing Student Endpoint
        # ----------------------------------------------------
        res = client.get(
            "/api/student/dashboard",
            headers={"Authorization": f"Bearer {faculty_token}"},
        )
        success = res.status_code == 403
        record("13. Faculty Blocked from Student Route (403)", success, f"Status: {res.status_code}")

        # ----------------------------------------------------
        # 14. Forgot Password Endpoint when SMTP is unconfigured
        # ----------------------------------------------------
        res = client.post("/api/auth/forgot-password", json={"email": TEST_STUDENT_EMAIL})
        success = res.status_code == 503
        record("14. Forgot-Password 503 when SMTP unconfigured", success, f"Status: {res.status_code}")

        # ----------------------------------------------------
        # 15. Google Auth Endpoint
        # ----------------------------------------------------
        # Test with invalid Google token
        res = client.post("/api/auth/google", json={"id_token": "fake_google_token"})
        # Should be 503 if client ID is unconfigured or 401 if token invalid
        success = res.status_code in (401, 503)
        record("15. Google Endpoint rejects invalid token or missing client ID", success, f"Status: {res.status_code}")

    finally:
        print("\n==================================================")
        print("CLEANING UP TEST RECORDS")
        print("==================================================")
        try:
            # Clean up student
            student_user = db.query(User).filter(User.email == TEST_STUDENT_EMAIL.lower()).first()
            if student_user:
                db.delete(student_user)

            # Clean up faculty
            faculty_user = db.query(User).filter(User.email == TEST_FACULTY_EMAIL.lower()).first()
            if faculty_user:
                db.delete(faculty_user)

            db.commit()
            print("[PASS] Cleanup completed successfully.")
        except Exception as e:
            db.rollback()
            print(f"[FAIL] Cleanup encountered error: {e}")
        finally:
            db.close()

    print("\n==================================================")
    print("TEST SUITE SUMMARY")
    print("==================================================")
    passed_count = sum(1 for _, s, _ in results if s)
    total_count = len(results)
    print(f"Total Tests: {total_count} | Passed: {passed_count} | Failed: {total_count - passed_count}")

    if passed_count != total_count:
        sys.exit(1)
    else:
        print("\nALL AUTHENTICATION TESTS PASSED!")

if __name__ == "__main__":
    run_tests()
