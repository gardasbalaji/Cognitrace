# from fastapi import APIRouter, HTTPException, Depends
# from sqlalchemy.orm import Session
# from uuid import UUID
# from pydantic import BaseModel
# from typing import List, Optional, Dict, Any
# import re
# from app.dependencies import get_current_student
# from app.database import get_db
# from app.routers.faculty_store import LECTURES
# from app.models import (
#     User,
#     StudentProfile,
#     Lecture,
#     LectureTranscript,
#     StudentSession,
#     LearningEvent,
#     QuizAttempt,
#     LectureFeedback,
# )
# import urllib.request
# import json
# import os
# import uuid
# from datetime import datetime, timezone
# import joblib
# import numpy as np
# from youtube_transcript_api import YouTubeTranscriptApi

# from app.services.rag import vector_store, generator, quiz_generator

# from app.services.rag.chunker import chunk_transcript
# from app.services.rag.vector_store import index_lecture_chunks


# router = APIRouter()


# # ============================================================
# # PER-STUDENT SESSION STORES
# # ============================================================

# # Each authenticated user's data is kept in a separate namespace.
# # These stores are in-memory for Stage L. PostgreSQL persistence for
# # sessions/events/quiz attempts is implemented in Stage O, after Stage N
# # creates real faculty-owned Lecture UUIDs.
# STUDENT_DATA = {}


# def get_student_data(current_student: User) -> Dict[str, Any]:
#     student_key = str(current_student.id)
#     if student_key not in STUDENT_DATA:
#         STUDENT_DATA[student_key] = {
#             "sessions": {},
#             "watch_history": {},
#             "active_session": {},
#             "lectures": [],
#             "summaries": {},
#             "transcripts": {},
#             "final_video_quizzes": {},
#         }
#     return STUDENT_DATA[student_key]


# # ============================================================
# # POSTGRESQL PUBLISHED LECTURE ACCESS (STAGE N)
# # ============================================================


# def _duration_label(seconds):
#     total = int(seconds or 0)
#     return f"{total // 60:02d}:{total % 60:02d}"


# def _transcript_entries(transcript):
#     if transcript is None:
#         return []
#     try:
#         value = json.loads(transcript.transcript_text)
#         if isinstance(value, list):
#             return value
#     except (TypeError, json.JSONDecodeError):
#         pass
#     text_value = transcript.transcript_text or ""
#     if not text_value.strip():
#         return []
#     return [
#         {
#             "timestamp": "00:00",
#             "seconds": 0,
#             "end_time": "00:00",
#             "text": text_value,
#             "speaker": "Speaker",
#         }
#     ]


# def _student_lecture_payload(lecture):
#     transcript = lecture.transcript
#     topics = [mapping.topic.name for mapping in lecture.lecture_topics]
#     subjects = [mapping.subject.name for mapping in lecture.lecture_subjects]
#     courses = [mapping.course.name for mapping in lecture.lecture_courses]
#     return {
#         "id": str(lecture.id),
#         "title": lecture.title,
#         "description": lecture.description or "",
#         "duration": _duration_label(lecture.duration_seconds),
#         "duration_seconds": lecture.duration_seconds or 0,
#         "video_url": lecture.youtube_url,
#         "video_type": lecture.video_source,
#         "youtube_id": lecture.youtube_video_id,
#         "category": subjects[0] if subjects else (courses[0] if courses else "General"),
#         "courses": courses,
#         "subjects": subjects,
#         "topics": topics,
#         "prerequisites": [],
#         "concepts": topics,
#         "thumbnail": lecture.thumbnail_url,
#         "transcript_language": transcript.language if transcript else None,
#         "status": lecture.status,
#     }



# def refresh_student_lectures(student_data: Dict[str, Any], db: Session):
#     """Refresh the compatibility cache from published PostgreSQL lectures only."""
#     records = (
#         db.query(Lecture)
#         .filter(Lecture.status == "published")
#         .order_by(Lecture.published_at.desc(), Lecture.created_at.desc())
#         .all()
#     )
#     payloads = [_student_lecture_payload(item) for item in records]
    
#     existing_ids = {p["id"] for p in payloads}
#     from app.routers.faculty_store import LECTURES
#     for lec in LECTURES:
#         lec_id = str(lec.get("id"))
#         if lec_id not in existing_ids and lec.get("status") in ["READY", "published", None]:
#             existing_ids.add(lec_id)
#             payloads.append({
#                 "id": lec.get("id"),
#                 "title": lec.get("title") or "Untitled Lecture",
#                 "description": lec.get("description") or "",
#                 "faculty_id": lec.get("faculty_id"),
#                 "faculty_name": lec.get("faculty_name") or lec.get("instructor") or "Unknown Teacher",
#                 "subject": lec.get("subject"),
#                 "category": lec.get("category"),
#                 "subcategory": lec.get("subcategory"),
#                 "thumbnail_url": lec.get("thumbnail"),
#                 "duration": lec.get("duration") or "Unknown",
#                 "source": lec.get("source_type", "local"),
#                 "video_available": True,
#                 "transcript_available": True,
#                 "youtube_id": lec.get("youtube_id"),
#                 "video_url": f"/api/faculty/lectures/{lec.get('id')}/video" if lec.get("source_type") == "local" else lec.get("video_url"),
#                 "youtube_url": f"/api/faculty/lectures/{lec.get('id')}/video" if lec.get("source_type") == "local" else lec.get("video_url"),
#                 "duration_seconds": 60
#             })
            
#     student_data["lectures"] = payloads
#     student_data["transcripts"] = {
#         str(item.id): _transcript_entries(item.transcript)
#         for item in records
#         if item.transcript is not None
#     }
#     # Also inject json transcripts
#     from app.routers.faculty_store import TRANSCRIPTS
#     for lec_id, ts in TRANSCRIPTS.items():
#         if ts:
#             student_data["transcripts"][str(lec_id)] = [{"timestamp": t.get("timestamp", "00:00"), "text": t.get("text", "")} for t in ts]
            
#     return payloads



# def get_published_lecture(lecture_id: str, db: Session):
#     try:
#         parsed_id = UUID(str(lecture_id))
#     except (TypeError, ValueError, AttributeError):
#         return None
#     lecture = (
#         db.query(Lecture)
#         .filter(Lecture.id == parsed_id, Lecture.status == "published")
#         .first()
#     )
#     return lecture


# def get_student_profile(current_student: User, db: Session) -> StudentProfile:
#     profile = (
#         db.query(StudentProfile)
#         .filter(StudentProfile.user_id == current_student.id)
#         .first()
#     )
#     if profile is None:
#         raise HTTPException(status_code=409, detail="Student profile is not configured")
#     return profile


# def get_or_create_persistent_session(
#     current_student: User,
#     lecture: Lecture,
#     db: Session,
# ) -> StudentSession:
#     """Return this student's active DB session for the lecture, creating it if needed."""
#     profile = get_student_profile(current_student, db)
#     active_rows = (
#         db.query(StudentSession)
#         .filter(
#             StudentSession.student_id == profile.id,
#             StudentSession.status == "active",
#         )
#         .order_by(StudentSession.started_at.desc())
#         .all()
#     )
#     selected = None
#     for row in active_rows:
#         if row.lecture_id == lecture.id and selected is None:
#             selected = row
#         elif row.lecture_id != lecture.id:
#             row.status = "abandoned"
#             row.ended_at = datetime.now(timezone.utc)

#     if selected is None:
#         selected = StudentSession(
#             student_id=profile.id,
#             lecture_id=lecture.id,
#             status="active",
#             total_watch_time_seconds=0,
#         )
#         db.add(selected)
#     db.flush()
#     return selected


# def restore_session_state(
#     db: Session,
#     session_record: StudentSession,
#     lecture_payload: dict,
#     student_name: str,
# ) -> dict:
#     """Rebuild the existing UI session state from persisted learning events."""
#     state = create_empty_session(lecture_payload["id"], lecture_payload, student_name)
#     state["db_session_id"] = str(session_record.id)
#     state["total_watch_time_seconds"] = session_record.total_watch_time_seconds or 0
#     events = (
#         db.query(LearningEvent)
#         .filter(LearningEvent.session_id == session_record.id)
#         .order_by(LearningEvent.created_at.asc())
#         .all()
#     )
#     for event in events:
#         data = event.event_data or {}
#         event_type = event.event_type
#         if event_type == "play":
#             state["play_events"] += 1
#         elif event_type == "pause":
#             state["paused"] += 1
#         elif event_type == "rewind":
#             state["rewound"] += 1
#             start = data.get("current_timestamp", data.get("rewind_to"))
#             end = data.get("previous_timestamp", data.get("rewind_from"))
#             if start is not None and end is not None:
#                 state["repeated_timestamps"].append(
#                     f"{format_seconds_to_timestamp(float(start))}-"
#                     f"{format_seconds_to_timestamp(float(end))}"
#                 )
#         elif event_type in {"seek", "forward_seek"}:
#             state["seeked"] += 1
#             if event_type == "forward_seek":
#                 state["forward_seeks"] += 1
#         elif event_type == "speed_change":
#             state["speed_changes"] += 1
#             state.setdefault("speed_history", []).append(
#                 {
#                     "previous_speed": data.get("previous_speed"),
#                     "new_speed": data.get("new_speed"),
#                     "timestamp": data.get("timestamp", event.video_timestamp_seconds),
#                 }
#             )
#         elif event_type == "manual_confusion":
#             state["manual_confusion"] += 1
#             state["confusion_timestamps"].append(
#                 format_seconds_to_timestamp(event.video_timestamp_seconds)
#             )
#         state["watch_time"] = max(
#             state["watch_time"], float(event.video_timestamp_seconds)
#         )
#         state["completion_percentage"] = max(
#             state["completion_percentage"],
#             float(data.get("watch_duration") or 0),
#         )
#         if data.get("confusion_score") is not None:
#             state["confusion_score"] = int(data["confusion_score"])
#             state["confusion_status"] = data.get(
#                 "confusion_status", state["confusion_status"]
#             )

#     return state


# def hydrate_student_sessions(
#     current_student: User,
#     student_data: Dict[str, Any],
#     db: Session,
# ) -> None:
#     """Load this student's latest session per published lecture into the UI cache."""
#     profile = get_student_profile(current_student, db)
#     lectures = {item["id"]: item for item in student_data.get("lectures", [])}
#     rows = (
#         db.query(StudentSession)
#         .filter(StudentSession.student_id == profile.id)
#         .order_by(StudentSession.started_at.desc())
#         .all()
#     )
#     latest_by_lecture = {}
#     for row in rows:
#         key = str(row.lecture_id)
#         if key not in latest_by_lecture and key in lectures:
#             latest_by_lecture[key] = row

#     sessions = student_data["sessions"]
#     sessions.clear()
#     student_data["watch_history"].clear()
#     student_data["active_session"].clear()
#     for lecture_id, row in latest_by_lecture.items():
#         state = restore_session_state(
#             db, row, lectures[lecture_id], current_student.full_name
#         )
#         attempts = (
#             db.query(QuizAttempt)
#             .filter(
#                 QuizAttempt.student_id == profile.id,
#                 QuizAttempt.lecture_id == row.lecture_id,
#             )
#             .order_by(QuizAttempt.attempted_at.desc())
#             .all()
#         )
#         if attempts:
#             state["quiz_attempts"] = len(attempts)
#             state["quiz_score"] = attempts[0].score
#             state["quiz_passed"] = attempts[0].passed
#         sessions[lecture_id] = state
#         student_data["watch_history"][lecture_id] = {
#             "id": lecture_id,
#             "title": lectures[lecture_id]["title"],
#             "progress": int(state.get("completion_percentage", 0)),
#             "last_watched": (
#                 row.started_at.isoformat() if row.started_at else "Previously watched"
#             ),
#         }
#         if row.status == "active":
#             student_data["active_session"].clear()
#             student_data["active_session"].update(state)


# def mark_persistent_session_completed(
#     current_student: User,
#     lecture: Lecture,
#     db: Session,
# ) -> None:
#     profile = get_student_profile(current_student, db)
#     session_record = (
#         db.query(StudentSession)
#         .filter(
#             StudentSession.student_id == profile.id,
#             StudentSession.lecture_id == lecture.id,
#             StudentSession.status == "active",
#         )
#         .order_by(StudentSession.started_at.desc())
#         .first()
#     )
#     if session_record is not None:
#         session_record.status = "completed"
#         session_record.ended_at = datetime.now(timezone.utc)
#         db.commit()


# def persist_quiz_attempt(
#     current_student: User,
#     lecture: Lecture,
#     difficulty: str,
#     total_questions: int,
#     correct_answers: int,
#     answers: Any,
#     db: Session,
#     score_override: Optional[int] = None,
# ) -> QuizAttempt:
#     profile = get_student_profile(current_student, db)
#     score_value = (
#         max(0, min(100, int(score_override)))
#         if score_override is not None
#         else round((correct_answers / total_questions) * 100)
#     )
#     attempt = QuizAttempt(
#         student_id=profile.id,
#         lecture_id=lecture.id,
#         difficulty=difficulty,
#         total_questions=total_questions,
#         correct_answers=correct_answers,
#         score=score_value,
#         passed=score_value >= QUIZ_PASS_THRESHOLD,
#         answers=answers,
#     )
#     db.add(attempt)
#     db.flush()
#     return attempt


# # ============================================================
# # QUIZ CONFIGURATION
# # ============================================================

# # Student must score this percentage or higher to pass.
# QUIZ_PASS_THRESHOLD = 70


# # ============================================================
# # LOAD TRAINED XGBOOST CONFUSION MODEL
# # ============================================================

# MODEL_PATH = os.path.join(
#     os.path.dirname(__file__), "../../cognitrace_confusion_xgboost.pkl"
# )

# try:
#     xgb_confusion_model = joblib.load(MODEL_PATH)
#     print("[ML Engine] Successfully loaded XGBoost model")
# except Exception as e:
#     print(f"[ML Engine] Warning: Could not load trained model: {e}")
#     xgb_confusion_model = None


# def evaluate_xgboost_confusion(
#     pauses_30s: int,
#     resumes_30s: int,
#     rewinds_30s: int,
#     seeks_30s: int,
#     speed: float,
#     completion_pct: float,
# ) -> Dict[str, Any]:
#     """
#     Evaluates potential student cognitive friction using the trained XGBoost model
#     strictly on the latest 30-second interaction window counts.
#     Features: ['Pause_Count', 'Resume_Count', 'Rewind_Count', 'Forward_Seek_Count', 'Playback_Speed_Num', 'Completion_Num']
#     """
#     if xgb_confusion_model is None:
#         # Fallback rule-based heuristic if model file is missing
#         is_confused = (rewinds_30s >= 2) or (pauses_30s >= 2 and speed <= 1.0)
#         c_score = 85 if is_confused else 15
#         return {
#             "confusion_score": c_score,
#             "confusion_status": (
#                 "High Confusion"
#                 if c_score >= 70
#                 else ("Medium Confusion" if c_score >= 35 else "Low Confusion")
#             ),
#             "prob_confused": 0.85 if is_confused else 0.15,
#         }

#     try:
#         # Prepare feature vector matching the exact order used during model training
#         features = np.array(
#             [
#                 [
#                     int(pauses_30s),
#                     int(resumes_30s),
#                     int(rewinds_30s),
#                     int(seeks_30s),
#                     float(speed),
#                     float(
#                         completion_pct / 100.0
#                     ),  # Convert percentage to float 0.0 - 1.0
#                 ]
#             ]
#         )

#         # Predict Class 1 (Confused) Probability
#         prob_confused = float(xgb_confusion_model.predict_proba(features)[0][1])
#         c_score = int(round(prob_confused * 100))

#         if c_score >= 70:
#             status = "High Confusion"
#         elif c_score >= 35:
#             status = "Medium Confusion"
#         else:
#             status = "Low Confusion"

#         return {
#             "confusion_score": c_score,
#             "confusion_status": status,
#             "prob_confused": round(prob_confused, 4),
#         }
#     except Exception as err:
#         print(f"[ML Engine] Inference Error: {err}")
#         return {
#             "confusion_score": 0,
#             "confusion_status": "Low Confusion",
#             "prob_confused": 0.0,
#         }


# # ============================================================
# # PYDANTIC MODELS
# # ============================================================


# class SessionEventLog(BaseModel):
#     lecture_id: str
#     event_type: str
#     timestamp: float
#     playback_speed: float
#     watch_duration: float

#     rewind_from: Optional[float] = None
#     rewind_to: Optional[float] = None

#     previous_timestamp: Optional[float] = None
#     current_timestamp: Optional[float] = None

#     seconds_delta: Optional[float] = None
#     event_data: Optional[Dict[str, Any]] = None
#     previous_speed: Optional[float] = None
#     new_speed: Optional[float] = None

#     # Latest 30-Second Window Metrics
#     pauses_30s: Optional[int] = 0
#     resumes_30s: Optional[int] = 0
#     rewinds_30s: Optional[int] = 0
#     seeks_30s: Optional[int] = 0


# class SearchQuery(BaseModel):
#     query: str


# class TelemetryLog(BaseModel):
#     paused: int
#     rewound: int
#     seeked: int
#     speed_changes: int
#     watch_time: float
#     repeated_timestamps: List[str]
#     completion_percentage: float

#     # Latest 30-second window metrics from frontend player
#     pauses_30s: Optional[int] = 0
#     resumes_30s: Optional[int] = 0
#     rewinds_30s: Optional[int] = 0
#     seeks_30s: Optional[int] = 0
#     current_speed: Optional[float] = 1.0


# class HelpCenterRequest(BaseModel):
#     step: str
#     user_response: Optional[str] = None
#     knows_prereq: Optional[bool] = None
#     lecture_id: Optional[str] = None

#     quiz_passed: Optional[bool] = None
#     quiz_score: Optional[int] = None


# class AskAIRequest(BaseModel):
#     question: str
#     lecture_id: str
#     level: Optional[str] = "medium"


# class GenerateQuizRequest(BaseModel):
#     explanation_text: str
#     topic: str
#     level: Optional[str] = "medium"
#     lecture_id: Optional[str] = None


# class QuizAttemptSubmission(BaseModel):
#     lecture_id: str
#     difficulty: str = "medium"
#     total_questions: int
#     correct_answers: int
#     answers: Optional[Any] = None


# class YouTubeLectureRequest(BaseModel):
#     url: str


# # ============================================================
# # YOUTUBE HELPERS
# # ============================================================


# def extract_youtube_video_id(url: str) -> Optional[str]:
#     pattern = (
#         r"(?:https?://)?"
#         r"(?:www\.)?"
#         r"(?:youtube\.com/(?:[^/]+/.+/|"
#         r"(?:v|e(?:mbed)?)/|.*[?&]v=)|"
#         r"youtu\.be/)"
#         r'([^"&?/\s]{11})'
#     )
#     match = re.search(pattern, url)
#     if match:
#         return match.group(1)
#     return None


# def get_youtube_metadata(video_id: str):
#     oembed_url = (
#         "https://www.youtube.com/oembed?"
#         f"url=https://www.youtube.com/watch?v={video_id}"
#         "&format=json"
#     )
#     try:
#         req = urllib.request.Request(oembed_url, headers={"User-Agent": "Mozilla/5.0"})
#         with urllib.request.urlopen(req, timeout=5) as response:
#             data = json.loads(response.read().decode())
#             return {
#                 "title": data.get("title", f"YouTube Video {video_id}"),
#                 "author": data.get("author_name", "Unknown Creator"),
#                 "thumbnail": data.get(
#                     "thumbnail_url", f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
#                 ),
#             }
#     except Exception:
#         return {
#             "title": f"YouTube Video {video_id}",
#             "author": "Unknown Creator",
#             "thumbnail": f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg",
#         }


# def format_seconds_to_timestamp(seconds: float) -> str:
#     total_seconds = int(seconds)
#     minutes = total_seconds // 60
#     secs = total_seconds % 60
#     return f"{minutes:02d}:{secs:02d}"


# # ============================================================
# # SESSION HELPERS
# # ============================================================


# def create_empty_session(lecture_id: str, lecture: dict, student_name: str):
#     return {
#         "student_name": student_name,
#         "lecture_id": lecture_id,
#         "lecture_title": lecture["title"],
#         "course_topic": (
#             lecture["title"].split(":", 1)[1].strip()
#             if ":" in lecture["title"]
#             else lecture["title"]
#         ),
#         "paused": 0,
#         "rewound": 0,
#         "seeked": 0,
#         "forward_seeks": 0,
#         "speed_changes": 0,
#         "watch_time": 0.0,
#         "repeated_timestamps": [],
#         "completion_percentage": 0.0,
#         "quiz_attempts": 0,
#         "quiz_score": 0,
#         "quiz_passed": False,
#         "confusion_score": 0,
#         "confusion_status": "Low Confusion",
#         "struggled_concepts": [],
#         "understood_concepts": [],
#         "manual_confusion": 0,
#         "confusion_timestamps": [],
#         "play_events": 0,
#     }


