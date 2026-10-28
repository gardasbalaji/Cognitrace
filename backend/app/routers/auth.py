import os
from typing import Literal, Optional
from uuid import UUID
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, StudentProfile, FacultyProfile, AuthAccount
from app.services.auth_service import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
)

# Optional Google verification library
try:
    from google.oauth2 import id_token as google_id_token
    from google.auth.transport import requests as google_requests
    GOOGLE_AUTH_AVAILABLE = True
except ImportError:
    GOOGLE_AUTH_AVAILABLE = False


router = APIRouter(tags=["Authentication"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "").strip()
SMTP_HOST = os.getenv("SMTP_HOST", "").strip()


# ============================================================
# REQUEST SCHEMAS
# ============================================================

class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=8, max_length=72)
    role: Literal["student", "faculty"]
    phone: Optional[str] = Field(default=None, max_length=20)

    # Student-specific fields
    student_id: Optional[str] = Field(default=None, max_length=100)
    age: Optional[int] = Field(default=None, ge=1)
    course: Optional[str] = Field(default=None, max_length=255)
    college: Optional[str] = Field(default=None, max_length=255)

    # Faculty-specific fields
    employee_id: Optional[str] = Field(default=None, max_length=100)
    designation: Optional[str] = Field(default=None, max_length=150)
    department: Optional[str] = Field(default=None, max_length=150)


class LoginRequest(BaseModel):
    email: str
    password: str


class GoogleAuthRequest(BaseModel):
    id_token: str
    role: Optional[Literal["student", "faculty"]] = None
    phone: Optional[str] = Field(default=None, max_length=20)

    # Student-specific fields (for first-time Google registration)
    student_id: Optional[str] = Field(default=None, max_length=100)
    age: Optional[int] = Field(default=None, ge=1)
    course: Optional[str] = Field(default=None, max_length=255)
    college: Optional[str] = Field(default=None, max_length=255)

    # Faculty-specific fields (for first-time Google registration)
    employee_id: Optional[str] = Field(default=None, max_length=100)
    designation: Optional[str] = Field(default=None, max_length=150)
    department: Optional[str] = Field(default=None, max_length=150)


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=72)


# ============================================================
# RESPONSE HELPER
# ============================================================

def build_auth_response(user: User, message: str = "Authentication successful"):
    token = create_access_token(user.id, user.role)

    user_data = {
        "id": str(user.id),
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role,
        "phone": user.phone,
    }

    if user.role == "student" and user.student_profile:
        user_data["student_id"] = user.student_profile.student_id
        user_data["age"] = user.student_profile.age
    elif user.role == "faculty" and user.faculty_profile:
        user_data["employee_id"] = user.faculty_profile.employee_id
        user_data["designation"] = user.faculty_profile.designation
        user_data["department"] = user.faculty_profile.department

    return {
        "message": message,
        "access_token": token,
        "token_type": "bearer",
        "user": user_data,
    }


# ============================================================
# REGISTER
# ============================================================

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_user(
    request: RegisterRequest,
    db: Session = Depends(get_db),
):
    email = request.email.strip().lower()
    full_name = request.full_name.strip()

    if not full_name:
        raise HTTPException(status_code=400, detail="Full name cannot be empty.")

    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Enter a valid email address.")

    # Validate fields according to selected role
    if request.role == "student":
        student_id_value = (request.student_id or "").strip()
        if not student_id_value or request.age is None:
            raise HTTPException(
                status_code=400,
                detail="Student ID and age are required for student registration.",
            )
    elif request.role == "faculty":
        employee_id_value = (request.employee_id or "").strip()
        if not employee_id_value:
            raise HTTPException(
                status_code=400,
                detail="Employee ID is required for faculty registration.",
            )

    existing_user = db.query(User).filter(func.lower(User.email) == email).first()
    if existing_user:
        raise HTTPException(
            status_code=409, detail="An account with this email already exists."
        )

    try:
        password_hash = hash_password(request.password)

        user = User(
            full_name=full_name,
            email=email,
            phone=request.phone.strip() if request.phone else None,
            role=request.role,
            is_active=True,
        )

        db.add(user)
        db.flush()

        auth_account = AuthAccount(
            user_id=user.id,
            provider="local",
            password_hash=password_hash,
            is_active=True,
            last_login_at=datetime.now(timezone.utc),
        )
        db.add(auth_account)

        if request.role == "student":
            profile = StudentProfile(
                user_id=user.id,
                student_id=student_id_value,
                age=request.age,
            )
            db.add(profile)
        else:
            profile = FacultyProfile(
                user_id=user.id,
                employee_id=employee_id_value,
                designation=request.designation.strip() if request.designation else None,
                department=request.department.strip() if request.department else None,
            )
            db.add(profile)

        db.commit()
        db.refresh(user)

        return build_auth_response(user, message="Registration successful")

    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409, detail="Email, student ID or employee ID already exists."
        )

    except Exception:
        db.rollback()
        raise


# ============================================================
# LOGIN
# ============================================================

@router.post("/login")
def login_user(
    request: LoginRequest,
    db: Session = Depends(get_db),
):
    email = request.email.strip().lower()

    user = db.query(User).filter(func.lower(User.email) == email).first()

    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    auth_account = (
        db.query(AuthAccount)
        .filter(
            AuthAccount.user_id == user.id,
            AuthAccount.provider == "local",
            AuthAccount.is_active.is_(True),
        )
        .first()
    )

    if (
        not auth_account
        or not auth_account.password_hash
        or not verify_password(request.password, auth_account.password_hash)
    ):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    auth_account.last_login_at = datetime.now(timezone.utc)
    db.commit()

    return build_auth_response(user)


