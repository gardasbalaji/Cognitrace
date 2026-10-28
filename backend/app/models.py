
import uuid

from sqlalchemy import (
    Column,
    String,
    Integer,
    Boolean,
    Text,
    BigInteger,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    CheckConstraint,
    UniqueConstraint,
    func,
    JSON,
)

from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


# ============================================================
# USER
# ============================================================

class User(Base):
    __tablename__ = "users"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    full_name = Column(String(150), nullable=False)
    email = Column(String(255), nullable=False, unique=True, index=True)
    phone = Column(String(20), nullable=True)

    role = Column(String(20), nullable=False)

    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    __table_args__ = (
        CheckConstraint(
            "role IN ('student', 'faculty')",
            name="ck_users_role",
        ),
    )

    # One user can have one student profile.
    student_profile = relationship(
        "StudentProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )

    # One user can have one faculty profile.
    faculty_profile = relationship(
        "FacultyProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )

    # Authentication accounts.
    auth_accounts = relationship(
        "AuthAccount",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    # Refresh tokens.
    refresh_tokens = relationship(
        "RefreshToken",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    lectures = relationship(
      "Lecture",
      back_populates="creator",
      foreign_keys="Lecture.created_by",
    )


# ============================================================
# STUDENT PROFILE
# ============================================================

class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )

    student_id = Column(
        String(100),
        nullable=False,
        unique=True,
    )

    age = Column(Integer, nullable=False)

    __table_args__ = (
        CheckConstraint(
            "age >= 1",
            name="ck_student_age_positive",
        ),
    )

    user = relationship(
        "User",
        back_populates="student_profile",
    )
    sessions = relationship(
    "StudentSession",
    back_populates="student",
    cascade="all, delete-orphan",
    )
    quiz_attempts = relationship(
    "QuizAttempt",
    back_populates="student",
    cascade="all, delete-orphan",
    )

# ============================================================
# FACULTY PROFILE
# ============================================================

class FacultyProfile(Base):
    __tablename__ = "faculty_profiles"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )

    employee_id = Column(
        String(100),
        nullable=False,
        unique=True,
    )

    designation = Column(String(150), nullable=True)
    department = Column(String(150), nullable=True)

    user = relationship(
        "User",
        back_populates="faculty_profile",
    )


# ============================================================
# AUTH ACCOUNT
# ============================================================

class AuthAccount(Base):
    __tablename__ = "auth_accounts"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    # local, google, or another authentication provider
    provider = Column(
        String(50),
        nullable=False,
        default="local",
    )

    # ID assigned by an external provider
    provider_user_id = Column(
        String(255),
        nullable=True,
    )

    # Store a password hash, NEVER a plain-text password.
    password_hash = Column(
        String(255),
        nullable=True,
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
    )

    last_login_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "provider",
            name="uq_auth_account_user_provider",
        ),
        UniqueConstraint(
            "provider",
            "provider_user_id",
            name="uq_auth_account_provider_user_id",
        ),
    )

    user = relationship(
        "User",
        back_populates="auth_accounts",
    )