# def get_or_create_session(
#     lecture_id: str, student_data: Dict[str, Any], student_name: str
# ):
#     lectures = student_data["lectures"]
#     sessions = student_data["sessions"]
#     lecture = next((l for l in lectures if l["id"] == lecture_id), None)
#     if not lecture:
#         raise HTTPException(status_code=404, detail="Lecture not found")

#     if lecture_id not in sessions:
#         sessions[lecture_id] = create_empty_session(lecture_id, lecture, student_name)

#     return sessions[lecture_id]


# # ============================================================
# # DASHBOARD
# # ============================================================


# @router.get("/dashboard")
# def get_student_dashboard(
#     current_student: User = Depends(get_current_student),
#     db: Session = Depends(get_db),
# ):

#     student_data = get_student_data(current_student)
#     refresh_student_lectures(student_data, db)
#     hydrate_student_sessions(current_student, student_data, db)
#     SESSIONS_STORE = student_data["sessions"]
#     WATCH_HISTORY = student_data["watch_history"]
#     MOCK_LECTURES = student_data["lectures"]
#     completed_count = sum(1 for s in SESSIONS_STORE.values() if s.get("quiz_passed"))

#     if not SESSIONS_STORE:
#         overall_prog = 0
#         avg_engagement = 0
#         weekly_hours = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
#     else:
#         total_lectures = len(MOCK_LECTURES)
#         overall_prog = (
#             int(
#                 sum(
#                     s.get("completion_percentage", 0.0) for s in SESSIONS_STORE.values()
#                 )
#                 / total_lectures
#             )
#             if total_lectures > 0
#             else 0
#         )
#         avg_engagement = int(
#             sum(
#                 max(0, 100 - s.get("confusion_score", 0))
#                 for s in SESSIONS_STORE.values()
#             )
#             / len(SESSIONS_STORE)
#         )
#         total_time = sum(s.get("total_watch_time_seconds", 0.0) for s in SESSIONS_STORE.values())
#         weekly_hours = [
#             0.0,
#             0.0,
#             0.0,
#             0.0,
#             0.0,
#             0.0,
#             float(round(total_time / 3600.0, 2)),
#         ]

#     strong = []
#     weak = []

#     for s in SESSIONS_STORE.values():
#         topic = s.get("course_topic", "Concept")
#         if s.get("quiz_passed"):
#             strong.append(topic)
#         elif s.get("quiz_attempts", 0) > 0:
#             weak.append(topic)

#     recent = []
#     for key, val in WATCH_HISTORY.items():
#         progress = int(SESSIONS_STORE.get(key, {}).get("completion_percentage", 0))
#         recent.append(
#             {
#                 "id": key,
#                 "title": val["title"],
#                 "progress": progress,
#                 "last_watched": val["last_watched"],
#             }
#         )

#     return {
#         "student_name": current_student.full_name,
#         "overall_progress": overall_prog,
#         "weekly_hours": weekly_hours,
#         "average_engagement": avg_engagement,
#         "completed_lectures": completed_count,
#         "total_lectures": len(MOCK_LECTURES),
#         "strong_topics": [{"topic": t, "mastery": 90} for t in strong],
#         "weak_topics": [{"topic": t, "mastery": 45} for t in weak],
#         "recent_activity": recent,
#         "recommended_topics": [],
#     }


# # ============================================================
# # LECTURES
# # ============================================================


# @router.get("/lectures")
# def get_lectures(
#     current_student: User = Depends(get_current_student),
#     db: Session = Depends(get_db),
# ):
#     student_data = get_student_data(current_student)
#     # Return all lectures from the Faculty JSON store.
    
#     result = []
#     for lec in LECTURES:
#         if lec.get("status") in ["READY", "published", None]: # Visibility filter
#             result.append({
#                 "id": lec.get("id"),
#                 "title": lec.get("title") or "Untitled Lecture",
#                 "description": lec.get("description") or "",
#                 "faculty_id": lec.get("faculty_id"),
#                 "faculty_name": lec.get("faculty_name") or lec.get("instructor") or "Unknown Teacher",
#                 "subject": lec.get("subject"),
#                 "category": lec.get("category"),
#                 "subcategory": lec.get("subcategory"),
#                 "thumbnail_url": lec.get("thumbnail"),
#                 "duration": lec.get("duration") or "Unknown",
#                 "created_at": lec.get("created_at") or "",
#                 "source": lec.get("source_type", "local"),
#                 "video_available": True,
#                 "transcript_available": True,
#                 "youtube_id": lec.get("youtube_id"),
#                 "video_url": f"/api/faculty/lectures/{lec.get('id')}/video" if lec.get("source_type") == "local" else lec.get("video_url")
#             })
            
#     # Keep compatibility with postgres if any exist
#     try:
#         pg_payloads = refresh_student_lectures(student_data, db)
#         for pg_lec in pg_payloads:
#             if not any(r["id"] == pg_lec["id"] for r in result):
#                 result.append(pg_lec)
#     except Exception:
#         pass
        
#     return result


# # ============================================================
# # TELEMETRY WITH TRAINED XGBOOST MODEL EVALUATION
# # ============================================================


# @router.post("/telemetry")
# def update_telemetry(
#     log: TelemetryLog, current_student: User = Depends(get_current_student)
# ):
#     student_data = get_student_data(current_student)
#     ACTIVE_SESSION_STATE = student_data["active_session"]
#     ACTIVE_SESSION_STATE["paused"] = log.paused
#     ACTIVE_SESSION_STATE["rewound"] = log.rewound
#     ACTIVE_SESSION_STATE["seeked"] = log.seeked
#     ACTIVE_SESSION_STATE["speed_changes"] = log.speed_changes
#     ACTIVE_SESSION_STATE["watch_time"] = log.watch_time
#     ACTIVE_SESSION_STATE["repeated_timestamps"] = log.repeated_timestamps
#     ACTIVE_SESSION_STATE["completion_percentage"] = log.completion_percentage

#     # Fallback estimations for 30s actions if not directly provided
#     pauses_30s = log.pauses_30s if log.pauses_30s is not None else min(log.paused, 2)
#     resumes_30s = (
#         log.resumes_30s if log.resumes_30s is not None else (1 if pauses_30s > 0 else 0)
#     )
#     rewinds_30s = (
#         log.rewinds_30s if log.rewinds_30s is not None else min(log.rewound, 2)
#     )
#     seeks_30s = log.seeks_30s if log.seeks_30s is not None else min(log.seeked, 1)
#     speed = log.current_speed if log.current_speed is not None else 1.0

#     # Evaluate trained XGBoost model on the latest 30s actions
#     xgb_result = evaluate_xgboost_confusion(
#         pauses_30s=pauses_30s,
#         resumes_30s=resumes_30s,
#         rewinds_30s=rewinds_30s,
#         seeks_30s=seeks_30s,
#         speed=speed,
#         completion_pct=log.completion_percentage,
#     )

#     ACTIVE_SESSION_STATE["confusion_score"] = xgb_result["confusion_score"]
#     ACTIVE_SESSION_STATE["confusion_status"] = xgb_result["confusion_status"]

#     return {
#         "status": "success",
#         "confusion_score": xgb_result["confusion_score"],
#         "confusion_status": xgb_result["confusion_status"],
#         "trigger_ai_help": xgb_result["confusion_score"] >= 70,
#     }


# # ============================================================
# # SESSION EVENT LOGGING WITH TRAINED XGBOOST INFERENCE
# # ============================================================



# @router.post("/session-analysis/log")
# def log_session_event(
#     log: SessionEventLog,
#     current_student: User = Depends(get_current_student),
#     db: Session = Depends(get_db),
# ):
#     student_data = get_student_data(current_student)
#     refresh_student_lectures(student_data, db)
    
#     lecture_record = get_published_lecture(log.lecture_id, db)
#     if lecture_record:
#         db_session = get_or_create_persistent_session(current_student, lecture_record, db)
#         db_session_id = str(db_session.id)
#         total_watch_time = db_session.total_watch_time_seconds
#     else:
#         db_session = None
#         db_session_id = "local-json-session-" + str(log.lecture_id)
#         total_watch_time = 0

#     SESSIONS_STORE = student_data["sessions"]
#     ACTIVE_SESSION_STATE = student_data["active_session"]
    
#     from app.routers.faculty_store import LECTURES
#     MOCK_LECTURES = student_data["lectures"] + LECTURES

#     def format_time(seconds):
#         minutes = int(seconds // 60)
#         secs = int(seconds % 60)
#         return f"{minutes:02d}:{secs:02d}"

#     if (
#         not ACTIVE_SESSION_STATE
#         or ACTIVE_SESSION_STATE.get("lecture_id") != log.lecture_id
#     ):
#         lecture = next((l for l in MOCK_LECTURES if l["id"] == log.lecture_id), None)
#         if not lecture:
#             raise HTTPException(status_code=404, detail="Lecture not found")
            
#         cached_state = SESSIONS_STORE.get(log.lecture_id)
#         if cached_state and cached_state.get("db_session_id") == db_session_id:
#             restored_state = cached_state
#         else:
#             if lecture_record and db_session:
#                 restored_state = restore_session_state(
#                     db, db_session, lecture, current_student.full_name
#                 )
#             else:
#                 restored_state = {
#                     "lecture_id": log.lecture_id,
#                     "student_name": current_student.full_name,
#                     "lecture_title": lecture.get("title", ""),
#                     "video_url": lecture.get("youtube_url", lecture.get("video_url", "")),
#                     "total_duration": lecture.get("duration_seconds", 0),
#                     "watch_time": 0,
#                     "completion_percentage": 0,
#                     "confusion_score": 15,
#                     "confusion_status": "clear",
#                     "play_events": 0,
#                     "paused": 0,
#                     "rewound": 0,
#                     "seeked": 0,
#                     "forward_seeks": 0,
#                     "speed_changes": 0,
#                     "repeated_timestamps": [],
#                     "speed_history": [],
#                     "confusion_timestamps": [],
#                     "manual_confusion": 0,
#                     "quiz_score": None,
#                     "summary_generated": False,
#                     "db_session_id": db_session_id,
#                     "total_watch_time_seconds": 0
#                 }
#         ACTIVE_SESSION_STATE.clear()
#         ACTIVE_SESSION_STATE.update(restored_state)

#     if log.event_type == "play":
#         ACTIVE_SESSION_STATE["play_events"] = ACTIVE_SESSION_STATE.get("play_events", 0) + 1
#     elif log.event_type == "pause":
#         ACTIVE_SESSION_STATE["paused"] += 1
#     elif log.event_type == "rewind":
#         ACTIVE_SESSION_STATE["rewound"] += 1
#         prev_t = log.previous_timestamp if log.previous_timestamp is not None else log.rewind_from
#         curr_t = log.current_timestamp if log.current_timestamp is not None else log.rewind_to
#         if prev_t is not None and curr_t is not None:
#             time_range = f"{format_time(curr_t)}-{format_time(prev_t)}"
#             ACTIVE_SESSION_STATE["repeated_timestamps"].append(time_range)
#     elif log.event_type in ["seek", "forward_seek"]:
#         ACTIVE_SESSION_STATE["seeked"] += 1
#         if log.event_type == "forward_seek":
#             ACTIVE_SESSION_STATE["forward_seeks"] += 1
#     elif log.event_type == "speed_change":
#         ACTIVE_SESSION_STATE["speed_changes"] += 1
#         if "speed_history" not in ACTIVE_SESSION_STATE:
#             ACTIVE_SESSION_STATE["speed_history"] = []
#         ACTIVE_SESSION_STATE["speed_history"].append(
#             {
#                 "previous_speed": log.previous_speed,
#                 "new_speed": log.new_speed,
#                 "timestamp": log.timestamp,
#             }
#         )
#     elif log.event_type == "manual_confusion":
#         ACTIVE_SESSION_STATE["manual_confusion"] += 1
#         ACTIVE_SESSION_STATE["confusion_timestamps"].append(format_time(log.timestamp))

#     ACTIVE_SESSION_STATE["completion_percentage"] = max(ACTIVE_SESSION_STATE["completion_percentage"], log.watch_duration)
#     ACTIVE_SESSION_STATE["watch_time"] = max(ACTIVE_SESSION_STATE["watch_time"], log.timestamp)

#     pauses_30s = log.pauses_30s if log.pauses_30s is not None else (1 if log.event_type == "pause" else 0)
#     resumes_30s = log.resumes_30s if log.resumes_30s is not None else (1 if log.event_type == "play" else 0)
#     rewinds_30s = log.rewinds_30s if log.rewinds_30s is not None else (1 if log.event_type == "rewind" else 0)
#     seeks_30s = log.seeks_30s if log.seeks_30s is not None else (1 if log.event_type in ["seek", "forward_seek"] else 0)

#     xgb_result = evaluate_xgboost_confusion(
#         pauses_30s=pauses_30s,
#         resumes_30s=resumes_30s,
#         rewinds_30s=rewinds_30s,
#         seeks_30s=seeks_30s,
#         speed=log.playback_speed,
#         completion_pct=ACTIVE_SESSION_STATE["completion_percentage"],
#     )

#     c_score = xgb_result["confusion_score"]
#     ACTIVE_SESSION_STATE["confusion_score"] = c_score
#     ACTIVE_SESSION_STATE["confusion_status"] = xgb_result["confusion_status"]

#     confusion_detected = c_score >= 70 and log.event_type != "pause"
#     recommended_action = "AI Help Center is available if you would like to clarify this segment." if confusion_detected else "Session tracked."

#     current_id = ACTIVE_SESSION_STATE.get("lecture_id")
#     if current_id:
#         SESSIONS_STORE[current_id] = dict(ACTIVE_SESSION_STATE)

#     event_data = log.model_dump() if hasattr(log, "model_dump") else log.dict()
#     event_data["confusion_score"] = c_score
#     event_data["confusion_status"] = ACTIVE_SESSION_STATE["confusion_status"]

#     if db_session:
#         if log.event_type == "watch_progress":
#            delta_seconds = max(0, float(log.seconds_delta or 0))
#            db_session.total_watch_time_seconds = (db_session.total_watch_time_seconds or 0) + delta_seconds
#         db.add(
#             LearningEvent(
#                 session_id=db_session.id,
#                 event_type=log.event_type[:50],
#                 video_timestamp_seconds=max(0, int(log.timestamp)),
#                 event_data=event_data,
#             )
#         )
#         db.commit()
        
#     ACTIVE_SESSION_STATE["db_session_id"] = db_session_id
#     ACTIVE_SESSION_STATE["total_watch_time_seconds"] = total_watch_time if not db_session else db_session.total_watch_time_seconds

#     return {
#         "status": "success",
#         "session_id": db_session_id,
#         "event_persisted": True,
#         "confusion_detected": confusion_detected,
#         "confusion_score": c_score,
#         "confusion_status": ACTIVE_SESSION_STATE["confusion_status"],
#         "recommended_action": recommended_action,
#     }



# # ============================================================
# # ACTIVE SESSION
# # ============================================================


# @router.get("/active-session")
# def get_active_session(
#     current_student: User = Depends(get_current_student),
#     db: Session = Depends(get_db),
# ):
#     student_data = get_student_data(current_student)
#     refresh_student_lectures(student_data, db)
#     hydrate_student_sessions(current_student, student_data, db)
#     return student_data["active_session"]


# # ============================================================
# # SELECT SESSION
# # ============================================================


# @router.post("/session/select")
# def select_session(
#     req: dict,
#     current_student: User = Depends(get_current_student),
#     db: Session = Depends(get_db),
# ):
#     student_data = get_student_data(current_student)
#     refresh_student_lectures(student_data, db)
#     SESSIONS_STORE = student_data["sessions"]
#     WATCH_HISTORY = student_data["watch_history"]
#     ACTIVE_SESSION_STATE = student_data["active_session"]
#     MOCK_LECTURES = student_data["lectures"]
#     lec_id = req.get("lecture_id")
#     if not lec_id:
#         raise HTTPException(status_code=400, detail="Missing lecture_id")

#     lecture = next((l for l in MOCK_LECTURES if l["id"] == lec_id), None)
#     if not lecture:
#         raise HTTPException(status_code=404, detail="Lecture not found")

#     current_id = ACTIVE_SESSION_STATE.get("lecture_id")
#     if current_id:
#         SESSIONS_STORE[current_id] = dict(ACTIVE_SESSION_STATE)

#     lecture_record = get_published_lecture(lec_id, db)
#     db_session = (
#         get_or_create_persistent_session(current_student, lecture_record, db)
#         if lecture_record is not None
#         else None
#     )
#     if db_session is not None:
#         if lec_id in SESSIONS_STORE and SESSIONS_STORE[lec_id].get("db_session_id") == str(
#             db_session.id
#         ):
#             restored_state = SESSIONS_STORE[lec_id]
#         else:
#             restored_state = restore_session_state(
#                 db, db_session, lecture, current_student.full_name
#             )
#         ACTIVE_SESSION_STATE.clear()
#         ACTIVE_SESSION_STATE.update(restored_state)
#         ACTIVE_SESSION_STATE["db_session_id"] = str(db_session.id)
#         SESSIONS_STORE[lec_id] = dict(ACTIVE_SESSION_STATE)
#         db.commit()
#     else:
#         if lec_id in SESSIONS_STORE:
#             restored_state = SESSIONS_STORE[lec_id]
#         else:
#             restored_state = create_empty_session(lec_id, lecture, current_student.full_name)
#         ACTIVE_SESSION_STATE.clear()
#         ACTIVE_SESSION_STATE.update(restored_state)
#         SESSIONS_STORE[lec_id] = dict(ACTIVE_SESSION_STATE)

#     WATCH_HISTORY[lec_id] = {
#         "id": lec_id,
#         "title": lecture["title"],
#         "progress": int(ACTIVE_SESSION_STATE["completion_percentage"]),
#         "last_watched": "Just now",
#     }

#     return ACTIVE_SESSION_STATE


# # ============================================================
# # RESET
# # ============================================================


# @router.post("/reset")
# def reset_session(
#     current_student: User = Depends(get_current_student),
#     db: Session = Depends(get_db),
# ):
#     student_data = get_student_data(current_student)
#     profile = get_student_profile(current_student, db)
#     active_rows = (
#         db.query(StudentSession)
#         .filter(
#             StudentSession.student_id == profile.id,
#             StudentSession.status == "active",
#         )
#         .all()
#     )
#     for row in active_rows:
#         row.status = "abandoned"
#         row.ended_at = datetime.now(timezone.utc)
#     db.commit()
#     student_data["sessions"].clear()
#     student_data["watch_history"].clear()
#     student_data["active_session"].clear()
#     return {"status": "reset_completed", "history_preserved": True}


# # ============================================================
# # SMART SEARCH
# # ============================================================


# @router.post("/search")
# def smart_search(
#     query: SearchQuery,
#     current_student: User = Depends(get_current_student),
#     db: Session = Depends(get_db),
# ):
#     student_data = get_student_data(current_student)
#     refresh_student_lectures(student_data, db)
#     TRANSCRIPTS_STORE = student_data["transcripts"]
#     MOCK_LECTURES = student_data["lectures"]
#     q = query.query.lower()
#     hits = []

#     for lec_id, entries in TRANSCRIPTS_STORE.items():
#         lec_title = "Unknown Lecture"
#         for lec in MOCK_LECTURES:
#             if lec["id"] == lec_id:
#                 lec_title = lec["title"]
#                 break

#         for item in entries:
#             if q in item["text"].lower():
#                 hits.append(
#                     {
#                         "lecture_id": lec_id,
#                         "lecture_title": lec_title,
#                         "timestamp": item["timestamp"],
#                         "seconds": item["seconds"],
#                         "snippet": item["text"],
#                         "relevance": 95,
#                     }
#                 )

#     return {
#         "query": query.query,
#         "results": hits,
#         "message": "No matching transcript segments were found." if not hits else None,
#     }


# # ============================================================
# # YOUTUBE LECTURE IMPORT
# # ============================================================


# @router.post("/youtube-lecture")
# def create_youtube_lecture(
#     req: YouTubeLectureRequest,
#     current_student: User = Depends(get_current_student),
# ):
#     raise HTTPException(
#         status_code=403,
#         detail="Students cannot create lectures. Ask faculty to add and publish this YouTube lecture; published lectures will appear in the lecture catalogue.",
#     )


# # ============================================================
# # LECTURE ANALYSIS
# # ============================================================


