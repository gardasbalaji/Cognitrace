import uuid

from sqlalchemy import inspect
from app.database import SessionLocal, engine
from app.models import (
    User,
    FacultyProfile,
    StudentProfile,
    Course,
    Subject,
    Topic,
    Lecture,
    LectureCourse,
    LectureSubject,
    LectureTopic,
    LectureTranscript,
    StudentSession,
    LearningEvent,
    QuizAttempt,
)

# Temporary test identifiers
FACULTY_EMAIL = "cognitrace.test.faculty@example.com"
STUDENT_EMAIL = "cognitrace.test.student@example.com"

COURSE_CODE = "CT-REL-TEST-001"
LECTURE_TITLE = "CogniTrace Database Test Lecture"
SUBJECT_NAME = "CogniTrace Relationship Test Subject"
TOPIC_NAME = "CogniTrace Relationship Test Topic"

db = SessionLocal()


def check(condition, message):
    if not condition:
        raise AssertionError(message)
    print("[PASS]", message)


try:
    print("\n========== STEP I.5.5 ==========\n")

    # --------------------------------------------------
    # 1. FACULTY USER AND PROFILE
    # --------------------------------------------------

    faculty = db.query(User).filter_by(
        email=FACULTY_EMAIL
    ).one_or_none()

    if not faculty:
        faculty = User(
            id=uuid.uuid4(),
            full_name="CogniTrace Test Faculty",
            email=FACULTY_EMAIL,
            role="faculty",
            is_active=True,
        )
        db.add(faculty)
        db.flush()

    if not faculty.faculty_profile:
        faculty.faculty_profile = FacultyProfile(
            id=uuid.uuid4(),
            employee_id="CT-TEST-FAC-001",
            designation="Test Faculty",
            department="Computer Science",
        )

    db.flush()

    check(
        faculty.faculty_profile.user.email == FACULTY_EMAIL,
        "User <-> FacultyProfile"
    )

    # --------------------------------------------------
    # 2. COURSE AND LECTURE
    # --------------------------------------------------

    course = db.query(Course).filter_by(
        course_code=COURSE_CODE
    ).one_or_none()

    if not course:
        course = Course(
            id=uuid.uuid4(),
            course_code=COURSE_CODE,
            name="CogniTrace Relationship Test",
            description="Temporary test course",
            is_active=True,
        )
        db.add(course)
        db.flush()

    lecture = db.query(Lecture).filter_by(
        title=LECTURE_TITLE
    ).one_or_none()

    if not lecture:
        lecture = Lecture(
            id=uuid.uuid4(),
            created_by=faculty.id,
            title=LECTURE_TITLE,
            description="Temporary relationship test",
            video_source="youtube",
            youtube_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            youtube_video_id="dQw4w9WgXcQ",
            status="draft",
        )
        db.add(lecture)
        db.flush()

    check(
        lecture.creator.email == FACULTY_EMAIL,
        "Faculty User <-> Lecture ownership"
    )

    # Ensure Course mapping exists
    if not db.query(LectureCourse).filter_by(
        lecture_id=lecture.id,
        course_id=course.id,
    ).first():
        db.add(LectureCourse(
            lecture_id=lecture.id,
            course_id=course.id,
        ))

    # --------------------------------------------------
    # 3. SUBJECT RELATIONSHIP
    # --------------------------------------------------

    subject = db.query(Subject).filter_by(
        name=SUBJECT_NAME
    ).one_or_none()

    if not subject:
        subject = Subject(
            id=uuid.uuid4(),
            name=SUBJECT_NAME,
            description="Temporary subject",
            is_active=True,
        )
        db.add(subject)
        db.flush()

    if not db.query(LectureSubject).filter_by(
        lecture_id=lecture.id,
        subject_id=subject.id,
    ).first():
        db.add(LectureSubject(
            lecture_id=lecture.id,
            subject_id=subject.id,
        ))

    # --------------------------------------------------
    # 4. TOPIC RELATIONSHIP
    # --------------------------------------------------

    topic = db.query(Topic).filter_by(
        name=TOPIC_NAME
    ).one_or_none()

    if not topic:
        topic = Topic(
            id=uuid.uuid4(),
            name=TOPIC_NAME,
            description="Temporary topic",
            is_active=True,
        )
        db.add(topic)
        db.flush()

    if not db.query(LectureTopic).filter_by(
        lecture_id=lecture.id,
        topic_id=topic.id,
    ).first():
        db.add(LectureTopic(
            lecture_id=lecture.id,
            topic_id=topic.id,
        ))

    # --------------------------------------------------
    # 5. TRANSCRIPT RELATIONSHIP
    # --------------------------------------------------

    if not lecture.transcript:
        lecture.transcript = LectureTranscript(
            id=uuid.uuid4(),
            transcript_text="Temporary CogniTrace transcript test.",
            language="en",
            source="manual",
        )

    # --------------------------------------------------
    # 6. STUDENT USER AND PROFILE
    # --------------------------------------------------

    student_user = db.query(User).filter_by(
        email=STUDENT_EMAIL
    ).one_or_none()

    if not student_user:
        student_user = User(
            id=uuid.uuid4(),
            full_name="CogniTrace Test Student",
            email=STUDENT_EMAIL,
            role="student",
            is_active=True,
        )
        db.add(student_user)
        db.flush()

    if not student_user.student_profile:
        student_user.student_profile = StudentProfile(
            id=uuid.uuid4(),
            student_id="CT-TEST-STU-001",
            age=21,
        )

    db.flush()
    student = student_user.student_profile

    check(
        student.user.email == STUDENT_EMAIL,
        "User <-> StudentProfile"
    )

    # --------------------------------------------------
    # 7. STUDENT SESSION
    # --------------------------------------------------

    session = StudentSession(
        id=uuid.uuid4(),
        student_id=student.id,
        lecture_id=lecture.id,
        total_watch_time_seconds=125,
        status="active",
    )

    db.add(session)
    db.flush()

    # --------------------------------------------------
    # 8. LEARNING EVENT
    # --------------------------------------------------

    event = LearningEvent(
        id=uuid.uuid4(),
        session_id=session.id,
        event_type="pause",
        video_timestamp_seconds=42,
        event_data={"test": True},
    )

    db.add(event)

    # --------------------------------------------------
    # 9. QUIZ ATTEMPT
    # --------------------------------------------------

    quiz = QuizAttempt(
        id=uuid.uuid4(),
        student_id=student.id,
        lecture_id=lecture.id,
        difficulty="medium",
        total_questions=4,
        correct_answers=3,
        score=75,
        passed=True,
        answers={"test": "passed"},
    )

    db.add(quiz)

    # Save all test records
    db.commit()
    db.expire_all()

    print("\n--- Verifying relationships ---")

    # Reload records
    faculty = db.query(User).filter_by(
        email=FACULTY_EMAIL
    ).one()

    student_user = db.query(User).filter_by(
        email=STUDENT_EMAIL
    ).one()

    lecture = db.query(Lecture).filter_by(
        title=LECTURE_TITLE
    ).one()

    course = db.query(Course).filter_by(
        course_code=COURSE_CODE
    ).one()

    subject = db.query(Subject).filter_by(
        name=SUBJECT_NAME
    ).one()

    topic = db.query(Topic).filter_by(
        name=TOPIC_NAME
    ).one()

    session = db.query(StudentSession).filter_by(
        id=session.id
    ).one()

    # Course
    check(
        any(x.course.id == course.id for x in lecture.lecture_courses)
        and any(x.lecture.id == lecture.id for x in course.lecture_courses),
        "Lecture <-> Course"
    )

    # Subject
    check(
        any(x.subject.id == subject.id for x in lecture.lecture_subjects)
        and any(x.lecture.id == lecture.id for x in subject.lecture_subjects),
        "Lecture <-> Subject"
    )

    # Topic
    check(
        any(x.topic.id == topic.id for x in lecture.lecture_topics)
        and any(x.lecture.id == lecture.id for x in topic.lecture_topics),
        "Lecture <-> Topic"
    )

    # Transcript
    check(
        lecture.transcript.lecture_id == lecture.id,
        "Lecture <-> Transcript (one-to-one)"
    )

    # Student session
    check(
        session.student.id == student_user.student_profile.id
        and session.lecture.id == lecture.id,
        "StudentProfile <-> StudentSession <-> Lecture"
    )

    # Learning event
    check(
        any(x.event_type == "pause" for x in session.learning_events),
        "StudentSession <-> LearningEvent"
    )

    # Quiz
    saved_quiz = db.query(QuizAttempt).filter_by(
        student_id=student_user.student_profile.id,
        lecture_id=lecture.id,
    ).one()

    check(
        saved_quiz.student.id == student_user.student_profile.id
        and saved_quiz.lecture.id == lecture.id,
        "StudentProfile <-> QuizAttempt <-> Lecture"
    )

    print("\nSTEP I.5.5: ALL RELATIONSHIP TESTS PASSED")

    # --------------------------------------------------
    # STEP I.6: DATABASE INTEGRITY AUDIT
    # --------------------------------------------------

    print("\n========== STEP I.6 ==========\n")

    inspector = inspect(engine)

    tables = sorted(
        t for t in inspector.get_table_names()
        if t != "alembic_version"
    )

    check(len(tables) == 16, "Exactly 16 application tables")

    check(
        inspector.has_table("alembic_version"),
        "Alembic version table exists"
    )

    foreign_keys = sum(
        len(inspector.get_foreign_keys(table))
        for table in tables
    )

    unique_constraints = sum(
        len(inspector.get_unique_constraints(table))
        for table in tables
    )

    check(foreign_keys > 0, "Foreign-key constraints present")
    check(unique_constraints > 0, "Unique constraints present")

    check(
        len(inspector.get_check_constraints("users")) > 0,
        "Database CHECK constraints present"
    )

    print("APPLICATION TABLE COUNT:", len(tables))
    print("FOREIGN KEY COUNT:", foreign_keys)
    print("UNIQUE CONSTRAINT COUNT:", unique_constraints)

    print("\nSTEP I.6: INTEGRITY AUDIT PASSED")