# ============================================================
# REFRESH TOKEN
# ============================================================

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Store only a hash of the refresh token.
    token_hash = Column(
        String(255),
        nullable=False,
        unique=True,
    )

    expires_at = Column(
        DateTime(timezone=True),
        nullable=False,
    )

    revoked_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    last_used_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    user_agent = Column(
        String(500),
        nullable=True,
    )

    ip_address = Column(
        String(45),
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    user = relationship(
        "User",
        back_populates="refresh_tokens",
    )


# ============================================================
# GLOBAL COURSE CATALOGUE
# ============================================================

class Course(Base):
    __tablename__ = "courses"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # Optional course code, globally unique when provided.
    course_code = Column(
        String(50),
        nullable=True,
        unique=True,
    )

    # Shared course name across the entire CogniTrace platform.
    name = Column(
        String(255),
        nullable=False,
        unique=True,
    )

    description = Column(
        String(1000),
        nullable=True,
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    lecture_courses = relationship(
      "LectureCourse",
      back_populates="course",
    )   

    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

# ============================================================
# LECTURE / EDUCATIONAL VIDEO
# ============================================================

class Lecture(Base):
    __tablename__ = "lectures"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # Original faculty creator of this video.
    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    title = Column(
        String(255),
        nullable=False,
    )

    description = Column(
        String(2000),
        nullable=True,
    )
    student_sessions = relationship(
    "StudentSession",
    back_populates="lecture",
    )

    # Supported sources: youtube or upload.
    video_source = Column(
        String(20),
        nullable=False,
    )

    # YouTube video details.
    youtube_url = Column(
        String(1000),
        nullable=True,
    )

    youtube_video_id = Column(
        String(50),
        nullable=True,
        index=True,
    )
    transcript = relationship(
      "LectureTranscript",
      back_populates="lecture",
      uselist=False,
      cascade="all, delete-orphan",
    )
    study_material = relationship(
      "LectureStudyMaterial",
      back_populates="lecture",
      uselist=False,
      cascade="all, delete-orphan",
    )

    # Direct-upload file details.
    storage_key = Column(
        String(500),
        nullable=True,
    )

    original_filename = Column(
        String(255),
        nullable=True,
    )

    mime_type = Column(
        String(100),
        nullable=True,
    )
    quiz_attempts = relationship(
    "QuizAttempt",
    back_populates="lecture",
    )

    file_size_bytes = Column(
        BigInteger,
        nullable=True,
    )

    # Common video information.
    duration_seconds = Column(
        Integer,
        nullable=True,
    )

    thumbnail_url = Column(
        String(1000),
        nullable=True,
    )

    # draft, processing, published, failed, archived
    status = Column(
        String(20),
        nullable=False,
        default="draft",
    )

    published_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    __table_args__ = (
        CheckConstraint(
            "video_source IN ('youtube', 'upload')",
            name="ck_lecture_video_source",
        ),
        CheckConstraint(
            "status IN ('draft', 'processing', 'published', 'failed', 'archived')",
            name="ck_lecture_status",
        ),
        CheckConstraint(
            "duration_seconds IS NULL OR duration_seconds >= 0",
            name="ck_lecture_duration_positive",
        ),
        CheckConstraint(
            "file_size_bytes IS NULL OR file_size_bytes >= 0",
            name="ck_lecture_file_size_positive",
        ),
    )
    lecture_courses = relationship(
      "LectureCourse",
      back_populates="lecture",
      cascade="all, delete-orphan",
    ) 

    lecture_subjects = relationship(
      "LectureSubject",
      back_populates="lecture",
      cascade="all, delete-orphan",
    )

    lecture_topics = relationship(
      "LectureTopic",
      back_populates="lecture",
      cascade="all, delete-orphan",
    )

    # The faculty member who originally uploaded this video.
    creator = relationship(
        "User",
        back_populates="lectures",
        foreign_keys=[created_by],
    )
    

# ============================================================
# LECTURE - COURSE MAPPING
# ============================================================

class LectureCourse(Base):
    __tablename__ = "lecture_courses"

    lecture_id = Column(
        UUID(as_uuid=True),
        ForeignKey("lectures.id", ondelete="CASCADE"),
        primary_key=True,
    )

    course_id = Column(
        UUID(as_uuid=True),
        ForeignKey("courses.id", ondelete="RESTRICT"),
        primary_key=True,
    )

    lecture = relationship(
        "Lecture",
        back_populates="lecture_courses",
    )

    course = relationship(
        "Course",
        back_populates="lecture_courses",
    )
    


# ============================================================
# LECTURE - SUBJECT MAPPING
# ============================================================

class LectureSubject(Base):
    __tablename__ = "lecture_subjects"

    lecture_id = Column(
        UUID(as_uuid=True),
        ForeignKey("lectures.id", ondelete="CASCADE"),
        primary_key=True,
    )

    subject_id = Column(
        UUID(as_uuid=True),
        ForeignKey("subjects.id", ondelete="RESTRICT"),
        primary_key=True,
    )

    lecture = relationship(
        "Lecture",
        back_populates="lecture_subjects",
    )

    subject = relationship(
        "Subject",
        back_populates="lecture_subjects",
    )
    


# ============================================================
# LECTURE - TOPIC MAPPING
# ============================================================

class LectureTopic(Base):
    __tablename__ = "lecture_topics"

    lecture_id = Column(
        UUID(as_uuid=True),
        ForeignKey("lectures.id", ondelete="CASCADE"),
        primary_key=True,
    )

    topic_id = Column(
        UUID(as_uuid=True),
        ForeignKey("topics.id", ondelete="RESTRICT"),
        primary_key=True,
    )

    lecture = relationship(
        "Lecture",
        back_populates="lecture_topics",
    )

    topic = relationship(
        "Topic",
        back_populates="lecture_topics",
    )
# ============================================================
# GLOBAL SUBJECT CATALOGUE
# ============================================================

class Subject(Base):
    __tablename__ = "subjects"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    name = Column(
        String(255),
        nullable=False,
        unique=True,
    )

    description = Column(
        String(1000),
        nullable=True,
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    lecture_subjects = relationship(
        "LectureSubject",
        back_populates="subject",
    )
    
    categories = relationship(
        "Category",
        back_populates="subject",
        cascade="all, delete-orphan",
    )


class Category(Base):
    __tablename__ = "categories"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    subject_id = Column(
        UUID(as_uuid=True),
        ForeignKey("subjects.id", ondelete="CASCADE"),
        nullable=False,
    )

    name = Column(
        String(255),
        nullable=False,
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    subject = relationship(
        "Subject",
        back_populates="categories",
    )

    subcategories = relationship(
        "Subcategory",
        back_populates="category",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint("subject_id", "name", name="uq_category_subject_name"),
    )


class Subcategory(Base):
    __tablename__ = "subcategories"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    category_id = Column(
        UUID(as_uuid=True),
        ForeignKey("categories.id", ondelete="CASCADE"),
        nullable=False,
    )

    name = Column(
        String(255),
        nullable=False,
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    category = relationship(
        "Category",
        back_populates="subcategories",
    )

    __table_args__ = (
        UniqueConstraint("category_id", "name", name="uq_subcategory_category_name"),
    )


# ============================================================
# GLOBAL TOPIC CATALOGUE
# ============================================================

class Topic(Base):
    __tablename__ = "topics"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    name = Column(
        String(255),
        nullable=False,
        unique=True,
    )

    description = Column(
        String(1000),
        nullable=True,
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    lecture_topics = relationship(
        "LectureTopic",
        back_populates="topic",
    )
class LectureTranscript(Base):
    __tablename__ = "lecture_transcripts"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    lecture_id = Column(
        UUID(as_uuid=True),
        ForeignKey("lectures.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )

    transcript_text = Column(Text, nullable=False)

    language = Column(
        String(20),
        nullable=True,
    )

    source = Column(
        String(20),
        nullable=False,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint(
            "source IN ('youtube', 'whisper', 'manual')",
            name="check_transcript_source",
        ),
    )

    lecture = relationship(
        "Lecture",
        back_populates="transcript",
    )


class LectureStudyMaterial(Base):
    __tablename__ = "lecture_study_materials"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    lecture_id = Column(
        UUID(as_uuid=True),
        ForeignKey("lectures.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )

    summary = Column(Text, nullable=True)
    revision_notes = Column(Text, nullable=True)

    source_language = Column(
        String(20),
        nullable=False,
        default="en",
    )

    generation_status = Column(
        String(20),
        nullable=False,
        default="completed",
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    lecture = relationship(
        "Lecture",
        back_populates="study_material",
    )


class StudentSession(Base):
    __tablename__ = "student_sessions"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    student_id = Column(
        UUID(as_uuid=True),
        ForeignKey("student_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    lecture_id = Column(
        UUID(as_uuid=True),
        ForeignKey("lectures.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    started_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    ended_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    total_watch_time_seconds = Column(
        Integer,
        default=0,
        nullable=False,
    )

    status = Column(
        String(20),
        default="active",
        nullable=False,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint(
            "total_watch_time_seconds >= 0",
            name="check_session_watch_time",
        ),
        CheckConstraint(
            "status IN ('active', 'completed', 'abandoned')",
            name="check_session_status",
        ),
    )

    student = relationship(
        "StudentProfile",
        back_populates="sessions",
    )
    learning_events = relationship(
      "LearningEvent",
       back_populates="session",
       cascade="all, delete-orphan",
    )

    lecture = relationship(
        "Lecture",
        back_populates="student_sessions",
    )
class LearningEvent(Base):
    __tablename__ = "learning_events"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    session_id = Column(
        UUID(as_uuid=True),
        ForeignKey("student_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    event_type = Column(
        String(50),
        nullable=False,
    )

    video_timestamp_seconds = Column(
        Integer,
        nullable=False,
    )

    event_data = Column(
        JSON,
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint(
            "video_timestamp_seconds >= 0",
            name="check_event_video_timestamp",
        ),
    )

    session = relationship(
        "StudentSession",
        back_populates="learning_events",
    )
class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    student_id = Column(
        UUID(as_uuid=True),
        ForeignKey("student_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    lecture_id = Column(
        UUID(as_uuid=True),
        ForeignKey("lectures.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    difficulty = Column(
        String(20),
        nullable=False,
    )

    total_questions = Column(
        Integer,
        nullable=False,
    )

    correct_answers = Column(
        Integer,
        nullable=False,
    )

    score = Column(
        Integer,
        nullable=False,
    )

    passed = Column(
        Boolean,
        nullable=False,
    )

    answers = Column(
        JSON,
        nullable=True,
    )

    attempted_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint(
            "difficulty IN ('easy', 'medium', 'hard')",
            name="check_quiz_difficulty",
        ),
        CheckConstraint(
            "total_questions > 0",
            name="check_quiz_total_questions",
        ),
        CheckConstraint(
            "correct_answers >= 0 AND correct_answers <= total_questions",
            name="check_quiz_correct_answers",
        ),
        CheckConstraint(
            "score >= 0 AND score <= 100",
            name="check_quiz_score",
        ),
    )

    student = relationship(
        "StudentProfile",
        back_populates="quiz_attempts",
    )

    lecture = relationship(
        "Lecture",
        back_populates="quiz_attempts",
    )
class ConfusionReport(Base):
    __tablename__ = "confusion_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    student_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    lecture_id = Column(
        UUID(as_uuid=True),
        ForeignKey("lectures.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    video_timestamp_seconds = Column(Integer, nullable=True)

    difficulty_level = Column(
        String(20),
        nullable=False
    )

    description = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    student = relationship("User")
    lecture = relationship("Lecture")
class StudentQuestion(Base):
    __tablename__ = "student_questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    student_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    lecture_id = Column(
        UUID(as_uuid=True),
        ForeignKey("lectures.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    question_text = Column(Text, nullable=False)

    answer_text = Column(Text, nullable=True)

    timestamp_seconds = Column(Integer, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    student = relationship("User")
    lecture = relationship("Lecture")
class FacultySuggestion(Base):
    __tablename__ = "faculty_suggestions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    faculty_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    lecture_id = Column(
        UUID(as_uuid=True),
        ForeignKey("lectures.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )

    suggestion_text = Column(Text, nullable=False)

    suggestion_type = Column(
        String(50),
        nullable=True
    )

    status = Column(
        String(20),
        nullable=False,
        default="pending",
        server_default="pending"
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    faculty = relationship("User")
    lecture = relationship("Lecture")

class LectureFeedback(Base):
    __tablename__ = "lecture_feedback"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lecture_id = Column(UUID(as_uuid=True), ForeignKey("lectures.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    understanding = Column(Integer, nullable=False)
    difficulty = Column(Integer, nullable=False)
    clarity = Column(Integer, nullable=False)
    pace = Column(Integer, nullable=False)
    difficult_part = Column(String(100), nullable=False)
    additional_support = Column(String(100), nullable=False)
    suggestion = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint('lecture_id', 'student_id', name='uq_lecture_student_feedback'),
    )

    lecture = relationship("Lecture")
    student = relationship("User")