# @router.get("/lecture/{lecture_id}/analysis")
# def get_lecture_analysis(
#     lecture_id: str,
#     current_student: User = Depends(get_current_student),
#     db: Session = Depends(get_db),
# ):
#     student_data = get_student_data(current_student)
#     refresh_student_lectures(student_data, db)
#     MOCK_LECTURES = student_data["lectures"]
#     SESSIONS_STORE = student_data["sessions"]
#     MOCK_SUMMARIES = student_data["summaries"]
#     FINAL_VIDEO_QUIZZES = student_data["final_video_quizzes"]
#     lecture = next((l for l in MOCK_LECTURES if l["id"] == lecture_id), None)
#     if lecture is None:
#         raise HTTPException(status_code=404, detail="Lecture not found.")
#     state = SESSIONS_STORE.get(lecture_id)

#     if not state:
#         state = {
#             "paused": 0,
#             "rewound": 0,
#             "seeked": 0,
#             "forward_seeks": 0,
#             "speed_changes": 0,
#             "watch_time": 0.0,
#             "completion_percentage": 0.0,
#             "quiz_attempts": 0,
#             "quiz_passed": False,
#             "quiz_score": 0,
#             "confusion_score": 0,
#             "confusion_status": "Low Confusion",
#             "manual_confusion": 0,
#             "repeated_timestamps": [],
#             "confusion_timestamps": [],
#         }

#     summary_info = MOCK_SUMMARIES.get(
#         lecture_id,
#         {
#             "summary": "Summary unavailable.",
#             "revision_notes": "Revision notes unavailable.",
#         },
#     )

#     return {
#         "lecture_id": lecture_id,
#         "ai_summary": summary_info["summary"],
#         "ai_revision_notes": summary_info["revision_notes"],
#         "final_video_quiz": FINAL_VIDEO_QUIZZES.get(lecture_id),
#         "session_analytics": {
#             "total_pauses": state.get("paused", 0),
#             "total_rewinds": state.get("rewound", 0),
#             "total_seeks": state.get("seeked", 0),
#             "forward_seeks": state.get("forward_seeks", 0),
#             "playback_speed_changes": state.get("speed_changes", 0),
#             "watch_percentage": int(state.get("completion_percentage", 0)),
#             "watch_time": state.get("watch_time", "0m 0s"),
#             "confusion_score": state.get("confusion_score", 0),
#             "confusion_status": state.get("confusion_status", "Low"),
#             "quiz_score": (
#                 f"{state.get('quiz_score', 0)}%" if state.get("quiz_attempts", 0) > 0 else "N/A"
#             ),
#             "quiz_threshold": QUIZ_PASS_THRESHOLD,
#             "manual_confusion": state.get("manual_confusion", 0),
#             "repeated_timestamps": state.get("repeated_timestamps", []),
#             "confusion_timestamps": state.get("confusion_timestamps", []),
#         },
#     }


# # ============================================================
# # QUIZ STATUS / THRESHOLD
# # ============================================================


# @router.get("/quiz-status")
# def get_quiz_status(current_student: User = Depends(get_current_student)):
#     return {
#         "pass_threshold": QUIZ_PASS_THRESHOLD,
#         "description": f"Student must score {QUIZ_PASS_THRESHOLD}% or higher to pass.",
#     }


# @router.post("/quiz/attempt", status_code=201)
# def submit_quiz_attempt(
#     req: QuizAttemptSubmission,
#     current_student: User = Depends(get_current_student),
#     db: Session = Depends(get_db),
# ):
#     lecture = get_published_lecture(req.lecture_id, db)
#     if req.total_questions < 1:
#         raise HTTPException(
#             status_code=400, detail="total_questions must be at least 1"
#         )
#     if req.correct_answers < 0 or req.correct_answers > req.total_questions:
#         raise HTTPException(
#             status_code=400,
#             detail="correct_answers must be between 0 and total_questions",
#         )
#     difficulty = {
#         "beginner": "easy",
#         "medium": "medium",
#         "advanced": "hard",
#         "easy": "easy",
#         "hard": "hard",
#     }.get((req.difficulty or "medium").lower())
#     if difficulty is None:
#         raise HTTPException(
#             status_code=400, detail="difficulty must be easy, medium or hard"
#         )

#     attempt = persist_quiz_attempt(
#         current_student=current_student,
#         lecture=lecture,
#         difficulty=difficulty,
#         total_questions=req.total_questions,
#         correct_answers=req.correct_answers,
#         answers=req.answers,
#         db=db,
#     )
#     db.commit()

#     student_data = get_student_data(current_student)
#     state = student_data["sessions"].get(req.lecture_id)
#     if state is not None:
#         state["quiz_attempts"] = state.get("quiz_attempts", 0) + 1
#         state["quiz_score"] = attempt.score
#         state["quiz_passed"] = attempt.passed

#     return {
#         "status": "success",
#         "attempt_id": str(attempt.id),
#         "lecture_id": req.lecture_id,
#         "difficulty": attempt.difficulty,
#         "total_questions": attempt.total_questions,
#         "correct_answers": attempt.correct_answers,
#         "score": attempt.score,
#         "passed": attempt.passed,
#         "pass_threshold": QUIZ_PASS_THRESHOLD,
#     }


# # ============================================================
# # AI HELP CENTER HELPERS
# # ============================================================


# def get_prerequisites_for_topic(lecture: dict) -> List[str]:
#     existing = lecture.get("prerequisites") or []
#     if existing:
#         return existing

#     title = lecture.get("title", "").lower()
#     prerequisite_map = {
#         "binary search": ["Arrays", "Sorted Data", "Basic Searching Concepts"],
#         "linked list": ["Arrays", "Pointers", "Dynamic Memory"],
#         "stack": ["Arrays", "Basic Data Structures", "LIFO Concept"],
#         "queue": ["Arrays", "Basic Data Structures", "FIFO Concept"],
#         "tree": ["Binary Tree Basics", "Recursion", "Pointers"],
#         "graph": [
#             "Vertices and Edges",
#             "Basic Data Structures",
#             "Graph Representation",
#         ],
#         "normalization": [
#             "Relational Databases",
#             "Primary and Foreign Keys",
#             "Functional Dependencies",
#         ],
#         "1nf": ["Relational Databases", "Database Tables", "Keys"],
#         "2nf": ["1NF", "Primary Keys", "Functional Dependencies"],
#         "3nf": ["2NF", "Functional Dependencies", "Candidate Keys"],
#         "inheritance": [
#             "Classes and Objects",
#             "Object-Oriented Programming",
#             "Methods and Attributes",
#         ],
#         "polymorphism": ["Classes and Objects", "Inheritance", "Method Overriding"],
#         "recursion": ["Functions", "Conditional Statements", "Call Stack"],
#         "sorting": ["Arrays", "Comparisons", "Loops"],
#     }

#     for key, prerequisites in prerequisite_map.items():
#         if key in title:
#             return prerequisites

#     return [
#         "Basic terminology of the subject",
#         "Core concepts introduced before this topic",
#         "Basic operations used in this topic",
#     ]


# def find_prerequisite_lectures(
#     prerequisites: List[str], lectures: List[Dict[str, Any]]
# ) -> List[Dict[str, Any]]:
#     recommendations = []
#     for lecture in lectures:
#         title = lecture.get("title", "").lower()
#         matched = False
#         for prerequisite in prerequisites:
#             words = [word for word in prerequisite.lower().split() if len(word) > 2]
#             if words and all(word in title for word in words):
#                 matched = True
#                 break
#         if matched:
#             recommendations.append(
#                 {
#                     "lecture_id": lecture["id"],
#                     "title": lecture["title"],
#                     "link": f"/student/session?play={lecture['id']}&t=0",
#                 }
#             )
#     return recommendations


# def select_representative_chunks(
#     chunks: List[Dict[str, Any]], max_chunks: int = 60
# ) -> List[Dict[str, Any]]:
#     """Select evenly distributed transcript entries across the whole lecture."""
#     if not chunks:
#         return []
#     if len(chunks) <= max_chunks:
#         return chunks
#     if max_chunks <= 1:
#         return [chunks[0]]
#     step = (len(chunks) - 1) / (max_chunks - 1)
#     selected = []
#     seen = set()
#     for i in range(max_chunks):
#         index = round(i * step)
#         if index not in seen:
#             selected.append(chunks[index])
#             seen.add(index)
#     return selected


# def build_transcript_context(
#     chunks: List[Dict[str, Any]], max_chars: int = 30000
# ) -> str:
#     parts = []
#     for chunk in chunks:
#         start_time = chunk.get("start_time", chunk.get("seconds", 0))
#         end_time = chunk.get("end_time", chunk.get("timestamp", ""))
#         text_value = (
#             chunk.get("text")
#             or chunk.get("content")
#             or chunk.get("chunk_text")
#             or chunk.get("transcript")
#             or ""
#         )
#         if not str(text_value).strip():
#             continue
#         parts.append(f"[{start_time}s - {end_time}]\n{text_value}")
#     return "\n\n".join(parts)[:max_chars]


# def generate_ai_study_materials(
#     lecture: dict, transcript_chunks: List[Dict[str, Any]], source_language: str = "en"
# ) -> Dict[str, Any]:
#     lecture_title = lecture.get("title", "Untitled Lecture")

#     if not transcript_chunks:
#         return {
#             "summary": "AI Summary unavailable.",
#             "revision_notes": "AI Revision Notes unavailable.",
#         }

#     # Cover the whole lecture by selecting representative sections from beginning to end.
#     representative_chunks = select_representative_chunks(
#         transcript_chunks, max_chunks=60
#     )
#     transcript_context = build_transcript_context(
#         representative_chunks, max_chars=30000
#     )

#     if not transcript_context.strip():
#         return {
#             "summary": "AI Summary unavailable.",
#             "revision_notes": "AI Revision Notes unavailable.",
#         }

#     summary = None
#     revision_notes = None

#     try:
#         summary_prompt = (
#             f"Create a complete study summary for the lecture '{lecture_title}'.\n\n"
#             "Use ONLY the supplied lecture transcript.\n"
#             "Cover the entire lecture, including major topics, definitions, algorithms/procedures, rules, and examples.\n"
#             "The supplied transcript sections are representative sections distributed across the lecture, "
#             "so cover the lecture from beginning to end without inventing missing details.\n\n"
#             f"LECTURE TRANSCRIPT:\n{transcript_context}"
#         )
#         summary = generator.generate_explanation(
#             question=summary_prompt,
#             context_chunks=representative_chunks,
#             level="medium",
#         )
#         if not isinstance(summary, str) or not summary.strip():
#             summary = None
#     except Exception as e:
#         print(f"[STUDY MATERIALS] Summary generation error: {e}")

#     try:
#         revision_prompt = (
#             f"Create detailed exam-oriented revision notes for the lecture '{lecture_title}'.\n\n"
#             "Use ONLY the supplied lecture transcript.\n"
#             "Cover the lecture from beginning to end, including important definitions, concepts, "
#             "procedures, algorithms, rules, examples, comparisons and exam-relevant points when supported by the transcript.\n"
#             "The supplied transcript sections are representative sections distributed across the lecture, "
#             "so organize the notes to preserve broad coverage without inventing missing details.\n\n"
#             f"LECTURE TRANSCRIPT:\n{transcript_context}"
#         )
#         revision_notes = generator.generate_explanation(
#             question=revision_prompt,
#             context_chunks=representative_chunks,
#             level="advanced",
#         )
#         if not isinstance(revision_notes, str) or not revision_notes.strip():
#             revision_notes = None
#     except Exception as e:
#         print(f"[STUDY MATERIALS] Revision notes generation error: {e}")

#     summary_available = isinstance(summary, str) and bool(summary.strip())
#     revision_notes_available = isinstance(revision_notes, str) and bool(
#         revision_notes.strip()
#     )

#     if not summary_available:
#         summary = "AI Summary unavailable. Please try importing the lecture again."
#     if not revision_notes_available:
#         revision_notes = (
#             "AI Revision Notes unavailable. Please try importing the lecture again."
#         )

#     return {
#         "summary": f"Source Language: {source_language.upper()}\n\n{summary}",
#         "revision_notes": f"Source Language: {source_language.upper()}\n\n{revision_notes}",
#         "_summary_available": summary_available,
#         "_revision_notes_available": revision_notes_available,
#     }


# # ============================================================
# # AI HELP CENTER
# # ============================================================


# @router.post("/help-center/state")
# def process_help_center(
#     req: HelpCenterRequest,
#     current_student: User = Depends(get_current_student),
#     db: Session = Depends(get_db),
# ):
#     student_data = get_student_data(current_student)
#     refresh_student_lectures(student_data, db)
#     ACTIVE_SESSION_STATE = student_data["active_session"]
#     MOCK_LECTURES = student_data["lectures"]
#     SESSIONS_STORE = student_data["sessions"]
#     step = req.step
#     user_response = req.user_response
#     lec_id = req.lecture_id or ACTIVE_SESSION_STATE.get("lecture_id")

#     if not lec_id:
#         raise HTTPException(status_code=400, detail="lecture_id is required.")

#     lecture = next((l for l in MOCK_LECTURES if l["id"] == lec_id), None)
#     if not lecture:
#         raise HTTPException(status_code=404, detail="Lecture not found.")

#     state = get_or_create_session(lec_id, student_data, current_student.full_name)
#     topic_name = lecture["title"]
#     prerequisites = get_prerequisites_for_topic(lecture)
#     prerequisite_lectures = find_prerequisite_lectures(prerequisites, MOCK_LECTURES)

#     if step == "start":
#         return {
#             "step": "check_prereq",
#             "topic": topic_name,
#             "message": f"Before learning '{topic_name}', do you already understand the prerequisite concepts below?",
#             "prerequisites": prerequisites,
#             "options": [
#                 {"id": "yes", "label": "Yes, I understand them"},
#                 {"id": "no", "label": "No, teach me the prerequisites"},
#             ],
#             "recommended_videos": prerequisite_lectures,
#         }

#     elif step == "check_prereq":
#         knows = (
#             req.knows_prereq if req.knows_prereq is not None else user_response == "yes"
#         )
#         if not knows:
#             state["struggled_concepts"] = list(
#                 set(state.get("struggled_concepts", []) + prerequisites)
#             )
#             return {
#                 "step": "recommend_previous",
#                 "topic": topic_name,
#                 "message": "Let's learn the prerequisite concepts before continuing with this topic.",
#                 "prerequisites": prerequisites,
#                 "recommended_videos": prerequisite_lectures,
#             }
#         return {
#             "step": "select_explanation",
#             "topic": topic_name,
#             "message": f"Great! How would you like '{topic_name}' explained?",
#             "options": [
#                 {
#                     "id": "beginner",
#                     "label": "Beginner",
#                     "description": "Simple language and analogies",
#                 },
#                 {
#                     "id": "medium",
#                     "label": "Medium",
#                     "description": "College-level technical explanation",
#                 },
#                 {
#                     "id": "advanced",
#                     "label": "Advanced",
#                     "description": "Formal and detailed explanation",
#                 },
#             ],
#         }

#     elif step == "select_explanation":
#         exp_type = (
#             user_response
#             if user_response in {"beginner", "medium", "advanced"}
#             else "medium"
#         )
#         try:
#             chunks = vector_store.query_relevant_chunks(
#                 question=f"Explain the concept being taught in '{topic_name}'.",
#                 lecture_id=lec_id,
#                 top_k=6,
#             )
#         except Exception as e:
#             print(f"[RAG] Retrieval error: {e}")
#             chunks = []

#         if not chunks:
#             return {
#                 "step": "error",
#                 "message": "No transcript chunks found for this lecture.",
#             }

#         transcript_context = build_transcript_context(chunks)
#         try:
#             explanation_content = generator.generate_explanation(
#                 question=f"Explain the topic '{topic_name}' using only this lecture.",
#                 context_chunks=chunks,
#                 level=exp_type,
#             )
#         except Exception as e:
#             print(f"[Gemini] Explanation error: {e}")
#             return {
#                 "step": "error",
#                 "message": "Gemini could not generate explanation.",
#             }

#         suggested_timestamps = [
#             {
#                 "start_time": c["start_time"],
#                 "end_time": c["end_time"],
#                 "text": c["text"],
#             }
#             for c in chunks
#         ]

#         return {
#             "step": "select_remediation",
#             "topic": topic_name,
#             "difficulty": exp_type,
#             "explanation": explanation_content,
#             "options": [
#                 {
#                     "id": "real_life",
#                     "label": "Real-Life Example",
#                     "description": "Understand through practical example",
#                 },
#                 {
#                     "id": "quiz",
#                     "label": "Take a Quiz",
#                     "description": "Test understanding of this exact topic",
#                 },
#                 {
#                     "id": "animation",
#                     "label": "Visual / Animation Explanation",
#                     "description": "See concept as visual flow",
#                 },
#                 {
#                     "id": "another_video",
#                     "label": "Recommend Another Video",
#                     "description": "Find another lecture",
#                 },
#             ],
#             "suggested_timestamps": suggested_timestamps,
#             "context_available": bool(transcript_context),
#         }

#     elif step == "select_remediation":
#         remediation_type = user_response or "quiz"
#         try:
#             chunks = vector_store.query_relevant_chunks(
#                 question=f"Explain '{topic_name}'.", lecture_id=lec_id, top_k=8
#             )
#         except Exception:
#             chunks = []

#         if not chunks:
#             return {"step": "error", "message": "No transcript chunks found."}

#         transcript_context = build_transcript_context(chunks)

#         if remediation_type == "quiz":
#             try:
#                 quiz_questions = quiz_generator.generate_adaptive_quiz(
#                     explanation_text="Generate quiz from current lecture topic.",
#                     topic=topic_name,
#                     difficulty=(
#                         req.user_response
#                         if req.user_response in {"beginner", "medium", "advanced"}
#                         else "medium"
#                     ),
#                     transcript_context=transcript_context,
#                     num_questions=5,
#                 )
#             except Exception as e:
#                 print(f"[Quiz] Error: {e}")
#                 quiz_questions = []

#             return {
#                 "step": "quiz",
#                 "topic": topic_name,
#                 "quiz_questions": quiz_questions,
#                 "quiz_threshold": QUIZ_PASS_THRESHOLD,
#                 "message": f"Quiz questions for '{topic_name}'.",
#             }

#         elif remediation_type == "real_life":
#             real_life = generator.generate_explanation(
#                 question=f"Give a real-life practical example of '{topic_name}'.",
#                 context_chunks=chunks,
#                 level="medium",
#             )
#             return {"step": "real_life", "topic": topic_name, "content": real_life}

#         elif remediation_type == "animation":
#             visual = generator.generate_explanation(
#                 question=f"Create a step-by-step visual animation storyboard for '{topic_name}'.",
#                 context_chunks=chunks,
#                 level="medium",
#             )
#             return {"step": "animation", "topic": topic_name, "content": visual}

#         elif remediation_type == "another_video":
#             related = []
#             topic_words = [w.lower() for w in topic_name.split() if len(w) > 3]
#             for candidate in MOCK_LECTURES:
#                 if candidate["id"] == lec_id:
#                     continue
#                 if any(word in candidate["title"].lower() for word in topic_words):
#                     related.append(
#                         {
#                             "lecture_id": candidate["id"],
#                             "title": candidate["title"],
#                             "duration": candidate.get("duration", ""),
#                             "link": f"/student/session?play={candidate['id']}&t=0",
#                         }
#                     )
#             return {
#                 "step": "another_video",
#                 "topic": topic_name,
#                 "recommended_videos": related,
#             }

#     elif step == "submit_quiz":
#         if req.quiz_score is None and req.quiz_passed is None:
#             raise HTTPException(
#                 status_code=400, detail="quiz_score or quiz_passed is required."
#             )

#         score = (
#             int(req.quiz_score)
#             if req.quiz_score is not None
#             else (QUIZ_PASS_THRESHOLD if req.quiz_passed else 0)
#         )
#         score = max(0, min(100, score))
#         passed = score >= QUIZ_PASS_THRESHOLD

#         lecture_record = get_published_lecture(lec_id, db)
#         total_questions = 5
#         correct_answers = max(
#             0, min(total_questions, round(score * total_questions / 100))
#         )
#         quiz_attempt = persist_quiz_attempt(
#             current_student=current_student,
#             lecture=lecture_record,
#             difficulty="medium",
#             total_questions=total_questions,
#             correct_answers=correct_answers,
#             answers={"source": "help_center", "reported_score": score},
#             db=db,
#             score_override=score,
#         )
#         db.commit()

#         state["quiz_attempts"] += 1
#         state["quiz_score"] = score
#         state["quiz_passed"] = passed

#         if passed:
#             state["understood_concepts"].append(state["course_topic"])
#         else:
#             state["struggled_concepts"].append(state["course_topic"])

#         SESSIONS_STORE[lec_id] = dict(state)
#         return {
#             "step": "passed" if passed else "failed",
#             "passed": passed,
#             "score": score,
#             "quiz_attempt_id": str(quiz_attempt.id),
#             "persisted": True,
#             "threshold": QUIZ_PASS_THRESHOLD,
#             "message": f"Quiz {'passed' if passed else 'not passed'}! Score: {score}%.",
#         }