except Exception:
    db.rollback()
    raise

finally:
    print("\n========== CLEANUP ==========")

    db.rollback()

    try:
        # Delete the lecture first. Its dependent records
        # are removed through the configured FK cascades.
        db.query(Lecture).filter_by(
            title=LECTURE_TITLE
        ).delete(synchronize_session=False)

        # Remove the temporary catalogue entries.
        db.query(Course).filter_by(
            course_code=COURSE_CODE
        ).delete(synchronize_session=False)

        db.query(Subject).filter_by(
            name=SUBJECT_NAME
        ).delete(synchronize_session=False)

        db.query(Topic).filter_by(
            name=TOPIC_NAME
        ).delete(synchronize_session=False)

        # Remove temporary student and faculty accounts.
        # Their profiles and dependent records cascade.
        db.query(User).filter_by(
            email=STUDENT_EMAIL
        ).delete(synchronize_session=False)

        db.query(User).filter_by(
            email=FACULTY_EMAIL
        ).delete(synchronize_session=False)

        db.commit()

        # Confirm cleanup
        remaining = (
            db.query(Lecture).filter_by(title=LECTURE_TITLE).count()
            + db.query(Course).filter_by(course_code=COURSE_CODE).count()
            + db.query(Subject).filter_by(name=SUBJECT_NAME).count()
            + db.query(Topic).filter_by(name=TOPIC_NAME).count()
            + db.query(User).filter_by(email=FACULTY_EMAIL).count()
            + db.query(User).filter_by(email=STUDENT_EMAIL).count()
        )

        check(remaining == 0, "All temporary test records removed")

    except Exception:
        db.rollback()
        print("CLEANUP FAILED — inspect the database before continuing.")
        raise

    finally:
        db.close()

print("\nDATABASE RELATIONSHIP TESTING FINISHED")