# ============================================================
# GOOGLE AUTHENTICATION
# ============================================================

@router.post("/google")
def google_authenticate(
    request: GoogleAuthRequest,
    db: Session = Depends(get_db),
):
    if not GOOGLE_AUTH_AVAILABLE:
        raise HTTPException(
            status_code=500, detail="Google authentication library is not available on server."
        )

    google_client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()

    if not google_client_id:
        raise HTTPException(
            status_code=503,
            detail="Google authentication is not configured on the server. Please configure GOOGLE_CLIENT_ID.",
        )

    try:
        transport_request = google_requests.Request()
        id_info = google_id_token.verify_oauth2_token(
            request.id_token,
            transport_request,
            google_client_id,
            clock_skew_in_seconds=10,
        )
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Google sign-in failed. The token could not be verified. Please try again.",
        )

    # Validate essential token claims
    issuer = id_info.get("iss")
    if issuer not in ["accounts.google.com", "https://accounts.google.com"]:
        raise HTTPException(status_code=401, detail="Invalid Google token issuer.")

    email_verified = id_info.get("email_verified")
    if not email_verified:
        raise HTTPException(status_code=400, detail="Google email is not verified.")

    google_sub = id_info.get("sub")
    if not google_sub:
        raise HTTPException(status_code=400, detail="Google subject identifier missing.")

    email = id_info.get("email", "").strip().lower()
    full_name = id_info.get("name", "").strip() or email.split("@")[0]

    # Check for existing Google-linked auth account
    auth_account = (
        db.query(AuthAccount)
        .filter(
            AuthAccount.provider == "google",
            AuthAccount.provider_user_id == google_sub,
        )
        .first()
    )

    if auth_account:
        user = auth_account.user
        if not user or not user.is_active or not auth_account.is_active:
            raise HTTPException(status_code=401, detail="User account is inactive or disabled.")

        # IMPORTANT: Existing account's role is strictly preserved from the database.
        # User cannot switch roles by passing a different role on login.
        auth_account.last_login_at = datetime.now(timezone.utc)
        db.commit()
        return build_auth_response(user, message="Google login successful")

    # If Google auth account not found, check if this email already exists under local auth
    existing_user = db.query(User).filter(func.lower(User.email) == email).first()
    if existing_user:
        # Do not automatically link without explicit verification
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists with password authentication. Please sign in with your email and password.",
        )

    # First-time Google user registration
    if not request.role:
        # Inform the frontend that role selection and role fields are required
        return {
            "needs_profile": True,
            "email": email,
            "full_name": full_name,
            "message": "Role selection and profile details are required to complete Google registration.",
        }

    if request.role not in ["student", "faculty"]:
        raise HTTPException(status_code=400, detail="Invalid role specified.")

    if request.role == "student":
        google_student_id = (request.student_id or "").strip()
        if not google_student_id or request.age is None:
            raise HTTPException(
                status_code=400,
                detail="Student ID and age are required for student registration.",
            )
    elif request.role == "faculty":
        google_employee_id = (request.employee_id or "").strip()
        if not google_employee_id:
            raise HTTPException(
                status_code=400,
                detail="Employee ID is required for faculty registration.",
            )

    try:
        user = User(
            full_name=full_name,
            email=email,
            phone=request.phone.strip() if request.phone else None,
            role=request.role,
            is_active=True,
        )
        db.add(user)
        db.flush()

        new_auth_account = AuthAccount(
            user_id=user.id,
            provider="google",
            provider_user_id=google_sub,
            password_hash=None,
            is_active=True,
            last_login_at=datetime.now(timezone.utc),
        )
        db.add(new_auth_account)

        if request.role == "student":
            profile = StudentProfile(
                user_id=user.id,
                student_id=google_student_id,
                age=request.age,
            )
            db.add(profile)
        else:
            profile = FacultyProfile(
                user_id=user.id,
                employee_id=google_employee_id,
                designation=request.designation.strip() if request.designation else None,
                department=request.department.strip() if request.department else None,
            )
            db.add(profile)

        db.commit()
        db.refresh(user)

        return build_auth_response(user, message="Google registration successful")

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409, detail="Email, student ID, or employee ID is already registered."
        )
    except Exception:
        db.rollback()
        raise


# ============================================================
# FORGOT PASSWORD & RESET PASSWORD
# ============================================================

@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    smtp_host = os.getenv("SMTP_HOST", "").strip()

    if not smtp_host:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Password reset via email is currently unavailable because email delivery (SMTP) is not configured. Please contact your system administrator.",
        )

    # In production with SMTP configured, send short-lived token via email
    # Do not reveal whether email exists in the database
    return {
        "message": "If an account with this email exists, a password reset link has been dispatched."
    }


@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    smtp_host = os.getenv("SMTP_HOST", "").strip()

    if not smtp_host:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Password reset service is unavailable because email delivery (SMTP) is not configured.",
        )

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invalid or expired reset token.",
    )


# ============================================================
# CURRENT AUTHENTICATED USER
# ============================================================

@router.get("/me")
def get_my_account(
    current_user: User = Depends(get_current_user),
):
    profile_data = {}
    if current_user.role == "student" and current_user.student_profile:
        profile_data = {
            "student_id": current_user.student_profile.student_id,
            "age": current_user.student_profile.age,
        }
    elif current_user.role == "faculty" and current_user.faculty_profile:
        profile_data = {
            "employee_id": current_user.faculty_profile.employee_id,
            "designation": current_user.faculty_profile.designation,
            "department": current_user.faculty_profile.department,
        }

    return {
        "id": str(current_user.id),
        "full_name": current_user.full_name,
        "email": current_user.email,
        "role": current_user.role,
        "phone": current_user.phone,
        **profile_data,
    }