#     raise HTTPException(status_code=400, detail="Invalid flow step.")


# # ============================================================
# # ASK AI
# # ============================================================


# @router.post("/ask-ai")
# def ask_ai_explanation(
#     req: AskAIRequest,
#     current_student: User = Depends(get_current_student),
#     db: Session = Depends(get_db),
# ):
#     get_published_lecture(req.lecture_id, db)

#     try:
#         chunks = vector_store.query_relevant_chunks(
#             question=req.question, lecture_id=req.lecture_id, top_k=5
#         )
#         if not chunks:
#             return {
#                 "status": "success",
#                 "explanation": "No transcript context found. Please ensure lecture is indexed.",
#                 "level": req.level,
#                 "suggested_timestamps": [],
#             }

#         explanation = generator.generate_explanation(
#             question=req.question, context_chunks=chunks, level=req.level
#         )
#         suggested_timestamps = [
#             {
#                 "start_time": chunk["start_time"],
#                 "end_time": chunk["end_time"],
#                 "text": chunk["text"],
#             }
#             for chunk in chunks
#         ]

#         return {
#             "status": "success",
#             "explanation": explanation,
#             "level": req.level,
#             "suggested_timestamps": suggested_timestamps,
#         }
#     except Exception as e:
#         print(f"[Gemini] ask-ai error: {e}")
#         return {
#             "status": "error",
#             "explanation": "Gemini could not answer question. Check API Key.",
#             "level": req.level,
#             "suggested_timestamps": [],
#         }


# # ============================================================
# # DYNAMIC QUIZ GENERATION
# # ============================================================


# @router.post("/generate-quiz")
# def generate_quiz(
#     req: GenerateQuizRequest,
#     current_student: User = Depends(get_current_student),
#     db: Session = Depends(get_db),
# ):
#     if req.lecture_id:
#         get_published_lecture(req.lecture_id, db)

#     try:
#         level = req.level or "medium"
#         transcript_context = ""

#         if req.lecture_id:
#             chunks = vector_store.query_relevant_chunks(
#                 question=req.topic, lecture_id=req.lecture_id, top_k=10
#             )
#             transcript_context = build_transcript_context(chunks)

#         questions = quiz_generator.generate_adaptive_quiz(
#             explanation_text=req.explanation_text,
#             topic=req.topic,
#             difficulty=level,
#             transcript_context=transcript_context,
#             num_questions=5,
#         )

#         return {
#             "status": "success",
#             "topic": req.topic,
#             "questions": questions,
#             "quiz_threshold": QUIZ_PASS_THRESHOLD,
#         }
#     except Exception as e:
#         print(f"[Quiz] generate-quiz error: {e}")
#         return {
#             "status": "error",
#             "message": f"Quiz generation failed: {str(e)}",
#             "questions": [],
#             "quiz_threshold": QUIZ_PASS_THRESHOLD,
#         }


# # ============================================================
# # VIDEO COMPLETION + END-OF-VIDEO QUIZ
# # ============================================================


# @router.post("/lecture/{lecture_id}/complete")
# def complete_lecture(
#     lecture_id: str,
#     difficulty: str = "medium",
#     current_student: User = Depends(get_current_student),
#     db: Session = Depends(get_db),
# ):
#     student_data = get_student_data(current_student)
#     refresh_student_lectures(student_data, db)
#     MOCK_LECTURES = student_data["lectures"]
#     FINAL_VIDEO_QUIZZES = student_data["final_video_quizzes"]
#     SESSIONS_STORE = student_data["sessions"]
#     TRANSCRIPTS_STORE = student_data["transcripts"]
#     lecture = next((l for l in MOCK_LECTURES if l["id"] == lecture_id), None)
#     if not lecture:
#         raise HTTPException(status_code=404, detail="Lecture not found.")
#     lecture_record = get_published_lecture(lecture_id, db)
#     get_or_create_persistent_session(current_student, lecture_record, db)

#     if difficulty not in {"beginner", "medium", "advanced"}:
#         difficulty = "medium"

#     existing_quiz = FINAL_VIDEO_QUIZZES.get(lecture_id)
#     if existing_quiz:
#         state = get_or_create_session(
#             lecture_id, student_data, current_student.full_name
#         )
#         state["completion_percentage"] = 100.0
#         SESSIONS_STORE[lecture_id] = dict(state)
#         mark_persistent_session_completed(current_student, lecture_record, db)
#         return {
#             "status": "success",
#             "lecture_id": lecture_id,
#             "lecture_title": lecture["title"],
#             "completed": True,
#             "already_generated": True,
#             "quiz_available": True,
#             "final_video_quiz": existing_quiz,
#         }

#     state = get_or_create_session(lecture_id, student_data, current_student.full_name)
#     state["completion_percentage"] = 100.0
#     SESSIONS_STORE[lecture_id] = dict(state)

#     transcript_entries = TRANSCRIPTS_STORE.get(lecture_id, [])
#     if not transcript_entries:
#         raise HTTPException(
#             status_code=404, detail="No transcript found for this lecture."
#         )

#     representative_entries = select_representative_chunks(
#         transcript_entries, max_chunks=60
#     )
#     full_lecture_text = build_transcript_context(
#         representative_entries, max_chars=30000
#     )

#     try:
#         questions = quiz_generator.generate_video_quiz(
#             video_title=lecture["title"],
#             transcript_context=full_lecture_text,
#             difficulty=difficulty,
#             num_questions=quiz_generator.WHOLE_VIDEO_TARGET_QUESTIONS,
#         )
#     except Exception as e:
#         raise HTTPException(
#             status_code=500, detail=f"Whole-video quiz generation failed: {e}"
#         )

#     if not questions or len(questions) < quiz_generator.WHOLE_VIDEO_MIN_QUESTIONS:
#         raise HTTPException(
#             status_code=500,
#             detail=f"Quiz generated only {len(questions)} questions. At least {quiz_generator.WHOLE_VIDEO_MIN_QUESTIONS} are required.",
#         )

#     questions = questions[:25]
#     FINAL_VIDEO_QUIZZES[lecture_id] = {
#         "quiz_type": "full_video",
#         "difficulty": difficulty,
#         "question_count": len(questions),
#         "questions": questions,
#         "quiz_threshold": QUIZ_PASS_THRESHOLD,
#     }
#     mark_persistent_session_completed(current_student, lecture_record, db)

#     return {
#         "status": "success",
#         "lecture_id": lecture_id,
#         "lecture_title": lecture["title"],
#         "completed": True,
#         "already_generated": False,
#         "quiz_available": True,
#         "final_video_quiz": FINAL_VIDEO_QUIZZES[lecture_id],
#     }


# # ============================================================
# # STORED FINAL VIDEO QUIZ
# # ============================================================


# @router.get("/lecture/{lecture_id}/final-quiz")
# def get_final_video_quiz(
#     lecture_id: str,
#     difficulty: str = "medium",
#     current_student: User = Depends(get_current_student),
#     db: Session = Depends(get_db),
# ):
#     student_data = get_student_data(current_student)
#     refresh_student_lectures(student_data, db)
#     MOCK_LECTURES = student_data["lectures"]
#     FINAL_VIDEO_QUIZZES = student_data["final_video_quizzes"]
#     lecture = next((l for l in MOCK_LECTURES if l["id"] == lecture_id), None)
#     if not lecture:
#         raise HTTPException(status_code=404, detail="Lecture not found.")

#     quiz = FINAL_VIDEO_QUIZZES.get(lecture_id)
#     if not quiz:
#         return {
#             "status": "not_ready",
#             "lecture_id": lecture_id,
#             "lecture_title": lecture["title"],
#             "quiz_available": False,
#             "questions": [],
#             "question_count": 0,
#             "message": "Whole-video quiz has not been generated yet. Complete the video first.",
#         }

#     return {
#         "status": "success",
#         "lecture_id": lecture_id,
#         "lecture_title": lecture["title"],
#         "quiz_available": True,
#         **quiz,
#     }


# class LectureFeedbackCreate(BaseModel):
#     understanding: int
#     difficulty: int
#     clarity: int
#     pace: int
#     difficult_part: str
#     additional_support: str
#     suggestion: Optional[str] = None

# @router.post("/lecture/{lecture_id}/feedback")
# async def submit_lecture_feedback(
#     lecture_id: str,
#     feedback: LectureFeedbackCreate,
#     current_student: User = Depends(get_current_student),
#     db: Session = Depends(get_db)
# ):
    
#     student_data = get_student_data(current_student)
#     MOCK_LECTURES = student_data["lectures"]
#     lecture_dict = next((l for l in MOCK_LECTURES if l["id"] == lecture_id), None)
#     print("SUBMIT FEEDBACK lecture_id:", lecture_id)
#     print("MOCK LECTURE DICT:", lecture_dict)
    
#     # Try to find corresponding DB lecture
#     db_lecture = get_published_lecture(lecture_id, db)
#     print("DB LECTURE FROM GET PUBLISHED:", db_lecture)

#     # Proceed to check DB if not in mock store

#     # Try to find corresponding DB lecture
#     db_lecture = get_published_lecture(lecture_id, db)
    
#     # If not found by UUID, try to find by title from MOCK_LECTURES
#     if not db_lecture:
#         db_lecture = db.query(Lecture).filter(Lecture.title == (lecture_dict.get("title", "") if lecture_dict else "")).first()
        
#     if not db_lecture:
#         return {"message": "Lecture not in DB, skipping feedback"}

#     existing = db.query(LectureFeedback).filter(
#         LectureFeedback.lecture_id == db_lecture.id,
#         LectureFeedback.student_id == current_student.id
#     ).first()

#     if existing:
#         raise HTTPException(status_code=400, detail="Feedback already submitted for this lecture")

#     new_feedback = LectureFeedback(
#         lecture_id=db_lecture.id,
#         student_id=current_student.id,
#         understanding=feedback.understanding,
#         difficulty=feedback.difficulty,
#         clarity=feedback.clarity,
#         pace=feedback.pace,
#         difficult_part=feedback.difficult_part,
#         additional_support=feedback.additional_support,
#         suggestion=feedback.suggestion
#     )
#     db.add(new_feedback)
#     db.commit()
#     return {"message": "Feedback submitted successfully"}

# @router.get("/lecture/{lecture_id}/feedback")
# async def get_lecture_feedback(
#     lecture_id: str,
#     current_student: User = Depends(get_current_student),
#     db: Session = Depends(get_db)
# ):
    
#     student_data = get_student_data(current_student)
#     MOCK_LECTURES = student_data["lectures"]
#     lecture_dict = next((l for l in MOCK_LECTURES if l["id"] == lecture_id), None)
#     print("SUBMIT FEEDBACK lecture_id:", lecture_id)
#     print("MOCK LECTURE DICT:", lecture_dict)
    
#     # Try to find corresponding DB lecture
#     db_lecture = get_published_lecture(lecture_id, db)
#     print("DB LECTURE FROM GET PUBLISHED:", db_lecture)

    
#     db_lecture = get_published_lecture(lecture_id, db)
#     if not db_lecture and lecture_dict:
#         db_lecture = db.query(Lecture).filter(Lecture.title == (lecture_dict.get("title", "") if lecture_dict else "")).first()
        
#     if not db_lecture:
#         return None

#     existing = db.query(LectureFeedback).filter(
#         LectureFeedback.lecture_id == db_lecture.id,
#         LectureFeedback.student_id == current_student.id
#     ).first()

#     if not existing:
#         return None

#     return {
#         "understanding": existing.understanding,
#         "difficulty": existing.difficulty,
#         "clarity": existing.clarity,
#         "pace": existing.pace,
#         "difficult_part": existing.difficult_part,
#         "additional_support": existing.additional_support,
#         "suggestion": existing.suggestion
#     }


from pyexpat import features, model

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from uuid import UUID
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import re
from app.dependencies import get_current_student
from app.database import get_db
from app.routers.faculty_store import LECTURES
from app.models import (
    User,
    StudentProfile,
    Lecture,
    LectureTranscript,
    LectureStudyMaterial,
    StudentSession,
    LearningEvent,
    QuizAttempt,
    LectureFeedback,
)
import urllib.request
import json
import os
import uuid
from datetime import datetime, timezone, timedelta


from youtube_transcript_api import YouTubeTranscriptApi

from app.services.rag import vector_store, generator, quiz_generator

from app.services.rag.chunker import chunk_transcript
from app.services.rag.vector_store import index_lecture_chunks


router = APIRouter()


# ============================================================
# PER-STUDENT SESSION STORES
# ============================================================

# Each authenticated user's data is kept in a separate namespace.
# These stores are in-memory for Stage L. PostgreSQL persistence for
# sessions/events/quiz attempts is implemented in Stage O, after Stage N
# creates real faculty-owned Lecture UUIDs.
STUDENT_DATA = {}


def get_student_data(current_student: User) -> Dict[str, Any]:
    student_key = str(current_student.id)
    if student_key not in STUDENT_DATA:
        STUDENT_DATA[student_key] = {
            "sessions": {},
            "watch_history": {},
            "active_session": {},
            "lectures": [],
            "summaries": {},
            "transcripts": {},
            "final_video_quizzes": {},
        }
    return STUDENT_DATA[student_key]


# ============================================================
# POSTGRESQL PUBLISHED LECTURE ACCESS (STAGE N)
# ============================================================


def _duration_label(seconds):
    total = int(seconds or 0)
    return f"{total // 60:02d}:{total % 60:02d}"


def _transcript_entries(transcript):
    if transcript is None:
        return []
    try:
        value = json.loads(transcript.transcript_text)
        if isinstance(value, list):
            return value
    except (TypeError, json.JSONDecodeError):
        pass
    text_value = transcript.transcript_text or ""
    if not text_value.strip():
        return []
    return [
        {
            "timestamp": "00:00",
            "seconds": 0,
            "end_time": "00:00",
            "text": text_value,
            "speaker": "Speaker",
        }
    ]


def _student_lecture_payload(lecture):
    transcript = lecture.transcript
    topics = [mapping.topic.name for mapping in lecture.lecture_topics]
    subjects = [mapping.subject.name for mapping in lecture.lecture_subjects]
    courses = [mapping.course.name for mapping in lecture.lecture_courses]
    from app.routers.faculty_store import LECTURES
    matching_lec = next((l for l in LECTURES if str(l.get("id")) == str(lecture.id)), None)
    prereqs = []
    prereq_topic = None
    prereq_lecture_id = None
    prereq_lecture_title = None
    if matching_lec:
        prereq_lecture_id = matching_lec.get("prerequisite_lecture_id")
        prereq_lecture_title = matching_lec.get("prerequisite_lecture_title")
        prereqs = matching_lec.get("prerequisites") or ([prereq_lecture_title] if prereq_lecture_title else ([matching_lec.get("prerequisite_topic")] if matching_lec.get("prerequisite_topic") else []))
        prereq_topic = prereq_lecture_title or matching_lec.get("prerequisite_topic") or (prereqs[0] if prereqs else None)
    return {
        "id": str(lecture.id),
        "title": lecture.title,
        "description": lecture.description or "",
        "duration": _duration_label(lecture.duration_seconds),
        "duration_seconds": lecture.duration_seconds or 0,
        "video_url": lecture.youtube_url,
        "video_type": lecture.video_source,
        "youtube_id": lecture.youtube_video_id,
        "category": subjects[0] if subjects else (courses[0] if courses else "General"),
        "courses": courses,
        "subjects": subjects,
        "topics": topics,
        "prerequisites": prereqs,
        "prerequisite_topic": prereq_topic,
        "prerequisite_lecture_id": prereq_lecture_id,
        "prerequisite_lecture_title": prereq_lecture_title,
        "concepts": topics,
        "thumbnail": lecture.thumbnail_url,
        "transcript_language": transcript.language if transcript else None,
        "status": lecture.status,
    }


def refresh_student_lectures(student_data: Dict[str, Any], db: Session):
    """Refresh the compatibility cache from published PostgreSQL lectures only."""
    records = (
        db.query(Lecture)
        .filter(Lecture.status == "published")
        .order_by(Lecture.published_at.desc(), Lecture.created_at.desc())
        .all()
    )
    payloads = [_student_lecture_payload(item) for item in records]
    
    existing_ids = {p["id"] for p in payloads}
    from app.routers.faculty_store import LECTURES
    for lec in LECTURES:
        lec_id = str(lec.get("id"))
        if lec_id not in existing_ids and lec.get("status") in ["READY", "published", None]:
            existing_ids.add(lec_id)
            prereq_lecture_id = lec.get("prerequisite_lecture_id")
            prereq_lecture_title = lec.get("prerequisite_lecture_title")
            prereqs = lec.get("prerequisites") or ([prereq_lecture_title] if prereq_lecture_title else ([lec.get("prerequisite_topic")] if lec.get("prerequisite_topic") else []))
            prereq_topic = prereq_lecture_title or lec.get("prerequisite_topic") or (prereqs[0] if prereqs else None)
            payloads.append({
                "id": lec.get("id"),
                "title": lec.get("title") or "Untitled Lecture",
                "description": lec.get("description") or "",
                "faculty_id": lec.get("faculty_id"),
                "faculty_name": lec.get("faculty_name") or lec.get("instructor") or "Unknown Teacher",
                "subject": lec.get("subject"),
                "category": lec.get("category"),
                "subcategory": lec.get("subcategory"),
                "prerequisites": prereqs,
                "prerequisite_topic": prereq_topic,
                "prerequisite_lecture_id": prereq_lecture_id,
                "prerequisite_lecture_title": prereq_lecture_title,
                "thumbnail_url": lec.get("thumbnail"),
                "duration": lec.get("duration") or "Unknown",
                "source": lec.get("source_type", "local"),
                "video_available": True,
                "transcript_available": True,
                "youtube_id": lec.get("youtube_id"),
                "video_url": f"/api/faculty/lectures/{lec.get('id')}/video" if lec.get("source_type") == "local" else lec.get("video_url"),
                "youtube_url": f"/api/faculty/lectures/{lec.get('id')}/video" if lec.get("source_type") == "local" else lec.get("video_url"),
                "duration_seconds": 60
            })
            
    student_data["lectures"] = payloads
    student_data["transcripts"] = {
        str(item.id): _transcript_entries(item.transcript)
        for item in records
        if item.transcript is not None
    }
    # Also inject json transcripts
    from app.routers.faculty_store import TRANSCRIPTS
    for lec_id, ts in TRANSCRIPTS.items():
        if ts:
            student_data["transcripts"][str(lec_id)] = [{"timestamp": t.get("timestamp", "00:00"), "text": t.get("text", "")} for t in ts]
            
    return payloads



def get_published_lecture(lecture_id: str, db: Session):
    try:
        parsed_id = UUID(str(lecture_id))
    except (TypeError, ValueError, AttributeError):
        return None
    lecture = (
        db.query(Lecture)
        .filter(Lecture.id == parsed_id, Lecture.status == "published")
        .first()
    )
    return lecture


def get_student_profile(current_student: User, db: Session) -> StudentProfile:
    profile = (
        db.query(StudentProfile)
        .filter(StudentProfile.user_id == current_student.id)
        .first()
    )
    if profile is None:
        raise HTTPException(status_code=409, detail="Student profile is not configured")
    return profile


def get_or_create_persistent_session(
    current_student: User,
    lecture: Lecture,
    db: Session,
) -> StudentSession:
    """Return this student's active DB session for the lecture, creating it if needed."""
    profile = get_student_profile(current_student, db)
    active_rows = (
        db.query(StudentSession)
        .filter(
            StudentSession.student_id == profile.id,
            StudentSession.status == "active",
        )
        .order_by(StudentSession.started_at.desc())
        .all()
    )
    selected = None
    for row in active_rows:
        if row.lecture_id == lecture.id and selected is None:
            selected = row
        elif row.lecture_id != lecture.id:
            row.status = "abandoned"
            row.ended_at = datetime.now(timezone.utc)

    if selected is None:
        selected = StudentSession(
            student_id=profile.id,
            lecture_id=lecture.id,
            status="active",
            total_watch_time_seconds=0,
        )
        db.add(selected)
    db.flush()
    return selected


def restore_session_state(
    db: Session,
    session_record: StudentSession,
    lecture_payload: dict,
    student_name: str,
) -> dict:
    """Rebuild the existing UI session state from persisted learning events."""
    state = create_empty_session(lecture_payload["id"], lecture_payload, student_name)
    state["db_session_id"] = str(session_record.id)
    state["total_watch_time_seconds"] = session_record.total_watch_time_seconds or 0
    events = (
        db.query(LearningEvent)
        .filter(LearningEvent.session_id == session_record.id)
        .order_by(LearningEvent.created_at.asc())
        .all()
    )
    for event in events:
        data = event.event_data or {}
        event_type = event.event_type
        if event_type == "play":
            state["play_events"] += 1
        elif event_type == "pause":
            state["paused"] += 1
        elif event_type == "rewind":
            state["rewound"] += 1
            start = data.get("current_timestamp", data.get("rewind_to"))
            end = data.get("previous_timestamp", data.get("rewind_from"))
            if start is not None and end is not None:
                state["repeated_timestamps"].append(
                    f"{format_seconds_to_timestamp(float(start))}-"
                    f"{format_seconds_to_timestamp(float(end))}"
                )
        elif event_type in {"seek", "forward_seek"}:
            state["seeked"] += 1
            if event_type == "forward_seek":
                state["forward_seeks"] += 1
        elif event_type == "speed_change":
            state["speed_changes"] += 1
            state.setdefault("speed_history", []).append(
                {
                    "previous_speed": data.get("previous_speed"),
                    "new_speed": data.get("new_speed"),
                    "timestamp": data.get("timestamp", event.video_timestamp_seconds),
                }
            )
        elif event_type == "manual_confusion":
            state["manual_confusion"] += 1
            state["confusion_timestamps"].append(
                format_seconds_to_timestamp(event.video_timestamp_seconds)
            )
        state["watch_time"] = max(
            state["watch_time"], float(event.video_timestamp_seconds)
        )
        state["completion_percentage"] = max(
            state["completion_percentage"],
            float(data.get("watch_duration") or 0),
        )
        if data.get("confusion_score") is not None:
            state["confusion_score"] = int(data["confusion_score"])
            state["confusion_status"] = data.get(
                "confusion_status", state["confusion_status"]
            )

    return state


def hydrate_student_sessions(
    current_student: User,
    student_data: Dict[str, Any],
    db: Session,
) -> None:
    """Load this student's latest session per published lecture into the UI cache."""
    profile = get_student_profile(current_student, db)
    lectures = {item["id"]: item for item in student_data.get("lectures", [])}
    rows = (
        db.query(StudentSession)
        .filter(StudentSession.student_id == profile.id)
        .order_by(StudentSession.started_at.desc())
        .all()
    )
    latest_by_lecture = {}
    for row in rows:
        key = str(row.lecture_id)
        if key not in latest_by_lecture and key in lectures:
            latest_by_lecture[key] = row

    sessions = student_data["sessions"]
    sessions.clear()
    student_data["watch_history"].clear()
    student_data["active_session"].clear()
    for lecture_id, row in latest_by_lecture.items():
        state = restore_session_state(
            db, row, lectures[lecture_id], current_student.full_name
        )
        attempts = (
            db.query(QuizAttempt)
            .filter(
                QuizAttempt.student_id == profile.id,
                QuizAttempt.lecture_id == row.lecture_id,
            )
            .order_by(QuizAttempt.attempted_at.desc())
            .all()
        )
        if attempts:
            state["quiz_attempts"] = len(attempts)
            state["quiz_score"] = attempts[0].score
            state["quiz_passed"] = attempts[0].passed
        sessions[lecture_id] = state
        student_data["watch_history"][lecture_id] = {
            "id": lecture_id,
            "title": lectures[lecture_id]["title"],
            "progress": int(state.get("completion_percentage", 0)),
            "last_watched": (
                row.started_at.isoformat() if row.started_at else "Previously watched"
            ),
        }
        if row.status == "active":
            student_data["active_session"].clear()
            student_data["active_session"].update(state)


def mark_persistent_session_completed(
    current_student: User,
    lecture: Lecture,
    db: Session,
) -> None:
    profile = get_student_profile(current_student, db)
    session_record = (
        db.query(StudentSession)
        .filter(
            StudentSession.student_id == profile.id,
            StudentSession.lecture_id == lecture.id,
            StudentSession.status == "active",
        )
        .order_by(StudentSession.started_at.desc())
        .first()
    )
    if session_record is not None:
        session_record.status = "completed"
        session_record.ended_at = datetime.now(timezone.utc)
        db.commit()


def persist_quiz_attempt(
    current_student: User,
    lecture: Lecture,
    difficulty: str,
    total_questions: int,
    correct_answers: int,
    answers: Any,
    db: Session,
    score_override: Optional[int] = None,
    passed_override: Optional[bool] = None,
) -> QuizAttempt:
    profile = get_student_profile(current_student, db)
    score_value = (
        max(0, min(100, int(score_override)))
        if score_override is not None
        else round((correct_answers / total_questions) * 100)
    )
    passed_value = (
        bool(passed_override)
        if passed_override is not None
        else (score_value >= QUIZ_PASS_THRESHOLD)
    )
    attempt = QuizAttempt(
        student_id=profile.id,
        lecture_id=lecture.id,
        difficulty=difficulty,
        total_questions=total_questions,
        correct_answers=correct_answers,
        score=score_value,
        passed=passed_value,
        answers=answers,
    )
    db.add(attempt)
    db.flush()
    return attempt


# ============================================================
# QUIZ CONFIGURATION
# ============================================================

# Student must score this percentage or higher to pass.
QUIZ_PASS_THRESHOLD = 70


# ============================================================
# LAZY LOAD TRAINED XGBOOST CONFUSION MODEL
# ============================================================

MODEL_PATH = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        "../../cognitrace_confusion_xgboost.pkl"
    )
)

xgb_confusion_model = None
xgb_model_loaded = False


def get_xgboost_model():
    import joblib
    global xgb_confusion_model, xgb_model_loaded

    if not xgb_model_loaded:
        try:
            xgb_confusion_model = joblib.load(MODEL_PATH)
            print("[ML Engine] Successfully loaded XGBoost model")
        except Exception as e:
            print(f"[ML Engine] Warning: Could not load trained model: {e}")
            xgb_confusion_model = None

        xgb_model_loaded = True

    return xgb_confusion_model


def evaluate_xgboost_confusion(
    pauses_30s: int,
    resumes_30s: int,
    rewinds_30s: int,
    seeks_30s: int,
    speed: float,
    completion_pct: float,
) -> Dict[str, Any]:
    """
    Evaluates potential student cognitive friction using the trained XGBoost model
    strictly on the latest 30-second interaction window counts.
    Features: ['Pause_Count', 'Resume_Count', 'Rewind_Count', 'Forward_Seek_Count', 'Playback_Speed_Num', 'Completion_Num']
    """
    model = get_xgboost_model()

    if model is None:
        # Fallback rule-based heuristic if model file is missing
        is_confused = (rewinds_30s >= 2) or (pauses_30s >= 2 and speed <= 1.0)
        c_score = 85 if is_confused else 15
        return {
            "confusion_score": c_score,
            "confusion_status": (
                "High Confusion"
                if c_score >= 70
                else ("Medium Confusion" if c_score >= 35 else "Low Confusion")
            ),
            "prob_confused": 0.85 if is_confused else 0.15,
        }
    import numpy as np
    try:
        # Prepare feature vector matching the exact order used during model training
        features = np.array(
            [
                [
                    int(pauses_30s),
                    int(resumes_30s),
                    int(rewinds_30s),
                    int(seeks_30s),
                    float(speed),
                    float(
                        completion_pct / 100.0
                    ),  # Convert percentage to float 0.0 - 1.0
                ]
            ]
        )

        # Predict Class 1 (Confused) Probability
        # prob_confused = float(xgb_confusion_model.predict_proba(features)[0][1])
        if 1 not in model.classes_:
            raise ValueError(
                f"Expected confusion class 1; found {model.classes_}"
            )

        class_index = list(model.classes_).index(1)

        prob_confused = float(
            model.predict_proba(features)[0][class_index]
        )
        c_score = int(round(prob_confused * 100))

        if c_score >= 70:
            status = "High Confusion"
        elif c_score >= 35:
            status = "Medium Confusion"
        else:
            status = "Low Confusion"

        return {
            "confusion_score": c_score,
            "confusion_status": status,
            "prob_confused": round(prob_confused, 4),
        }
    except Exception as err:
        print(f"[ML Engine] Inference Error: {err}")
        return {
            "confusion_score": None,
            "confusion_status": "Inference Error",
            "prob_confused": None,
            "error": str(err),
        }


# ============================================================
# PYDANTIC MODELS
# ============================================================


class SessionEventLog(BaseModel):
    lecture_id: str
    event_type: str
    timestamp: float
    playback_speed: float
    watch_duration: float

    rewind_from: Optional[float] = None
    rewind_to: Optional[float] = None

    previous_timestamp: Optional[float] = None
    current_timestamp: Optional[float] = None

    seconds_delta: Optional[float] = None
    event_data: Optional[Dict[str, Any]] = None
    previous_speed: Optional[float] = None
    new_speed: Optional[float] = None

    # Latest 30-Second Window Metrics
    pauses_30s: Optional[int] = None
    resumes_30s: Optional[int] = None
    rewinds_30s: Optional[int] = None
    seeks_30s: Optional[int] = None


class SearchQuery(BaseModel):
    query: str


class TelemetryLog(BaseModel):
    paused: int
    rewound: int
    seeked: int
    speed_changes: int
    watch_time: float
    repeated_timestamps: List[str]
    completion_percentage: float

    # Latest 30-second window metrics from frontend player
    pauses_30s: Optional[int] = 0
    resumes_30s: Optional[int] = 0
    rewinds_30s: Optional[int] = 0
    seeks_30s: Optional[int] = 0
    current_speed: Optional[float] = 1.0


class HelpCenterRequest(BaseModel):
    step: str
    user_response: Optional[str] = None
    knows_prereq: Optional[bool] = None
    lecture_id: Optional[str] = None

    quiz_passed: Optional[bool] = None
    quiz_score: Optional[int] = None



class AskAIRequest(BaseModel):
    question: str
    lecture_id: str
    level: Optional[str] = "medium"

    # New optional fields for AI Help Center chat
    teaching_mode: Optional[str] = "direct"
    conversation_history: Optional[List[Dict[str, Any]]] = None
    playback_position: Optional[float] = None



class GenerateQuizRequest(BaseModel):
    explanation_text: str
    topic: str
    level: Optional[str] = "medium"
    lecture_id: Optional[str] = None


class QuizAttemptSubmission(BaseModel):
    lecture_id: str
    difficulty: str = "medium"
    total_questions: int
    correct_answers: int
    score: Optional[int] = None
    passed: Optional[bool] = None
    answers: Optional[Any] = None


class YouTubeLectureRequest(BaseModel):
    url: str


# ============================================================
# YOUTUBE HELPERS
# ============================================================


def extract_youtube_video_id(url: str) -> Optional[str]:
    pattern = (
        r"(?:https?://)?"
        r"(?:www\.)?"
        r"(?:youtube\.com/(?:[^/]+/.+/|"
        r"(?:v|e(?:mbed)?)/|.*[?&]v=)|"
        r"youtu\.be/)"
        r'([^"&?/\s]{11})'
    )
    match = re.search(pattern, url)
    if match:
        return match.group(1)
    return None


def get_youtube_metadata(video_id: str):
    oembed_url = (
        "https://www.youtube.com/oembed?"
        f"url=https://www.youtube.com/watch?v={video_id}"
        "&format=json"
    )
    try:
        req = urllib.request.Request(oembed_url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
            return {
                "title": data.get("title", f"YouTube Video {video_id}"),
                "author": data.get("author_name", "Unknown Creator"),
                "thumbnail": data.get(
                    "thumbnail_url", f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
                ),
            }
    except Exception:
        return {
            "title": f"YouTube Video {video_id}",
            "author": "Unknown Creator",
            "thumbnail": f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg",
        }


def format_seconds_to_timestamp(seconds: float) -> str:
    total_seconds = int(seconds)
    minutes = total_seconds // 60
    secs = total_seconds % 60
    return f"{minutes:02d}:{secs:02d}"


# ============================================================
# SESSION HELPERS
# ============================================================


def create_empty_session(lecture_id: str, lecture: dict, student_name: str):
    return {
        "student_name": student_name,
        "lecture_id": lecture_id,
        "lecture_title": lecture["title"],
        "course_topic": (
            lecture["title"].split(":", 1)[1].strip()
            if ":" in lecture["title"]
            else lecture["title"]
        ),
        "paused": 0,
        "rewound": 0,
        "seeked": 0,
        "forward_seeks": 0,
        "speed_changes": 0,
        "watch_time": 0.0,
        "repeated_timestamps": [],
        "completion_percentage": 0.0,
        "quiz_attempts": 0,
        "quiz_score": 0,
        "quiz_passed": False,
        "confusion_score": 0,
        "confusion_status": "Low Confusion",
        "struggled_concepts": [],
        "understood_concepts": [],
        "manual_confusion": 0,
        "confusion_timestamps": [],
        "play_events": 0,
    }


def get_or_create_session(
    lecture_id: str, student_data: Dict[str, Any], student_name: str
):
    lectures = student_data["lectures"]
    sessions = student_data["sessions"]
    lecture = next((l for l in lectures if l["id"] == lecture_id), None)
    if not lecture:
        raise HTTPException(status_code=404, detail="Lecture not found")

    if lecture_id not in sessions:
        sessions[lecture_id] = create_empty_session(lecture_id, lecture, student_name)

    return sessions[lecture_id]


# ============================================================
# DASHBOARD
# ============================================================


@router.get("/dashboard")
def get_student_dashboard(
    current_student: User = Depends(get_current_student),
    db: Session = Depends(get_db),
):

    student_data = get_student_data(current_student)
    refresh_student_lectures(student_data, db)
    hydrate_student_sessions(current_student, student_data, db)
    SESSIONS_STORE = student_data["sessions"]
    WATCH_HISTORY = student_data["watch_history"]
    MOCK_LECTURES = student_data["lectures"]
    completed_count = sum(1 for s in SESSIONS_STORE.values() if s.get("quiz_passed"))

    if not SESSIONS_STORE:
        overall_prog = 0
        avg_engagement = 0
        weekly_hours = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
    else:
        total_lectures = len(MOCK_LECTURES)
        overall_prog = (
            int(
                sum(
                    s.get("completion_percentage", 0.0) for s in SESSIONS_STORE.values()
                )
                / total_lectures
            )
            if total_lectures > 0
            else 0
        )
        avg_engagement = int(
            sum(
                max(0, 100 - s.get("confusion_score", 0))
                for s in SESSIONS_STORE.values()
            )
            / len(SESSIONS_STORE)
        )
        total_time = sum(s.get("total_watch_time_seconds", 0.0) for s in SESSIONS_STORE.values())
        weekly_hours = [
            0.0,
            0.0,
            0.0,
            0.0,
            0.0,
            0.0,
            float(round(total_time / 3600.0, 2)),
        ]

    strong = []
    weak = []

    for s in SESSIONS_STORE.values():
        topic = s.get("course_topic", "Concept")
        if s.get("quiz_passed"):
            strong.append(topic)
        elif s.get("quiz_attempts", 0) > 0:
            weak.append(topic)

    recent = []
    for key, val in WATCH_HISTORY.items():
        progress = int(SESSIONS_STORE.get(key, {}).get("completion_percentage", 0))
        recent.append(
            {
                "id": key,
                "title": val["title"],
                "progress": progress,
                "last_watched": val["last_watched"],
            }
        )

    return {
        "student_name": current_student.full_name,
        "overall_progress": overall_prog,
        "weekly_hours": weekly_hours,
        "average_engagement": avg_engagement,
        "completed_lectures": completed_count,
        "total_lectures": len(MOCK_LECTURES),
        "strong_topics": [{"topic": t, "mastery": 90} for t in strong],
        "weak_topics": [{"topic": t, "mastery": 45} for t in weak],
        "recent_activity": recent,
        "recommended_topics": [],
    }


# ============================================================
# LECTURES
# ============================================================



# ============================================================
# LEARNING PORTFOLIO (REAL DATABASE DATA & MONITORING)
# ============================================================


@router.get("/portfolio")
def get_student_portfolio(
    current_student: User = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    student_data = get_student_data(current_student)
    refresh_student_lectures(student_data, db)
    hydrate_student_sessions(current_student, student_data, db)

    SESSIONS_STORE = student_data["sessions"]
    MOCK_LECTURES = student_data["lectures"]

    profile = current_student.student_profile
    if not profile:
        profile = (
            db.query(StudentProfile)
            .filter(StudentProfile.user_id == current_student.id)
            .first()
        )

    # 1. Real Student Identity
    student_id_val = (
        profile.student_id
        if profile and profile.student_id
        else f"STU-{str(current_student.id)[:8].upper()}"
    )

    name_parts = (current_student.full_name or "").strip().split()
    if len(name_parts) >= 2:
        initials = (name_parts[0][0] + name_parts[-1][0]).upper()
    elif len(name_parts) == 1 and name_parts[0]:
        initials = name_parts[0][:2].upper()
    else:
        initials = "ST"

    course_names = []
    for lec in MOCK_LECTURES:
        c_name = lec.get("course_id") or lec.get("course_name")
        if c_name and c_name not in course_names:
            course_names.append(c_name)
    primary_course = course_names[0] if course_names else "Core Curriculum"

    # 2. Real Quiz Attempts from Database
    attempts = []
    if profile:
        attempts = (
            db.query(QuizAttempt)
            .filter(QuizAttempt.student_id == profile.id)
            .order_by(QuizAttempt.attempted_at.asc())
            .all()
        )

    lecture_map = {str(lec.get("id")): lec.get("title") for lec in MOCK_LECTURES}

    recent_tests = []
    daily_dict = {}

    for att in reversed(attempts):
        lec_title = (
            att.lecture.title
            if att.lecture and getattr(att.lecture, "title", None)
            else lecture_map.get(str(att.lecture_id), "Lecture Concept Quiz")
        )
        dt = att.attempted_at
        date_str = dt.strftime("%b %d, %Y") if dt else "Recent"
        time_str = dt.strftime("%I:%M %p") if dt else ""

        recent_tests.append({
            "id": str(att.id),
            "lecture_id": str(att.lecture_id),
            "lecture_title": lec_title,
            "score": att.score,
            "total_questions": att.total_questions,
            "correct_answers": att.correct_answers,
            "passed": att.passed,
            "difficulty": att.difficulty or "medium",
            "attempted_at": dt.isoformat() if dt else None,
            "date": date_str,
            "time": time_str,
        })

    # Group daily, weekly, and monthly monitoring data in chronological order
    weekly_dict = {}
    monthly_dict = {}

    for att in attempts:
        dt = att.attempted_at
        day_key = dt.strftime("%b %d") if dt else "Today"
        day_iso = dt.strftime("%Y-%m-%d") if dt else ""
        if day_key not in daily_dict:
            daily_dict[day_key] = {"scores": [], "date": day_key, "iso_date": day_iso}
        daily_dict[day_key]["scores"].append(att.score)

        if dt:
            start_of_week = dt - timedelta(days=dt.weekday())
            week_key = f"Wk of {start_of_week.strftime('%b %d')}"
            if week_key not in weekly_dict:
                weekly_dict[week_key] = {"scores": [], "date": week_key, "iso_date": start_of_week.strftime("%Y-%m-%d")}
            weekly_dict[week_key]["scores"].append(att.score)

            month_key = dt.strftime("%b %Y")
            if month_key not in monthly_dict:
                monthly_dict[month_key] = {"scores": [], "date": month_key, "iso_date": dt.strftime("%Y-%m-01")}
            monthly_dict[month_key]["scores"].append(att.score)

    def _format_monitoring(source_dict):
        res = []
        for k, val in source_dict.items():
            scores = val["scores"]
            res.append({
                "date": k,
                "iso_date": val.get("iso_date", ""),
                "average_score": int(round(sum(scores) / len(scores))),
                "highest_score": max(scores),
                "lowest_score": min(scores),
                "latest_score": scores[-1],
                "total_tests": len(scores),
            })
        return res

    daily_monitoring = _format_monitoring(daily_dict)
    weekly_monitoring = _format_monitoring(weekly_dict)
    monthly_monitoring = _format_monitoring(monthly_dict)

    # Test summary stats
    total_tests = len(attempts)
    passed_tests = sum(1 for a in attempts if a.passed)
    avg_test_score = (
        int(round(sum(a.score for a in attempts) / total_tests))
        if total_tests > 0
        else 0
    )
    pass_rate = (
        int(round((passed_tests / total_tests) * 100))
        if total_tests > 0
        else 0
    )

    # 3. Overall Knowledge Coverage & Retention
    total_lectures = len(MOCK_LECTURES)
    if not SESSIONS_STORE or total_lectures == 0:
        overall_progress = 0
        avg_engagement = 0
    else:
        overall_progress = int(
            sum(s.get("completion_percentage", 0.0) for s in SESSIONS_STORE.values())
            / total_lectures
        )
        avg_engagement = int(
            sum(
                max(0, 100 - s.get("confusion_score", 0))
                for s in SESSIONS_STORE.values()
            )
            / len(SESSIONS_STORE)
        )

    if total_tests > 0:
        retention_index = int(round(0.6 * avg_test_score + 0.4 * avg_engagement))
    else:
        retention_index = avg_engagement

    # Dynamic Cognitive Profile
    if avg_test_score >= 80 and pass_rate >= 80:
        cognitive_style = "Analytical / Mastery Track"
        cognitive_insight = f"High concept retention demonstrated with a {pass_rate}% quiz success rate across evaluated topics."
    elif avg_test_score >= 60:
        cognitive_style = "Visual / Practical Learner"
        cognitive_insight = f"Demonstrates steady mastery with an average test score of {avg_test_score}%."
    elif total_tests > 0:
        cognitive_style = "Active Recall Explorer"
        cognitive_insight = f"Reviewing targeted concept gaps will help lift your test scores above the passing threshold."
    elif overall_progress > 0:
        cognitive_style = "Visual / Observational Learner"
        cognitive_insight = "Active video watch time logged; take concept checkups to establish baseline retention."
    else:
        cognitive_style = "Diagnostic Stage"
        cognitive_insight = "Your cognitive profile will update automatically as you watch lectures and take quizzes."

    # 4. Subject-level Competency Breakdown
    competency_breakdown = []
    attempts_by_lecture = {}
    for a in attempts:
        attempts_by_lecture[str(a.lecture_id)] = a

    for lec in MOCK_LECTURES:
        lid = str(lec.get("id"))
        session = SESSIONS_STORE.get(lid, {})
        att = attempts_by_lecture.get(lid)
        progress = int(session.get("completion_percentage", 0))
        competency_breakdown.append({
            "id": lid,
            "title": lec.get("title") or "Untitled Lecture",
            "progress": progress,
            "quiz_score": att.score if att else None,
            "quiz_passed": att.passed if att else None,
            "quiz_attempts": session.get("quiz_attempts", 0),
        })

    competency_breakdown.sort(
        key=lambda x: (x["progress"] > 0 or x["quiz_score"] is not None),
        reverse=True,
    )

    # 5. Weak topics / Review list
    weak_topics = []
    for s in SESSIONS_STORE.values():
        if s.get("quiz_attempts", 0) > 0 and not s.get("quiz_passed"):
            topic = s.get("course_topic", "Concept")
            if topic not in weak_topics:
                weak_topics.append(topic)

    if total_tests > 0:
        if pass_rate >= 70:
            behavioral_summary = f"Solid concept retention! You have passed {passed_tests} of {total_tests} tests with an average score of {avg_test_score}%."
        else:
            behavioral_summary = f"You have completed {total_tests} test{'s' if total_tests > 1 else ''}. Strengthening weak concepts will help boost test pass rates."
    else:
        behavioral_summary = "Your quiz scores and retention trends will update here automatically as you take concept checkups."

    return {
        "student": {
            "name": current_student.full_name,
            "email": current_student.email,
            "student_id": student_id_val,
            "initials": initials,
            "status": "Active Enrollment" if current_student.is_active else "Inactive",
            "program": "Computer Science & Engineering",
            "primary_course": primary_course,
            "age": profile.age if profile else None,
        },
        "metrics": {
            "knowledge_coverage": overall_progress,
            "retention_index": retention_index,
            "average_test_score": avg_test_score,
            "total_tests": total_tests,
            "passed_tests": passed_tests,
            "pass_rate": pass_rate,
            "completed_lectures": sum(1 for s in SESSIONS_STORE.values() if s.get("quiz_passed")),
            "total_lectures": total_lectures,
        },
        "cognitive_profile": {
            "style": cognitive_style,
            "insight": cognitive_insight,
        },
        "behavioral_insights": {
            "summary": behavioral_summary,
            "weak_topics": weak_topics,
        },
        "daily_monitoring": daily_monitoring,
        "weekly_monitoring": weekly_monitoring,
        "monthly_monitoring": monthly_monitoring,
        "recent_tests": recent_tests,
        "competency_breakdown": competency_breakdown,
    }


@router.get("/lectures")
def get_lectures(
    current_student: User = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    student_data = get_student_data(current_student)
    # Return all lectures from the Faculty JSON store.
    
    result = []
    for lec in LECTURES:
        if lec.get("status") in ["READY", "published", None]: # Visibility filter
            result.append({
                "id": lec.get("id"),
                "title": lec.get("title") or "Untitled Lecture",
                "description": lec.get("description") or "",
                "faculty_id": lec.get("faculty_id"),
                "faculty_name": lec.get("faculty_name") or lec.get("instructor") or "Unknown Teacher",
                "subject": lec.get("subject"),
                "category": lec.get("category"),
                "subcategory": lec.get("subcategory"),
                "thumbnail_url": lec.get("thumbnail"),
                "duration": lec.get("duration") or "Unknown",
                "created_at": lec.get("created_at") or "",
                "source": lec.get("source_type", "local"),
                "video_available": True,
                "transcript_available": True,
                "youtube_id": lec.get("youtube_id"),
                "video_url": f"/api/faculty/lectures/{lec.get('id')}/video" if lec.get("source_type") == "local" else lec.get("video_url")
            })
            
    # Keep compatibility with postgres if any exist
    try:
        pg_payloads = refresh_student_lectures(student_data, db)
        for pg_lec in pg_payloads:
            if not any(r["id"] == pg_lec["id"] for r in result):
                result.append(pg_lec)
    except Exception:
        pass
        
    return result


# ============================================================
# TELEMETRY WITH TRAINED XGBOOST MODEL EVALUATION
# ============================================================


@router.post("/telemetry")
def update_telemetry(
    log: TelemetryLog, current_student: User = Depends(get_current_student)
):
    student_data = get_student_data(current_student)
    ACTIVE_SESSION_STATE = student_data["active_session"]
    ACTIVE_SESSION_STATE["paused"] = log.paused
    ACTIVE_SESSION_STATE["rewound"] = log.rewound
    ACTIVE_SESSION_STATE["seeked"] = log.seeked
    ACTIVE_SESSION_STATE["speed_changes"] = log.speed_changes
    ACTIVE_SESSION_STATE["watch_time"] = log.watch_time
    ACTIVE_SESSION_STATE["repeated_timestamps"] = log.repeated_timestamps
    ACTIVE_SESSION_STATE["completion_percentage"] = log.completion_percentage

    # Fallback estimations for 30s actions if not directly provided
    pauses_30s = log.pauses_30s if log.pauses_30s is not None else min(log.paused, 2)
    resumes_30s = (
        log.resumes_30s if log.resumes_30s is not None else (1 if pauses_30s > 0 else 0)
    )
    rewinds_30s = (
        log.rewinds_30s if log.rewinds_30s is not None else min(log.rewound, 2)
    )
    seeks_30s = log.seeks_30s if log.seeks_30s is not None else min(log.seeked, 1)
    speed = log.current_speed if log.current_speed is not None else 1.0

    # Evaluate trained XGBoost model on the latest 30s actions
    xgb_result = evaluate_xgboost_confusion(
        pauses_30s=pauses_30s,
        resumes_30s=resumes_30s,
        rewinds_30s=rewinds_30s,
        seeks_30s=seeks_30s,
        speed=speed,
        completion_pct=log.completion_percentage,
    )

    ACTIVE_SESSION_STATE["confusion_score"] = xgb_result["confusion_score"]
    ACTIVE_SESSION_STATE["confusion_status"] = xgb_result["confusion_status"]

    return {
        "status": "success",
        "confusion_score": xgb_result["confusion_score"],
        "confusion_status": xgb_result["confusion_status"],
        "trigger_ai_help": (
            xgb_result["confusion_score"] is not None
            and xgb_result["confusion_score"] >= 80
        ),
    }


# ============================================================
# SESSION EVENT LOGGING WITH TRAINED XGBOOST INFERENCE
# ============================================================



@router.post("/session-analysis/log")
def log_session_event(
    log: SessionEventLog,
    current_student: User = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    student_data = get_student_data(current_student)
    refresh_student_lectures(student_data, db)
    
    lecture_record = get_published_lecture(log.lecture_id, db)
    if lecture_record:
        db_session = get_or_create_persistent_session(current_student, lecture_record, db)
        db_session_id = str(db_session.id)
        total_watch_time = db_session.total_watch_time_seconds
    else:
        db_session = None
        db_session_id = "local-json-session-" + str(log.lecture_id)
        total_watch_time = 0

    SESSIONS_STORE = student_data["sessions"]
    ACTIVE_SESSION_STATE = student_data["active_session"]
    
    from app.routers.faculty_store import LECTURES
    MOCK_LECTURES = student_data["lectures"] + LECTURES

    def format_time(seconds):
        minutes = int(seconds // 60)
        secs = int(seconds % 60)
        return f"{minutes:02d}:{secs:02d}"

    if (
        not ACTIVE_SESSION_STATE
        or ACTIVE_SESSION_STATE.get("lecture_id") != log.lecture_id
    ):
        lecture = next((l for l in MOCK_LECTURES if l["id"] == log.lecture_id), None)
        if not lecture:
            raise HTTPException(status_code=404, detail="Lecture not found")
            
        cached_state = SESSIONS_STORE.get(log.lecture_id)
        if cached_state and cached_state.get("db_session_id") == db_session_id:
            restored_state = cached_state
        else:
            if lecture_record and db_session:
                restored_state = restore_session_state(
                    db, db_session, lecture, current_student.full_name
                )
            else:
                restored_state = {
                    "lecture_id": log.lecture_id,
                    "student_name": current_student.full_name,
                    "lecture_title": lecture.get("title", ""),
                    "video_url": lecture.get("youtube_url", lecture.get("video_url", "")),
                    "total_duration": lecture.get("duration_seconds", 0),
                    "watch_time": 0,
                    "completion_percentage": 0,
                    "confusion_score": 15,
                    "confusion_status": "clear",
                    "play_events": 0,
                    "paused": 0,
                    "rewound": 0,
                    "seeked": 0,
                    "forward_seeks": 0,
                    "speed_changes": 0,
                    "repeated_timestamps": [],
                    "speed_history": [],
                    "confusion_timestamps": [],
                    "manual_confusion": 0,
                    "quiz_score": None,
                    "summary_generated": False,
                    "db_session_id": db_session_id,
                    "total_watch_time_seconds": 0
                }
        ACTIVE_SESSION_STATE.clear()
        ACTIVE_SESSION_STATE.update(restored_state)

    if log.event_type == "play":
        ACTIVE_SESSION_STATE["play_events"] = ACTIVE_SESSION_STATE.get("play_events", 0) + 1
    elif log.event_type == "pause":
        ACTIVE_SESSION_STATE["paused"] += 1
    elif log.event_type == "rewind":
        ACTIVE_SESSION_STATE["rewound"] += 1
        prev_t = log.previous_timestamp if log.previous_timestamp is not None else log.rewind_from
        curr_t = log.current_timestamp if log.current_timestamp is not None else log.rewind_to
        if prev_t is not None and curr_t is not None:
            time_range = f"{format_time(curr_t)}-{format_time(prev_t)}"
            ACTIVE_SESSION_STATE["repeated_timestamps"].append(time_range)
    elif log.event_type in ["seek", "forward_seek"]:
        ACTIVE_SESSION_STATE["seeked"] += 1
        if log.event_type == "forward_seek":
            ACTIVE_SESSION_STATE["forward_seeks"] += 1
    elif log.event_type == "speed_change":
        ACTIVE_SESSION_STATE["speed_changes"] += 1
        if "speed_history" not in ACTIVE_SESSION_STATE:
            ACTIVE_SESSION_STATE["speed_history"] = []
        ACTIVE_SESSION_STATE["speed_history"].append(
            {
                "previous_speed": log.previous_speed,
                "new_speed": log.new_speed,
                "timestamp": log.timestamp,
            }
        )
    elif log.event_type == "manual_confusion":
        ACTIVE_SESSION_STATE["manual_confusion"] += 1
        ACTIVE_SESSION_STATE["confusion_timestamps"].append(format_time(log.timestamp))

    # ACTIVE_SESSION_STATE["completion_percentage"] = max(ACTIVE_SESSION_STATE["completion_percentage"], log.watch_duration)
    ACTIVE_SESSION_STATE["completion_percentage"] = max(
        ACTIVE_SESSION_STATE.get("completion_percentage", 0),
        log.watch_duration,
    )
    ACTIVE_SESSION_STATE["watch_time"] = max(ACTIVE_SESSION_STATE["watch_time"], log.timestamp)

    pauses_30s = log.pauses_30s if log.pauses_30s is not None else (1 if log.event_type == "pause" else 0)
    resumes_30s = log.resumes_30s if log.resumes_30s is not None else (1 if log.event_type == "play" else 0)
    rewinds_30s = log.rewinds_30s if log.rewinds_30s is not None else (1 if log.event_type == "rewind" else 0)
    seeks_30s = log.seeks_30s if log.seeks_30s is not None else (1 if log.event_type in ["seek", "forward_seek"] else 0)

    xgb_result = evaluate_xgboost_confusion(
        pauses_30s=pauses_30s,
        resumes_30s=resumes_30s,
        rewinds_30s=rewinds_30s,
        seeks_30s=seeks_30s,
        speed=log.playback_speed,
        completion_pct=ACTIVE_SESSION_STATE["completion_percentage"],
    )

    c_score = xgb_result["confusion_score"]
    ACTIVE_SESSION_STATE["confusion_score"] = c_score
    ACTIVE_SESSION_STATE["confusion_status"] = xgb_result["confusion_status"]

    # confusion_detected = c_score >= 70 and log.event_type != "pause"
    confusion_detected = (
        c_score is not None
        and c_score >= 70
        and log.event_type != "pause"
    )
    recommended_action = "AI Help Center is available if you would like to clarify this segment." if confusion_detected else "Session tracked."

    current_id = ACTIVE_SESSION_STATE.get("lecture_id")
    if current_id:
        SESSIONS_STORE[current_id] = dict(ACTIVE_SESSION_STATE)

    event_data = log.model_dump() if hasattr(log, "model_dump") else log.dict()
    event_data["confusion_score"] = c_score
    event_data["confusion_status"] = ACTIVE_SESSION_STATE["confusion_status"]

    if db_session:
        if log.event_type == "watch_progress":
           delta_seconds = max(0, float(log.seconds_delta or 0))
           db_session.total_watch_time_seconds = (db_session.total_watch_time_seconds or 0) + delta_seconds
        db.add(
            LearningEvent(
                session_id=db_session.id,
                event_type=log.event_type[:50],
                video_timestamp_seconds=max(0, int(log.timestamp)),
                event_data=event_data,
            )
        )
        db.commit()
        
    ACTIVE_SESSION_STATE["db_session_id"] = db_session_id
    ACTIVE_SESSION_STATE["total_watch_time_seconds"] = total_watch_time if not db_session else db_session.total_watch_time_seconds

    return {
        "status": "success",
        "session_id": db_session_id,
        "event_persisted": True,
        "confusion_detected": confusion_detected,
        "confusion_score": c_score,
        "confusion_status": ACTIVE_SESSION_STATE["confusion_status"],
        "recommended_action": recommended_action,
    }



# ============================================================
# ACTIVE SESSION
# ============================================================


@router.get("/active-session")
def get_active_session(
    current_student: User = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    student_data = get_student_data(current_student)
    refresh_student_lectures(student_data, db)
    hydrate_student_sessions(current_student, student_data, db)
    return student_data["active_session"]


# ============================================================
# SELECT SESSION
# ============================================================


@router.post("/session/select")
def select_session(
    req: dict,
    current_student: User = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    student_data = get_student_data(current_student)
    refresh_student_lectures(student_data, db)
    SESSIONS_STORE = student_data["sessions"]
    WATCH_HISTORY = student_data["watch_history"]
    ACTIVE_SESSION_STATE = student_data["active_session"]
    MOCK_LECTURES = student_data["lectures"]
    lec_id = req.get("lecture_id")
    if not lec_id:
        raise HTTPException(status_code=400, detail="Missing lecture_id")

    lecture = next((l for l in MOCK_LECTURES if l["id"] == lec_id), None)
    if not lecture:
        raise HTTPException(status_code=404, detail="Lecture not found")

    current_id = ACTIVE_SESSION_STATE.get("lecture_id")
    if current_id:
        SESSIONS_STORE[current_id] = dict(ACTIVE_SESSION_STATE)

    lecture_record = get_published_lecture(lec_id, db)
    db_session = (
        get_or_create_persistent_session(current_student, lecture_record, db)
        if lecture_record is not None
        else None
    )
    if db_session is not None:
        if lec_id in SESSIONS_STORE and SESSIONS_STORE[lec_id].get("db_session_id") == str(
            db_session.id
        ):
            restored_state = SESSIONS_STORE[lec_id]
        else:
            restored_state = restore_session_state(
                db, db_session, lecture, current_student.full_name
            )
        ACTIVE_SESSION_STATE.clear()
        ACTIVE_SESSION_STATE.update(restored_state)
        ACTIVE_SESSION_STATE["db_session_id"] = str(db_session.id)
        SESSIONS_STORE[lec_id] = dict(ACTIVE_SESSION_STATE)
        db.commit()
    else:
        if lec_id in SESSIONS_STORE:
            restored_state = SESSIONS_STORE[lec_id]
        else:
            restored_state = create_empty_session(lec_id, lecture, current_student.full_name)
        ACTIVE_SESSION_STATE.clear()
        ACTIVE_SESSION_STATE.update(restored_state)
        SESSIONS_STORE[lec_id] = dict(ACTIVE_SESSION_STATE)

    WATCH_HISTORY[lec_id] = {
        "id": lec_id,
        "title": lecture["title"],
        "progress": int(ACTIVE_SESSION_STATE["completion_percentage"]),
        "last_watched": "Just now",
    }

    return ACTIVE_SESSION_STATE


# ============================================================
# RESET
# ============================================================


@router.post("/reset")
def reset_session(
    current_student: User = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    student_data = get_student_data(current_student)
    profile = get_student_profile(current_student, db)
    active_rows = (
        db.query(StudentSession)
        .filter(
            StudentSession.student_id == profile.id,
            StudentSession.status == "active",
        )
        .all()
    )
    for row in active_rows:
        row.status = "abandoned"
        row.ended_at = datetime.now(timezone.utc)
    db.commit()
    student_data["sessions"].clear()
    student_data["watch_history"].clear()
    student_data["active_session"].clear()
    return {"status": "reset_completed", "history_preserved": True}


# ============================================================
# SMART SEARCH
# ============================================================


@router.post("/search")
def smart_search(
    query: SearchQuery,
    current_student: User = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    student_data = get_student_data(current_student)
    refresh_student_lectures(student_data, db)
    TRANSCRIPTS_STORE = student_data["transcripts"]
    MOCK_LECTURES = student_data["lectures"]
    q = query.query.lower()
    hits = []

    for lec_id, entries in TRANSCRIPTS_STORE.items():
        lec_title = "Unknown Lecture"
        for lec in MOCK_LECTURES:
            if lec["id"] == lec_id:
                lec_title = lec["title"]
                break

        for item in entries:
            if q in item["text"].lower():
                hits.append(
                    {
                        "lecture_id": lec_id,
                        "lecture_title": lec_title,
                        "timestamp": item["timestamp"],
                        "seconds": item["seconds"],
                        "snippet": item["text"],
                        "relevance": 95,
                    }
                )

    return {
        "query": query.query,
        "results": hits,
        "message": "No matching transcript segments were found." if not hits else None,
    }


# ============================================================
# YOUTUBE LECTURE IMPORT
# ============================================================


@router.post("/youtube-lecture")
def create_youtube_lecture(
    req: YouTubeLectureRequest,
    current_student: User = Depends(get_current_student),
):
    raise HTTPException(
        status_code=403,
        detail="Students cannot create lectures. Ask faculty to add and publish this YouTube lecture; published lectures will appear in the lecture catalogue.",
    )


# ============================================================
# LECTURE ANALYSIS
# ============================================================


@router.get("/lecture/{lecture_id}/analysis")
def get_lecture_analysis(
    lecture_id: str,
    current_student: User = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    student_data = get_student_data(current_student)
    refresh_student_lectures(student_data, db)
    MOCK_LECTURES = student_data["lectures"]
    SESSIONS_STORE = student_data["sessions"]
    MOCK_SUMMARIES = student_data["summaries"]
    FINAL_VIDEO_QUIZZES = student_data["final_video_quizzes"]
    lecture = next((l for l in MOCK_LECTURES if l["id"] == lecture_id), None)
    if lecture is None:
        raise HTTPException(status_code=404, detail="Lecture not found.")
    state = SESSIONS_STORE.get(lecture_id)

    if not state:
        state = {
            "paused": 0,
            "rewound": 0,
            "seeked": 0,
            "forward_seeks": 0,
            "speed_changes": 0,
            "watch_time": 0.0,
            "completion_percentage": 0.0,
            "quiz_attempts": 0,
            "quiz_passed": False,
            "quiz_score": 0,
            "confusion_score": 0,
            "confusion_status": "Low Confusion",
            "manual_confusion": 0,
            "repeated_timestamps": [],
            "confusion_timestamps": [],
        }

    # Summary cache keys must consistently be strings because lecture IDs can
    # originate from UUIDs in PostgreSQL or strings in the compatibility store.
    lecture_key = str(lecture_id)
    lecture_uuid = None
    try:
        lecture_uuid = UUID(lecture_key)
    except (ValueError, TypeError, AttributeError):
        pass

    def _usable_study_material(value: Any) -> bool:
        if not isinstance(value, str) or not value.strip():
            return False
        lowered = value.strip().lower()
        failure_markers = (
            "summary unavailable",
            "revision notes unavailable",
            "ai summary unavailable",
            "ai revision notes unavailable",
            "groq is not configured",
            "groq could not generate",
            "groq returned an empty response",
            "no relevant transcript segments were found",
            "please check the backend logs",
        )
        return not any(marker in lowered for marker in failure_markers)

    # 1. Read-first: Check lecture_study_materials in PostgreSQL
    db_material = None
    if lecture_uuid and db is not None:
        db_material = (
            db.query(LectureStudyMaterial)
            .filter(LectureStudyMaterial.lecture_id == lecture_uuid)
            .first()
        )

    has_db_summary = db_material is not None and _usable_study_material(db_material.summary)
    has_db_notes = db_material is not None and _usable_study_material(db_material.revision_notes)

    # If both materials already exist in PostgreSQL, return them directly without calling generator
    if has_db_summary and has_db_notes:
        summary_info = {
            "summary": db_material.summary,
            "revision_notes": db_material.revision_notes,
            "_summary_available": True,
            "_revision_notes_available": True,
        }
        MOCK_SUMMARIES[lecture_key] = summary_info
    else:
        summary_info = dict(MOCK_SUMMARIES.get(lecture_key) or MOCK_SUMMARIES.get(lecture_id) or {})
        if db_material:
            if has_db_summary and not _usable_study_material(summary_info.get("summary")):
                summary_info["summary"] = db_material.summary
            if has_db_notes and not _usable_study_material(summary_info.get("revision_notes")):
                summary_info["revision_notes"] = db_material.revision_notes

        summary_missing = not _usable_study_material(summary_info.get("summary"))
        notes_missing = not _usable_study_material(summary_info.get("revision_notes"))

        if summary_missing or notes_missing:
            transcript_chunks = student_data.get("transcripts", {}).get(lecture_key, [])
            if not transcript_chunks and lecture_uuid and db is not None:
                db_transcript = (
                    db.query(LectureTranscript)
                    .filter(LectureTranscript.lecture_id == lecture_uuid)
                    .first()
                )
                if db_transcript:
                    transcript_chunks = _transcript_entries(db_transcript)

            if transcript_chunks:
                source_lang = lecture.get("transcript_language") or "en"
                generated = generate_ai_study_materials(
                    lecture=lecture,
                    transcript_chunks=transcript_chunks,
                    source_language=source_lang,
                )

                gen_summary = generated.get("summary")
                gen_notes = generated.get("revision_notes")

                # Preserve any previously successful field if only the other field failed,
                # and never cache or persist fallback/error messages as successful output.
                updated_summary = summary_info.get("summary")
                if _usable_study_material(gen_summary):
                    updated_summary = gen_summary
                elif not _usable_study_material(updated_summary):
                    updated_summary = "Summary unavailable."

                updated_notes = summary_info.get("revision_notes")
                if _usable_study_material(gen_notes):
                    updated_notes = gen_notes
                elif not _usable_study_material(updated_notes):
                    updated_notes = "Revision notes unavailable."

                summary_info["summary"] = updated_summary
                summary_info["revision_notes"] = updated_notes
                summary_info["_summary_available"] = _usable_study_material(updated_summary)
                summary_info["_revision_notes_available"] = _usable_study_material(updated_notes)

                if summary_info["_summary_available"] or summary_info["_revision_notes_available"]:
                    MOCK_SUMMARIES[lecture_key] = summary_info

                    # Persist valid generated materials to PostgreSQL lecture_study_materials
                    if lecture_uuid and db is not None:
                        try:
                            if not db_material:
                                db_material = (
                                    db.query(LectureStudyMaterial)
                                    .filter(LectureStudyMaterial.lecture_id == lecture_uuid)
                                    .first()
                                )

                            if db_material is None:
                                db_material = LectureStudyMaterial(
                                    lecture_id=lecture_uuid,
                                    summary=updated_summary if summary_info["_summary_available"] else None,
                                    revision_notes=updated_notes if summary_info["_revision_notes_available"] else None,
                                    source_language=source_lang,
                                    generation_status=(
                                        "completed"
                                        if (summary_info["_summary_available"] and summary_info["_revision_notes_available"])
                                        else "partial"
                                    ),
                                )
                                db.add(db_material)
                            else:
                                if summary_info["_summary_available"]:
                                    db_material.summary = updated_summary
                                if summary_info["_revision_notes_available"]:
                                    db_material.revision_notes = updated_notes
                                db_material.source_language = source_lang
                                db_material.generation_status = (
                                    "completed"
                                    if (
                                        _usable_study_material(db_material.summary)
                                        and _usable_study_material(db_material.revision_notes)
                                    )
                                    else "partial"
                                )
                            db.commit()
                            db.refresh(db_material)
                        except Exception as db_err:
                            db.rollback()
                            print(f"[STUDY MATERIALS] Failed to persist study materials to DB: {db_err}")

    if not summary_info:
        summary_info = {
            "summary": "Summary unavailable. Transcript may be missing or Groq generation failed.",
            "revision_notes": "Revision notes unavailable. Transcript may be missing or Groq generation failed.",
        }

    return {
        "lecture_id": lecture_key,
        "ai_summary": summary_info.get("summary", "Summary unavailable."),
        "ai_revision_notes": summary_info.get(
            "revision_notes", "Revision notes unavailable."
        ),
        "final_video_quiz": FINAL_VIDEO_QUIZZES.get(lecture_id),
        "session_analytics": {
            "total_pauses": state.get("paused", 0),
            "total_rewinds": state.get("rewound", 0),
            "total_seeks": state.get("seeked", 0),
            "forward_seeks": state.get("forward_seeks", 0),
            "playback_speed_changes": state.get("speed_changes", 0),
            "watch_percentage": int(state.get("completion_percentage", 0)),
            "watch_time": state.get("watch_time", "0m 0s"),
            "confusion_score": state.get("confusion_score", 0),
            "confusion_status": state.get("confusion_status", "Low"),
            "quiz_score": (
                f"{state.get('quiz_score', 0)}%" if state.get("quiz_attempts", 0) > 0 else "N/A"
            ),
            "quiz_threshold": QUIZ_PASS_THRESHOLD,
            "manual_confusion": state.get("manual_confusion", 0),
            "repeated_timestamps": state.get("repeated_timestamps", []),
            "confusion_timestamps": state.get("confusion_timestamps", []),
        },
    }


# ============================================================
# QUIZ STATUS / THRESHOLD
# ============================================================


@router.get("/quiz-status")
def get_quiz_status(current_student: User = Depends(get_current_student)):
    return {
        "pass_threshold": QUIZ_PASS_THRESHOLD,
        "description": f"Student must score {QUIZ_PASS_THRESHOLD}% or higher to pass.",
    }


@router.post("/quiz/attempt", status_code=201)
def submit_quiz_attempt(
    req: QuizAttemptSubmission,
    current_student: User = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    lecture = get_published_lecture(req.lecture_id, db)
    if not lecture:
        try:
            parsed_id = UUID(str(req.lecture_id))
            lecture = db.query(Lecture).filter(Lecture.id == parsed_id).first()
        except (TypeError, ValueError, AttributeError):
            lecture = None
    if not lecture:
        raise HTTPException(
            status_code=404, detail="Lecture not found."
        )

    if req.total_questions < 1:
        raise HTTPException(
            status_code=400, detail="total_questions must be at least 1"
        )
    if req.correct_answers < 0 or req.correct_answers > req.total_questions:
        raise HTTPException(
            status_code=400,
            detail="correct_answers must be between 0 and total_questions",
        )
    difficulty = {
        "beginner": "easy",
        "medium": "medium",
        "advanced": "hard",
        "easy": "easy",
        "hard": "hard",
    }.get((req.difficulty or "medium").lower())
    if difficulty is None:
        raise HTTPException(
            status_code=400, detail="difficulty must be easy, medium or hard"
        )

    calculated_score = round((req.correct_answers / req.total_questions) * 100)
    score = req.score if req.score is not None else calculated_score
    score = max(0, min(100, int(score)))

    passed = (
        bool(req.passed)
        if req.passed is not None
        else (score >= QUIZ_PASS_THRESHOLD)
    )

    profile = get_student_profile(current_student, db)

    # Minimal duplicate submission prevention (within 5 seconds)
    recent_attempt = (
        db.query(QuizAttempt)
        .filter(
            QuizAttempt.student_id == profile.id,
            QuizAttempt.lecture_id == lecture.id,
            QuizAttempt.total_questions == req.total_questions,
            QuizAttempt.correct_answers == req.correct_answers,
            QuizAttempt.score == score,
            QuizAttempt.attempted_at >= datetime.now(timezone.utc) - timedelta(seconds=5),
        )
        .order_by(QuizAttempt.attempted_at.desc())
        .first()
    )
    if recent_attempt:
        return {
            "status": "success",
            "attempt_id": str(recent_attempt.id),
            "lecture_id": str(lecture.id),
            "difficulty": recent_attempt.difficulty,
            "total_questions": recent_attempt.total_questions,
            "correct_answers": recent_attempt.correct_answers,
            "score": recent_attempt.score,
            "passed": recent_attempt.passed,
            "pass_threshold": QUIZ_PASS_THRESHOLD,
        }

    try:
        attempt = persist_quiz_attempt(
            current_student=current_student,
            lecture=lecture,
            difficulty=difficulty,
            total_questions=req.total_questions,
            correct_answers=req.correct_answers,
            answers=req.answers,
            db=db,
            score_override=score,
            passed_override=passed,
        )
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[Quiz Persistence Error] Failed to persist quiz attempt: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to save quiz attempt."
        )

    student_data = get_student_data(current_student)
    state = (
        student_data["sessions"].get(str(lecture.id))
        or student_data["sessions"].get(req.lecture_id)
    )
    if state is not None:
        state["quiz_attempts"] = state.get("quiz_attempts", 0) + 1
        state["quiz_score"] = attempt.score
        state["quiz_passed"] = attempt.passed

    return {
        "status": "success",
        "attempt_id": str(attempt.id),
        "lecture_id": str(lecture.id),
        "difficulty": attempt.difficulty,
        "total_questions": attempt.total_questions,
        "correct_answers": attempt.correct_answers,
        "score": attempt.score,
        "passed": attempt.passed,
        "pass_threshold": QUIZ_PASS_THRESHOLD,
    }


# ============================================================
# AI HELP CENTER HELPERS
# ============================================================


def get_prerequisites_for_topic(lecture: dict) -> List[str]:
    existing = lecture.get("prerequisites") or []
    if existing:
        return existing
    if lecture.get("prerequisite_topic"):
        return [lecture["prerequisite_topic"]]

    title = lecture.get("title", "").lower()
    prerequisite_map = {
        "binary search": ["Arrays", "Sorted Data", "Basic Searching Concepts"],
        "linked list": ["Arrays", "Pointers", "Dynamic Memory"],
        "stack": ["Arrays", "Basic Data Structures", "LIFO Concept"],
        "queue": ["Arrays", "Basic Data Structures", "FIFO Concept"],
        "tree": ["Binary Tree Basics", "Recursion", "Pointers"],
        "graph": [
            "Vertices and Edges",
            "Basic Data Structures",
            "Graph Representation",
        ],
        "normalization": [
            "Relational Databases",
            "Primary and Foreign Keys",
            "Functional Dependencies",
        ],
        "1nf": ["Relational Databases", "Database Tables", "Keys"],
        "2nf": ["1NF", "Primary Keys", "Functional Dependencies"],
        "3nf": ["2NF", "Functional Dependencies", "Candidate Keys"],
        "inheritance": [
            "Classes and Objects",
            "Object-Oriented Programming",
            "Methods and Attributes",
        ],
        "polymorphism": ["Classes and Objects", "Inheritance", "Method Overriding"],
        "recursion": ["Functions", "Conditional Statements", "Call Stack"],
        "sorting": ["Arrays", "Comparisons", "Loops"],
    }

    for key, prerequisites in prerequisite_map.items():
        if key in title:
            return prerequisites

    return [
        "Basic terminology of the subject",
        "Core concepts introduced before this topic",
        "Basic operations used in this topic",
    ]


def find_prerequisite_lectures(
    prerequisites: List[str], lectures: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    recommendations = []
    for lecture in lectures:
        title = lecture.get("title", "").lower()
        matched = False
        for prerequisite in prerequisites:
            words = [word for word in prerequisite.lower().split() if len(word) > 2]
            if words and all(word in title for word in words):
                matched = True
                break
        if matched:
            recommendations.append(
                {
                    "lecture_id": lecture["id"],
                    "title": lecture["title"],
                    "link": f"/student/session?play={lecture['id']}&t=0",
                }
            )
    return recommendations


def select_representative_chunks(
    chunks: List[Dict[str, Any]], max_chunks: int = 60
) -> List[Dict[str, Any]]:
    """Select evenly distributed transcript entries across the whole lecture."""
    if not chunks:
        return []
    if len(chunks) <= max_chunks:
        return chunks
    if max_chunks <= 1:
        return [chunks[0]]
    step = (len(chunks) - 1) / (max_chunks - 1)
    selected = []
    seen = set()
    for i in range(max_chunks):
        index = round(i * step)
        if index not in seen:
            selected.append(chunks[index])
            seen.add(index)
    return selected


def build_transcript_context(
    chunks: List[Dict[str, Any]], max_chars: int = 30000
) -> str:
    parts = []
    for chunk in chunks:
        start_time = chunk.get("start_time", chunk.get("seconds", 0))
        end_time = chunk.get("end_time", chunk.get("timestamp", ""))
        text_value = (
            chunk.get("text")
            or chunk.get("content")
            or chunk.get("chunk_text")
            or chunk.get("transcript")
            or ""
        )
        if not str(text_value).strip():
            continue
        parts.append(f"[{start_time}s - {end_time}]\n{text_value}")
    return "\n\n".join(parts)[:max_chars]


def generate_ai_study_materials(
    lecture: dict, transcript_chunks: List[Dict[str, Any]], source_language: str = "en"
) -> Dict[str, Any]:
    """Generate a lecture summary and revision notes from transcript entries."""
    lecture_title = lecture.get("title", "Untitled Lecture")

    if not transcript_chunks:
        return {
            "summary": "AI Summary unavailable. No transcript segments were found.",
            "revision_notes": "AI Revision Notes unavailable. No transcript segments were found.",
            "_summary_available": False,
            "_revision_notes_available": False,
        }

    def _time_to_seconds(value: Any) -> float:
        """Accept seconds or timestamps such as MM:SS / HH:MM:SS."""
        if isinstance(value, (int, float)):
            return max(0.0, float(value))
        if not isinstance(value, str) or not value.strip():
            return 0.0
        try:
            parts = [float(part) for part in value.strip().split(":")]
            total = 0.0
            for part in parts:
                total = total * 60 + part
            return max(0.0, total)
        except (TypeError, ValueError):
            return 0.0

    # Normalize database transcripts and faculty-store JSON transcripts into the
    # same shape expected by the Groq generator: start_time, end_time, and text.
    normalized_chunks = []
    for chunk in transcript_chunks:
        if not isinstance(chunk, dict):
            continue
        text_value = (
            chunk.get("text")
            or chunk.get("chunk_text")
            or chunk.get("content")
            or chunk.get("transcript")
            or ""
        )
        if not str(text_value).strip():
            continue

        start_value = chunk.get("start_time")
        if start_value is None:
            start_value = chunk.get("seconds", chunk.get("timestamp", 0))
        start_seconds = _time_to_seconds(start_value)

        end_value = chunk.get("end_time")
        end_seconds = (
            _time_to_seconds(end_value)
            if end_value is not None
            else start_seconds
        )
        normalized_chunks.append(
            {
                **chunk,
                "start_time": start_seconds,
                "end_time": max(start_seconds, end_seconds),
                "text": str(text_value).strip(),
            }
        )

    if not normalized_chunks:
        return {
            "summary": "AI Summary unavailable. Transcript text is empty.",
            "revision_notes": "AI Revision Notes unavailable. Transcript text is empty.",
            "_summary_available": False,
            "_revision_notes_available": False,
        }

    # Select representative sections from beginning to end of the lecture.
    representative_chunks = select_representative_chunks(
        normalized_chunks, max_chunks=60
    )
    transcript_context = build_transcript_context(
        representative_chunks, max_chars=30000
    )

    if not transcript_context.strip():
        return {
            "summary": "AI Summary unavailable. Transcript text is empty.",
            "revision_notes": "AI Revision Notes unavailable. Transcript text is empty.",
            "_summary_available": False,
            "_revision_notes_available": False,
        }

    def _is_generation_failure(value: Any) -> bool:
        if not isinstance(value, str) or not value.strip():
            return True
        lowered = value.strip().lower()
        failure_markers = (
            "groq is not configured",
            "groq could not generate the explanation",
            "groq returned an empty response",
            "no relevant transcript segments were found",
            "ai summary unavailable",
            "ai revision notes unavailable",
        )
        return any(marker in lowered for marker in failure_markers)

    summary = None
    revision_notes = None

    try:
        summary_prompt = (
            f"Create a complete study summary for the lecture '{lecture_title}'.\n\n"
            "Use ONLY the supplied lecture transcript.\n"
            "Cover the entire lecture, including major topics, definitions, algorithms/procedures, rules, and examples.\n"
            "The supplied transcript sections are representative sections distributed across the lecture, "
            "so cover the lecture from beginning to end without inventing missing details.\n\n"
            f"LECTURE TRANSCRIPT:\n{transcript_context}"
        )
        candidate = generator.generate_explanation(
            question=summary_prompt,
            context_chunks=representative_chunks,
            level="medium",
        )
        if not _is_generation_failure(candidate):
            summary = candidate.strip()
    except Exception as e:
        print(f"[STUDY MATERIALS] Summary generation error: {e}")

    try:
        revision_prompt = (
            f"Create detailed exam-oriented revision notes for the lecture '{lecture_title}'.\n\n"
            "Use ONLY the supplied lecture transcript.\n"
            "Cover the lecture from beginning to end, including important definitions, concepts, "
            "procedures, algorithms, rules, examples, comparisons and exam-relevant points when supported by the transcript.\n"
            "The supplied transcript sections are representative sections distributed across the lecture, "
            "so organize the notes to preserve broad coverage without inventing missing details.\n\n"
            f"LECTURE TRANSCRIPT:\n{transcript_context}"
        )
        candidate = generator.generate_explanation(
            question=revision_prompt,
            context_chunks=representative_chunks,
            level="advanced",
        )
        if not _is_generation_failure(candidate):
            revision_notes = candidate.strip()
    except Exception as e:
        print(f"[STUDY MATERIALS] Revision notes generation error: {e}")

    summary_available = isinstance(summary, str) and bool(summary.strip())
    revision_notes_available = isinstance(revision_notes, str) and bool(
        revision_notes.strip()
    )

    if not summary_available:
        summary = "AI Summary unavailable. Please check the backend logs and Groq API configuration."
    if not revision_notes_available:
        revision_notes = "AI Revision Notes unavailable. Please check the backend logs and Groq API configuration."

    language_label = (source_language or "en").upper()
    return {
        "summary": f"Source Language: {language_label}\n\n{summary}",
        "revision_notes": f"Source Language: {language_label}\n\n{revision_notes}",
        "_summary_available": summary_available,
        "_revision_notes_available": revision_notes_available,
    }


# ============================================================
# AI HELP CENTER
# ============================================================


@router.post("/help-center/state")
def process_help_center(
    req: HelpCenterRequest,
    current_student: User = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    student_data = get_student_data(current_student)
    refresh_student_lectures(student_data, db)
    ACTIVE_SESSION_STATE = student_data["active_session"]
    MOCK_LECTURES = student_data["lectures"]
    SESSIONS_STORE = student_data["sessions"]
    step = req.step
    user_response = req.user_response
    lec_id = req.lecture_id or ACTIVE_SESSION_STATE.get("lecture_id")

    if not lec_id:
        raise HTTPException(status_code=400, detail="lecture_id is required.")

    lecture = next((l for l in MOCK_LECTURES if l["id"] == lec_id), None)
    if not lecture:
        raise HTTPException(status_code=404, detail="Lecture not found.")

    state = get_or_create_session(lec_id, student_data, current_student.full_name)
    topic_name = lecture["title"]
    prerequisites = get_prerequisites_for_topic(lecture)
    prereq_vid_id = lecture.get("prerequisite_lecture_id")
    prereq_vid_title = lecture.get("prerequisite_lecture_title")

    if prereq_vid_id:
        target_prereq_lec = next((l for l in MOCK_LECTURES if str(l.get("id")) == str(prereq_vid_id)), None)
        if target_prereq_lec:
            prerequisite_lectures = [target_prereq_lec]
        else:
            prerequisite_lectures = find_prerequisite_lectures(prerequisites, MOCK_LECTURES)
    else:
        prerequisite_lectures = find_prerequisite_lectures(prerequisites, MOCK_LECTURES)
        if prerequisite_lectures:
            prereq_vid_id = str(prerequisite_lectures[0].get("id"))
            prereq_vid_title = prerequisite_lectures[0].get("title")
        else:
            other_lec = next((l for l in MOCK_LECTURES if str(l.get("id")) != str(lec_id)), None)
            if other_lec:
                prerequisite_lectures = [other_lec]
                prereq_vid_id = str(other_lec.get("id"))
                prereq_vid_title = other_lec.get("title")

    if step == "start":
        message_text = (
            f"Before learning '{topic_name}', have you watched the prerequisite video '{prereq_vid_title}'?"
            if prereq_vid_title
            else f"Before learning '{topic_name}', do you already understand the prerequisite concepts below?"
        )
        return {
            "step": "check_prereq",
            "topic": topic_name,
            "message": message_text,
            "prerequisites": prerequisites,
            "prerequisite_lecture_id": prereq_vid_id,
            "prerequisite_lecture_title": prereq_vid_title,
            "options": [
                {"id": "yes", "label": "Yes, I understand them"},
                {"id": "no", "label": "No, teach me the prerequisites"},
            ],
            "recommended_videos": prerequisite_lectures,
        }

    elif step == "check_prereq":
        knows = (
            req.knows_prereq if req.knows_prereq is not None else user_response == "yes"
        )
        if not knows:
            state["struggled_concepts"] = list(
                set(state.get("struggled_concepts", []) + prerequisites)
            )
            rec_message = (
                f"We recommend watching the prerequisite video '{prereq_vid_title}' before continuing with this lecture."
                if prereq_vid_title
                else "Let's learn the prerequisite concepts before continuing with this topic."
            )
            return {
                "step": "recommend_previous",
                "topic": topic_name,
                "message": rec_message,
                "prerequisites": prerequisites,
                "prerequisite_lecture_id": prereq_vid_id,
                "prerequisite_lecture_title": prereq_vid_title,
                "prerequisite_name": prereq_vid_title or (prerequisites[0] if prerequisites else "Prerequisite Lecture"),
                "recommended_videos": prerequisite_lectures,
            }
        return {
            "step": "select_explanation",
            "topic": topic_name,
            "message": f"Great! How would you like '{topic_name}' explained?",
            "options": [
                {
                    "id": "beginner",
                    "label": "Beginner",
                    "description": "Simple language and analogies",
                },
                {
                    "id": "medium",
                    "label": "Medium",
                    "description": "College-level technical explanation",
                },
                {
                    "id": "advanced",
                    "label": "Advanced",
                    "description": "Formal and detailed explanation",
                },
            ],
        }

    elif step == "select_explanation":
        exp_type = (
            user_response
            if user_response in {"beginner", "medium", "advanced"}
            else "medium"
        )
        try:
            chunks = vector_store.query_relevant_chunks(
                question=f"Explain the concept being taught in '{topic_name}'.",
                lecture_id=lec_id,
                top_k=6,
            )
        except Exception as e:
            print(f"[RAG] Retrieval error: {e}")
            chunks = []

        if not chunks:
            return {
                "step": "error",
                "message": "No transcript chunks found for this lecture.",
            }

        transcript_context = build_transcript_context(chunks)
        try:
            explanation_content = generator.generate_explanation(
                question=f"Explain the topic '{topic_name}' using only this lecture.",
                context_chunks=chunks,
                level=exp_type,
            )
        except Exception as e:
            print(f"[Gemini] Explanation error: {e}")
            return {
                "step": "error",
                "message": "Gemini could not generate explanation.",
            }

        suggested_timestamps = [
            {
                "start_time": c["start_time"],
                "end_time": c["end_time"],
                "text": c["text"],
            }
            for c in chunks
        ]

        return {
            "step": "select_remediation",
            "topic": topic_name,
            "difficulty": exp_type,
            "explanation": explanation_content,
            "options": [
                {
                    "id": "real_life",
                    "label": "Real-Life Example",
                    "description": "Understand through practical example",
                },
                {
                    "id": "quiz",
                    "label": "Take a Quiz",
                    "description": "Test understanding of this exact topic",
                },
                {
                    "id": "animation",
                    "label": "Visual / Animation Explanation",
                    "description": "See concept as visual flow",
                },
                {
                    "id": "another_video",
                    "label": "Recommend Another Video",
                    "description": "Find another lecture",
                },
            ],
            "suggested_timestamps": suggested_timestamps,
            "context_available": bool(transcript_context),
        }

    elif step == "select_remediation":
        remediation_type = user_response or "quiz"
        try:
            chunks = vector_store.query_relevant_chunks(
                question=f"Explain '{topic_name}'.", lecture_id=lec_id, top_k=8
            )
        except Exception:
            chunks = []

        if not chunks:
            return {"step": "error", "message": "No transcript chunks found."}

        transcript_context = build_transcript_context(chunks)

        if remediation_type == "quiz":
            try:
                quiz_questions = quiz_generator.generate_adaptive_quiz(
                    explanation_text="Generate quiz from current lecture topic.",
                    topic=topic_name,
                    difficulty=(
                        req.user_response
                        if req.user_response in {"beginner", "medium", "advanced"}
                        else "medium"
                    ),
                    transcript_context=transcript_context,
                    num_questions=5,
                )
            except Exception as e:
                print(f"[Quiz] Error: {e}")
                quiz_questions = []

            return {
                "step": "quiz",
                "topic": topic_name,
                "quiz_questions": quiz_questions,
                "quiz_threshold": QUIZ_PASS_THRESHOLD,
                "message": f"Quiz questions for '{topic_name}'.",
            }

        elif remediation_type == "real_life":
            real_life = generator.generate_explanation(
                question=f"Give a real-life practical example of '{topic_name}'.",
                context_chunks=chunks,
                level="medium",
            )
            return {"step": "real_life", "topic": topic_name, "content": real_life}

        elif remediation_type == "animation":
            visual = generator.generate_explanation(
                question=f"Create a step-by-step visual animation storyboard for '{topic_name}'.",
                context_chunks=chunks,
                level="medium",
            )
            return {"step": "animation", "topic": topic_name, "content": visual}

        elif remediation_type == "another_video":
            related = []
            topic_words = [w.lower() for w in topic_name.split() if len(w) > 3]
            for candidate in MOCK_LECTURES:
                if candidate["id"] == lec_id:
                    continue
                if any(word in candidate["title"].lower() for word in topic_words):
                    related.append(
                        {
                            "lecture_id": candidate["id"],
                            "title": candidate["title"],
                            "duration": candidate.get("duration", ""),
                            "link": f"/student/session?play={candidate['id']}&t=0",
                        }
                    )
            return {
                "step": "another_video",
                "topic": topic_name,
                "recommended_videos": related,
            }

    elif step == "submit_quiz":
        if req.quiz_score is None and req.quiz_passed is None:
            raise HTTPException(
                status_code=400, detail="quiz_score or quiz_passed is required."
            )

        score = (
            int(req.quiz_score)
            if req.quiz_score is not None
            else (QUIZ_PASS_THRESHOLD if req.quiz_passed else 0)
        )
        score = max(0, min(100, score))
        passed = score >= QUIZ_PASS_THRESHOLD

        lecture_record = get_published_lecture(lec_id, db)
        total_questions = 5
        correct_answers = max(
            0, min(total_questions, round(score * total_questions / 100))
        )
        quiz_attempt = persist_quiz_attempt(
            current_student=current_student,
            lecture=lecture_record,
            difficulty="medium",
            total_questions=total_questions,
            correct_answers=correct_answers,
            answers={"source": "help_center", "reported_score": score},
            db=db,
            score_override=score,
        )
        db.commit()

        state["quiz_attempts"] += 1
        state["quiz_score"] = score
        state["quiz_passed"] = passed

        if passed:
            state["understood_concepts"].append(state["course_topic"])
        else:
            state["struggled_concepts"].append(state["course_topic"])

        SESSIONS_STORE[lec_id] = dict(state)
        return {
            "step": "passed" if passed else "failed",
            "passed": passed,
            "score": score,
            "quiz_attempt_id": str(quiz_attempt.id),
            "persisted": True,
            "threshold": QUIZ_PASS_THRESHOLD,
            "message": f"Quiz {'passed' if passed else 'not passed'}! Score: {score}%.",
        }

    raise HTTPException(status_code=400, detail="Invalid flow step.")


# ============================================================
# ASK AI
# ============================================================


@router.post("/ask-ai")
def ask_ai_explanation(
    req: AskAIRequest,
    current_student: User = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    get_published_lecture(req.lecture_id, db)

    try:
        chunks = vector_store.query_relevant_chunks(
            question=req.question, lecture_id=req.lecture_id, top_k=5
        )
        if not chunks:
            return {
                "status": "success",
                "explanation": "No transcript context found. Please ensure lecture is indexed.",
                "level": req.level,
                "suggested_timestamps": [],
            }

        explanation = generator.generate_explanation(
            question=req.question,
            context_chunks=chunks,
            level=req.level,
            teaching_mode=req.teaching_mode,
            conversation_history=req.conversation_history,
        )
        suggested_timestamps = [
            {
                "start_time": chunk["start_time"],
                "end_time": chunk["end_time"],
                "text": chunk["text"],
            }
            for chunk in chunks
        ]

        return {
            "status": "success",
            "explanation": explanation,
            "level": req.level,
            "suggested_timestamps": suggested_timestamps,
        }
    except Exception as e:
        print(f"[Gemini] ask-ai error: {e}")
        return {
            "status": "error",
            "explanation": "Gemini could not answer question. Check API Key.",
            "level": req.level,
            "suggested_timestamps": [],
        }


# ============================================================
# DYNAMIC QUIZ GENERATION
# ============================================================


@router.post("/generate-quiz")
def generate_quiz(
    req: GenerateQuizRequest,
    current_student: User = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    if req.lecture_id:
        get_published_lecture(req.lecture_id, db)

    try:
        level = req.level or "medium"
        transcript_context = ""

        if req.lecture_id:
            chunks = vector_store.query_relevant_chunks(
                question=req.topic, lecture_id=req.lecture_id, top_k=10
            )
            transcript_context = build_transcript_context(chunks)

        questions = quiz_generator.generate_adaptive_quiz(
            explanation_text=req.explanation_text,
            topic=req.topic,
            difficulty=level,
            transcript_context=transcript_context,
            num_questions=5,
        )

        return {
            "status": "success",
            "topic": req.topic,
            "questions": questions,
            "quiz_threshold": QUIZ_PASS_THRESHOLD,
        }
    except Exception as e:
        print(f"[Quiz] generate-quiz error: {e}")
        return {
            "status": "error",
            "message": f"Quiz generation failed: {str(e)}",
            "questions": [],
            "quiz_threshold": QUIZ_PASS_THRESHOLD,
        }


# ============================================================
# VIDEO COMPLETION + END-OF-VIDEO QUIZ
# ============================================================


@router.post("/lecture/{lecture_id}/complete")
def complete_lecture(
    lecture_id: str,
    difficulty: str = "medium",
    current_student: User = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    student_data = get_student_data(current_student)
    refresh_student_lectures(student_data, db)
    MOCK_LECTURES = student_data["lectures"]
    FINAL_VIDEO_QUIZZES = student_data["final_video_quizzes"]
    SESSIONS_STORE = student_data["sessions"]
    TRANSCRIPTS_STORE = student_data["transcripts"]
    lecture = next((l for l in MOCK_LECTURES if l["id"] == lecture_id), None)
    if not lecture:
        raise HTTPException(status_code=404, detail="Lecture not found.")
    lecture_record = get_published_lecture(lecture_id, db)
    get_or_create_persistent_session(current_student, lecture_record, db)

    if difficulty not in {"beginner", "medium", "advanced"}:
        difficulty = "medium"

    existing_quiz = FINAL_VIDEO_QUIZZES.get(lecture_id)
    if existing_quiz:
        state = get_or_create_session(
            lecture_id, student_data, current_student.full_name
        )
        state["completion_percentage"] = 100.0
        SESSIONS_STORE[lecture_id] = dict(state)
        mark_persistent_session_completed(current_student, lecture_record, db)
        return {
            "status": "success",
            "lecture_id": lecture_id,
            "lecture_title": lecture["title"],
            "completed": True,
            "already_generated": True,
            "quiz_available": True,
            "final_video_quiz": existing_quiz,
        }

    state = get_or_create_session(lecture_id, student_data, current_student.full_name)
    state["completion_percentage"] = 100.0
    SESSIONS_STORE[lecture_id] = dict(state)

    transcript_entries = TRANSCRIPTS_STORE.get(lecture_id, [])
    if not transcript_entries:
        raise HTTPException(
            status_code=404, detail="No transcript found for this lecture."
        )

    representative_entries = select_representative_chunks(
        transcript_entries, max_chunks=60
    )
    full_lecture_text = build_transcript_context(
        representative_entries, max_chars=30000
    )

    try:
        questions = quiz_generator.generate_video_quiz(
            video_title=lecture["title"],
            transcript_context=full_lecture_text,
            difficulty=difficulty,
            num_questions=quiz_generator.WHOLE_VIDEO_TARGET_QUESTIONS,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Whole-video quiz generation failed: {e}"
        )

    if not questions or len(questions) < quiz_generator.WHOLE_VIDEO_MIN_QUESTIONS:
        raise HTTPException(
            status_code=500,
            detail=f"Quiz generated only {len(questions)} questions. At least {quiz_generator.WHOLE_VIDEO_MIN_QUESTIONS} are required.",
        )

    questions = questions[:25]
    FINAL_VIDEO_QUIZZES[lecture_id] = {
        "quiz_type": "full_video",
        "difficulty": difficulty,
        "question_count": len(questions),
        "questions": questions,
        "quiz_threshold": QUIZ_PASS_THRESHOLD,
    }
    mark_persistent_session_completed(current_student, lecture_record, db)

    return {
        "status": "success",
        "lecture_id": lecture_id,
        "lecture_title": lecture["title"],
        "completed": True,
        "already_generated": False,
        "quiz_available": True,
        "final_video_quiz": FINAL_VIDEO_QUIZZES[lecture_id],
    }


# ============================================================
# STORED FINAL VIDEO QUIZ
# ============================================================


@router.get("/lecture/{lecture_id}/final-quiz")
def get_final_video_quiz(
    lecture_id: str,
    difficulty: str = "medium",
    current_student: User = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    student_data = get_student_data(current_student)
    refresh_student_lectures(student_data, db)
    MOCK_LECTURES = student_data["lectures"]
    FINAL_VIDEO_QUIZZES = student_data["final_video_quizzes"]
    lecture = next((l for l in MOCK_LECTURES if l["id"] == lecture_id), None)
    if not lecture:
        raise HTTPException(status_code=404, detail="Lecture not found.")

    quiz = FINAL_VIDEO_QUIZZES.get(lecture_id)
    if not quiz:
        return {
            "status": "not_ready",
            "lecture_id": lecture_id,
            "lecture_title": lecture["title"],
            "quiz_available": False,
            "questions": [],
            "question_count": 0,
            "message": "Whole-video quiz has not been generated yet. Complete the video first.",
        }

    return {
        "status": "success",
        "lecture_id": lecture_id,
        "lecture_title": lecture["title"],
        "quiz_available": True,
        **quiz,
    }


class LectureFeedbackCreate(BaseModel):
    understanding: int
    difficulty: int
    clarity: int
    pace: int
    difficult_part: str
    additional_support: str
    suggestion: Optional[str] = None

@router.post("/lecture/{lecture_id}/feedback")
async def submit_lecture_feedback(
    lecture_id: str,
    feedback: LectureFeedbackCreate,
    current_student: User = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    
    student_data = get_student_data(current_student)
    MOCK_LECTURES = student_data["lectures"]
    lecture_dict = next((l for l in MOCK_LECTURES if l["id"] == lecture_id), None)
    print("SUBMIT FEEDBACK lecture_id:", lecture_id)
    print("MOCK LECTURE DICT:", lecture_dict)
    
    # Try to find corresponding DB lecture
    db_lecture = get_published_lecture(lecture_id, db)
    print("DB LECTURE FROM GET PUBLISHED:", db_lecture)

    # Proceed to check DB if not in mock store

    # Try to find corresponding DB lecture
    db_lecture = get_published_lecture(lecture_id, db)
    
    # If not found by UUID, try to find by title from MOCK_LECTURES
    if not db_lecture:
        db_lecture = db.query(Lecture).filter(Lecture.title == (lecture_dict.get("title", "") if lecture_dict else "")).first()
        
    if not db_lecture:
        return {"message": "Lecture not in DB, skipping feedback"}

    existing = db.query(LectureFeedback).filter(
        LectureFeedback.lecture_id == db_lecture.id,
        LectureFeedback.student_id == current_student.id
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Feedback already submitted for this lecture")

    new_feedback = LectureFeedback(
        lecture_id=db_lecture.id,
        student_id=current_student.id,
        understanding=feedback.understanding,
        difficulty=feedback.difficulty,
        clarity=feedback.clarity,
        pace=feedback.pace,
        difficult_part=feedback.difficult_part,
        additional_support=feedback.additional_support,
        suggestion=feedback.suggestion
    )
    db.add(new_feedback)
    db.commit()
    return {"message": "Feedback submitted successfully"}

@router.get("/lecture/{lecture_id}/feedback")
async def get_lecture_feedback(
    lecture_id: str,
    current_student: User = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    
    student_data = get_student_data(current_student)
    MOCK_LECTURES = student_data["lectures"]
    lecture_dict = next((l for l in MOCK_LECTURES if l["id"] == lecture_id), None)
    print("SUBMIT FEEDBACK lecture_id:", lecture_id)
    print("MOCK LECTURE DICT:", lecture_dict)
    
    # Try to find corresponding DB lecture
    db_lecture = get_published_lecture(lecture_id, db)
    print("DB LECTURE FROM GET PUBLISHED:", db_lecture)

    
    db_lecture = get_published_lecture(lecture_id, db)
    if not db_lecture and lecture_dict:
        db_lecture = db.query(Lecture).filter(Lecture.title == (lecture_dict.get("title", "") if lecture_dict else "")).first()
        
    if not db_lecture:
        return None

    existing = db.query(LectureFeedback).filter(
        LectureFeedback.lecture_id == db_lecture.id,
        LectureFeedback.student_id == current_student.id
    ).first()

    if not existing:
        return None

    return {
        "understanding": existing.understanding,
        "difficulty": existing.difficulty,
        "clarity": existing.clarity,
        "pace": existing.pace,
        "difficult_part": existing.difficult_part,
        "additional_support": existing.additional_support,
        "suggestion": existing.suggestion
    }


# ============================================================
# STUDENT AI CHATBOT
# ============================================================

class StudentChatbotRequest(BaseModel):
    message: str


@router.post("/chatbot")
def student_chatbot(
    request: StudentChatbotRequest,
    current_student: User = Depends(get_current_student),
):
    """General AI chatbot for authenticated students."""

    message = request.message.strip()

    if not message:
        raise HTTPException(
            status_code=400,
            detail="Please enter a message.",
        )

    if len(message) > 4000:
        raise HTTPException(
            status_code=400,
            detail="Message is too long. Please keep it under 4000 characters.",
        )

    try:
        client = generator.GroqRAGGenerator.get_client()

        if client is None:
            raise HTTPException(
                status_code=503,
                detail="AI chatbot is currently unavailable. Please try again later.",
            )

        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are CogniTrace AI, a friendly educational "
                        "assistant for college students. Answer questions "
                        "clearly and accurately. Explain difficult concepts "
                        "step by step and provide examples when helpful. "
                        "This is a general chatbot, so you may answer "
                        "questions beyond lecture transcripts. If you are "
                        "uncertain, say so honestly."
                    ),
                },
                {
                    "role": "user",
                    "content": message,
                },
            ],
            temperature=0.4,
            max_tokens=1024,
        )

        answer = response.choices[0].message.content

        if not answer or not answer.strip():
            raise HTTPException(
                status_code=502,
                detail="The AI returned an empty response. Please try again.",
            )

        return {"reply": answer.strip()}

    except HTTPException:
        raise
    except Exception as e:
        print("[CHATBOT] Groq error:", str(e))
        raise HTTPException(
            status_code=502,
            detail="The chatbot could not generate a response. Please try again."
        )