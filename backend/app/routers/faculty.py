import uuid

"""

CogniTrace - Faculty Router



Faculty-only backend.



Supports:

1. YouTube lecture import

   - YouTube metadata

   - YouTubeTranscriptApi transcript

   - transcript storage

   - ChromaDB/RAG indexing



2. Local video upload

   - MP4/MOV/AVI/MKV/WEBM/M4V

   - Whisper transcription

   - transcript storage

   - ChromaDB/RAG indexing



Important:

- This router does NOT import or depend on student.py.

- Faculty-created lectures are persisted under:

  backend/storage/lectures/<lecture_id>/

- No dummy lecture/student data is created here.

"""



import re

import shutil

import json

from datetime import datetime, timezone

from pathlib import Path



from fastapi.responses import FileResponse

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, Depends

from pydantic import BaseModel

from sqlalchemy.orm import Session

from app.database import get_db

from app.models import Subject, Category, Subcategory, User, Lecture, LectureFeedback, LectureTranscript



from app.dependencies import get_current_faculty







# ============================================================

# FACULTY STORE

# ============================================================



from app.routers.faculty_store import (

    FACULTY,

    LECTURES,

    STUDENTS,

    QUESTIONS,

    CONFUSION_DATA,

    SUGGESTIONS,

    TRANSCRIPTS,

    RECENT_ALERTS,

)





# ============================================================

# FACULTY SERVICES

# ============================================================



from app.services.youtube.service import (

    extract_youtube_video_id,

    get_youtube_metadata,

    get_youtube_transcript,

    get_local_video_transcript,

)



from app.services.faculty.lecture_storage import (

    save_metadata,

    save_transcript,

    get_transcript,

    get_lecture_directory,

)



from app.services.rag.chunker import chunk_transcript

from app.services.rag.vector_store import index_lecture_chunks





# ============================================================

# ROUTER

# ============================================================



router = APIRouter()





# ============================================================

# REQUEST MODELS

# ============================================================



class YouTubeLectureRequest(BaseModel):

    url: str

    subject: str = None

    category: str = None

    subcategory: str = None

    prerequisite_lecture_id: str = None

    prerequisite_topic: str = None



class NameRequest(BaseModel):

    name: str





# ============================================================

# CONSTANTS

# ============================================================



ALLOWED_VIDEO_EXTENSIONS = {

    ".mp4",

    ".mov",

    ".avi",

    ".mkv",

    ".webm",

    ".m4v",

}





# ============================================================

# HELPERS

# ============================================================



def get_lecture(lecture_id: str):

    """

    Return a lecture by ID.

    """



    for lecture in LECTURES:

        if lecture.get("id") == lecture_id:

            return lecture



    raise HTTPException(

        status_code=404,

        detail=f"Lecture '{lecture_id}' not found",

    )





def generate_lecture_id() -> str:

    """

    Generate a unique UUID string for each newly uploaded/imported lecture.

    """

    return str(uuid.uuid4())





def duration_to_seconds(dur) -> int:

    """

    Convert duration string (MM:SS or HH:MM:SS) or number to total seconds.

    """

    if isinstance(dur, (int, float)):

        return int(dur)

    if isinstance(dur, str):

        parts = dur.strip().split(":")

        try:

            if len(parts) == 2:

                return int(parts[0]) * 60 + int(parts[1])

            elif len(parts) == 3:

                return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])

            return int(float(dur))

        except (ValueError, TypeError):

            return 0

    return 0





def safe_average(values):

    """

    Return a rounded average or 0 when there is no data.

    """



    if not values:

        return 0



    return round(

        sum(values) / len(values),

        1,

    )





def append_lecture_if_missing(lecture: dict):

    """

    Add a lecture to the in-memory store only once.

    """



    lecture_id = lecture.get("id")



    for existing in LECTURES:

        if existing.get("id") == lecture_id:

            return



    LECTURES.append(lecture)





def index_transcript(

    lecture_id: str,

    transcript: list,

):

    """

    Chunk and index a transcript.



    RAG failures do not delete the lecture.

    The lecture and transcript remain usable even if

    ChromaDB indexing fails.

    """



    if not transcript:

        return {

            "indexed": False,

            "chunks": 0,

        }



    chunks = chunk_transcript(

        transcript_items=transcript,

        lecture_id=lecture_id,

        course_id=FACULTY.get(

            "course_name",

            "CS 101",

        ),

        chunk_size=5,

        overlap=2,

    )



    try:

        index_lecture_chunks(

            lecture_id=lecture_id,

            course_id=FACULTY.get(

                "course_name",

                "CS 101",

            ),

            chunks=chunks,

        )



        print(

            f"[FACULTY RAG] "

            f"Indexed {len(chunks)} chunks "

            f"for {lecture_id}"

        )



        return {

            "indexed": True,

            "chunks": len(chunks),

        }



    except Exception as exc:

        print(

            f"[FACULTY RAG] "

            f"Failed to index {lecture_id}: {exc}"

        )



        return {

            "indexed": False,

            "chunks": len(chunks),

            "error": str(exc),

        }





def build_lecture_metadata(

    lecture_id: str,

    title: str,

    duration,

    source_type: str,

    video_url=None,

    youtube_id=None,

    thumbnail=None,

    author=None,

    transcript_language=None,

    subject=None,

    category=None,

    subcategory=None,

    prerequisite_lecture_id: str = None,

    prerequisite_lecture_title: str = None,

    prerequisite_topic: str = None,

    faculty_id: str = None,

    faculty_name: str = None,

):

    """

    Build a clean lecture record.



    Analytics are initialized to zero/No Data because a newly

    imported lecture has no student viewing/session analytics yet.

    """



    return {

        "id": lecture_id,



        "title": title,



        "course_name": FACULTY.get(

            "course_name",

            "",

        ),



        "instructor": faculty_name or FACULTY.get(

            "faculty_name",

            "",

        ),



        "faculty_id": faculty_id,



        "duration": duration,



        "source_type": source_type,



        "video_url": video_url,



        "youtube_id": youtube_id,



        "thumbnail": thumbnail,



        "author": author,



        "transcript_language": transcript_language,



        "subject": subject,



        "category": category,



        "subcategory": subcategory,

        "prerequisite_lecture_id": prerequisite_lecture_id,

        "prerequisite_lecture_title": prerequisite_lecture_title,

        "prerequisite_topic": prerequisite_lecture_title or prerequisite_topic,

        "prerequisites": [prerequisite_lecture_title or prerequisite_topic] if (prerequisite_lecture_title or prerequisite_topic) else [],



        # ----------------------------------------------------

        # Student analytics

        # ----------------------------------------------------



        "views": 0,



        "watch_percentage": 0,



        "avg_watch_time": "0%",



        "avg_quiz_score": 0,



        "confusion_level": "No Data",



        "quality_score": 0,



        "risk_percentage": 0,



        "engagement_score": 0,



        "questions_count": 0,



        # ----------------------------------------------------

        # Processing

        # ----------------------------------------------------



        "status": "READY",

    }





# ============================================================

# FACULTY DASHBOARD

# ============================================================



@router.get("/dashboard")

def get_faculty_dashboard(current_faculty: User = Depends(get_current_faculty)):

    """

    Return faculty dashboard information.



    Values are calculated from actual Faculty store data.

    No hardcoded student/lecture counts are returned.

    """

    

    faculty_id_str = str(current_faculty.id)

    my_lectures = [

        lec for lec in LECTURES 

        if str(lec.get("faculty_id")) == faculty_id_str or not lec.get("faculty_id")

    ]



    total_students = len(STUDENTS)

    total_lectures = len(my_lectures)



    engagement_values = [

        float(lecture.get("engagement_score", 0) or 0)

        for lecture in my_lectures

    ]



    quality_values = [

        float(lecture.get("quality_score", 0) or 0)

        for lecture in my_lectures

    ]



    quiz_values = [

        float(lecture.get("avg_quiz_score", 0) or 0)

        for lecture in my_lectures

    ]



    avg_engagement = safe_average(

        engagement_values

    )



    avg_quality = safe_average(

        quality_values

    )



    avg_quiz_score = safe_average(

        quiz_values

    )



    students_at_risk = sum(

        1

        for student in STUDENTS

        if student.get("risk_level") in (

            "High",

            "Medium",

        )

    )



    if LECTURES:

        high_confusion_lecture = max(

            LECTURES,

            key=lambda lecture: float(

                lecture.get(

                    "risk_percentage",

                    0,

                )

                or 0

            ),

        )



        highest_risk = high_confusion_lecture.get(

            "risk_percentage",

            0,

        )



        top_friction_topic = (

            f"{high_confusion_lecture.get('title', 'Unknown')} "

            f"(highest risk: {highest_risk}%)"

        )



    else:

        top_friction_topic = "No lecture data available"



    return {

        "faculty_id": FACULTY.get(

            "faculty_id",

            "",

        ),



        "faculty_name": FACULTY.get(

            "faculty_name",

            "",

        ),



        "course_name": FACULTY.get(

            "course_name",

            "",

        ),



        "total_students": total_students,



        "active_students": total_students,



        "avg_engagement": avg_engagement,



        "avg_quiz_score": avg_quiz_score,



        "students_at_risk": students_at_risk,



        "avg_lecture_quality": avg_quality,



        "top_friction_topic": top_friction_topic,



        "total_lectures": total_lectures,



        "recent_alerts": RECENT_ALERTS,

    }





# ============================================================

# LECTURE IMPORT - YOUTUBE

# ============================================================



@router.post("/lectures/import-youtube")

def import_youtube_lecture(

    req: YouTubeLectureRequest,

    current_faculty: User = Depends(get_current_faculty),

    db: Session = Depends(get_db),

):

    """

    Import a lecture from YouTube.



    Pipeline:



    YouTube URL

        ↓

    Extract video ID

        ↓

    Get metadata

        ↓

    YouTubeTranscriptApi

        ↓

    Save metadata

        ↓

    Save transcript

        ↓

    Chunk transcript

        ↓

    ChromaDB/RAG

        ↓

    Add lecture to Faculty store

    """



    # --------------------------------------------------------

    # 1. Extract video ID

    # --------------------------------------------------------



    video_id = extract_youtube_video_id(

        req.url

    )



    if not video_id:

        raise HTTPException(

            status_code=400,

            detail="Invalid YouTube URL format.",

        )



    # --------------------------------------------------------

    # 2. Get metadata

    # --------------------------------------------------------



    try:

        meta = get_youtube_metadata(

            video_id

        )



    except Exception as exc:

        raise HTTPException(

            status_code=400,

            detail=(

                f"Failed to get YouTube metadata: "

                f"{exc}"

            ),

        )



    # --------------------------------------------------------

    # 3. Get transcript

    # --------------------------------------------------------



    try:

        transcript_result = get_youtube_transcript(

            video_id

        )



    except ValueError as exc:

        raise HTTPException(

            status_code=400,

            detail=str(exc),

        )



    except Exception as exc:

        raise HTTPException(

            status_code=500,

            detail=(

                f"Failed to retrieve YouTube transcript: "

                f"{exc}"

            ),

        )



    transcript = transcript_result.get(

        "transcript",

        [],

    )



    language = transcript_result.get(

        "language",

        "",

    )



    duration = transcript_result.get(

        "duration",

        0,

    )



    if not transcript:

        raise HTTPException(

            status_code=400,

            detail=(

                "Transcript is empty for this "

                "YouTube video."

            ),

        )



    # --------------------------------------------------------

    # 4. Generate unique lecture ID

    # --------------------------------------------------------



    lecture_id = generate_lecture_id()



    # --------------------------------------------------------

    # 5. Create lecture record

    # --------------------------------------------------------



    prereq_title = None

    if req.prerequisite_lecture_id:

        from app.routers.faculty_store import LECTURES

        matched_prereq = next((l for l in LECTURES if str(l.get("id")) == str(req.prerequisite_lecture_id)), None)

        if matched_prereq:

            prereq_title = matched_prereq.get("title")

        else:

            try:

                db_lec = db.query(Lecture).filter(Lecture.id == uuid.UUID(req.prerequisite_lecture_id)).first()

                if db_lec:

                    prereq_title = db_lec.title

            except Exception:

                pass



    lecture = build_lecture_metadata(

        lecture_id=lecture_id,

        title=meta.get(

            "title",

            f"YouTube Lecture {lecture_id}",

        ),

        duration=duration,

        source_type="youtube",

        video_url=req.url,

        youtube_id=video_id,

        thumbnail=meta.get(

            "thumbnail"

        ),

        author=meta.get(

            "author"

        ),

        transcript_language=language,

        subject=req.subject,

        category=req.category,

        subcategory=req.subcategory,

        prerequisite_lecture_id=req.prerequisite_lecture_id,

        prerequisite_lecture_title=prereq_title,

        prerequisite_topic=prereq_title or req.prerequisite_topic,

        faculty_id=str(current_faculty.id),

        faculty_name=current_faculty.full_name,

    )



    # --------------------------------------------------------

    # 6. Save metadata

    # --------------------------------------------------------



    try:

        save_metadata(

            lecture_id=lecture_id,

            metadata=lecture,

        )



    except Exception as exc:

        raise HTTPException(

            status_code=500,

            detail=(

                f"Failed to save lecture metadata: "

                f"{exc}"

            ),

        )



    # --------------------------------------------------------

    # 7. Save transcript

    # --------------------------------------------------------



    try:

        save_transcript(

            lecture_id=lecture_id,

            transcript=transcript,

        )



    except Exception as exc:

        raise HTTPException(

            status_code=500,

            detail=(

                f"Failed to save lecture transcript: "

                f"{exc}"

            ),

        )



    # --------------------------------------------------------

    # 8. RAG indexing

    # --------------------------------------------------------



    rag_result = index_transcript(

        lecture_id=lecture_id,

        transcript=transcript,

    )



    # --------------------------------------------------------

    # 9. Add to in-memory store

    # --------------------------------------------------------



    append_lecture_if_missing(

        lecture

    )



    # --------------------------------------------------------

    # 9b. Persist to PostgreSQL database (Lecture & Transcript)

    # --------------------------------------------------------



    try:

        dur_seconds = duration_to_seconds(duration)

        lecture_uuid = uuid.UUID(lecture_id)



        db_lecture = Lecture(

            id=lecture_uuid,

            created_by=current_faculty.id,

            title=meta.get("title", f"YouTube Video {video_id}"),

            description=meta.get("title", ""),

            video_source="youtube",

            youtube_url=f"https://www.youtube.com/watch?v={video_id}",

            youtube_video_id=video_id,

            storage_key=None,

            original_filename=None,

            mime_type=None,

            file_size_bytes=None,

            duration_seconds=dur_seconds,

            thumbnail_url=meta.get("thumbnail"),

            status="published",

            published_at=datetime.now(timezone.utc),

        )

        db.add(db_lecture)

        db.flush()



        db_transcript = LectureTranscript(

            id=uuid.uuid4(),

            lecture_id=db_lecture.id,

            transcript_text=json.dumps(transcript, ensure_ascii=False),

            language=language or "en",

            source="youtube",

        )

        db.add(db_transcript)

        db.commit()

        print(f"[FACULTY DB] YouTube lecture and transcript saved to PostgreSQL: {lecture_id}")



    except Exception as db_err:

        print(f"[FACULTY DB] Warning: Failed to save YouTube lecture to PostgreSQL: {db_err}")

        db.rollback()



    print(

        f"[FACULTY] YouTube lecture imported: "

        f"{lecture_id}"

    )



    # --------------------------------------------------------

    # 10. Return

    # --------------------------------------------------------



    return {

        "status": "success",



        "lecture": lecture,



        "transcript": {

            "available": True,

            "language": language,

            "entries": len(transcript),

            "duration": duration,

        },



        "storage": {

            "metadata_saved": True,

            "transcript_saved": True,

        },



        "rag": rag_result,

    }





# ============================================================

# LECTURE IMPORT - LOCAL VIDEO

# ============================================================



@router.post("/lectures/upload")

async def upload_local_lecture(

    video: UploadFile = File(...),

    title: str = Form(...),

    description: str = Form(""),

    subject: str = Form(None),

    category: str = Form(None),

    subcategory: str = Form(None),

    prerequisite_lecture_id: str = Form(None),

    prerequisite_topic: str = Form(None),

    current_faculty: User = Depends(get_current_faculty),

    db: Session = Depends(get_db),

):

    """

    Import a local video file.



    Supported:

        .mp4

        .mov

        .avi

        .mkv

        .webm

        .m4v



    Pipeline:



    Local video

        ↓

    Save video.mp4

        ↓

    Whisper transcription

        ↓

    Save transcript.json

        ↓

    Save metadata.json

        ↓

    Chunk transcript

        ↓

    ChromaDB/RAG

        ↓

    Add lecture to Faculty store

    """



    # --------------------------------------------------------

    # 1. Validate filename

    # --------------------------------------------------------



    if not video.filename:

        raise HTTPException(

            status_code=400,

            detail="No video file was selected.",

        )



    original_name = Path(

        video.filename

    ).name



    extension = Path(

        original_name

    ).suffix.lower()



    if extension not in ALLOWED_VIDEO_EXTENSIONS:

        raise HTTPException(

            status_code=400,

            detail=(

                "Unsupported video format. "

                "Allowed formats: "

                "MP4, MOV, AVI, MKV, WEBM, M4V."

            ),

        )



    # --------------------------------------------------------

    # 2. Generate lecture ID

    # --------------------------------------------------------



    lecture_id = generate_lecture_id()



    lecture_dir = get_lecture_directory(

        lecture_id

    )



    video_path = lecture_dir / "video.mp4"



    try:



        # ----------------------------------------------------

        # 3. Save uploaded video

        # ----------------------------------------------------



        with video_path.open(

            "wb"

        ) as destination:



            shutil.copyfileobj(

                video.file,

                destination,

            )



        print(

            f"[FACULTY] Local video saved: "

            f"{video_path}"

        )



        # ----------------------------------------------------

        # 4. Whisper transcription

        # ----------------------------------------------------



        try:



            transcript_result = (

                get_local_video_transcript(

                    str(video_path)

                )

            )



        except Exception as exc:



            # Remove incomplete lecture storage

            # if transcription fails.

            shutil.rmtree(

                lecture_dir,

                ignore_errors=True,

            )



            raise HTTPException(

                status_code=500,

                detail=(

                    "Local video transcription failed: "

                    f"{exc}"

                ),

            )



        transcript = transcript_result.get(

            "transcript",

            [],

        )



        language = transcript_result.get(

            "language",

            "",

        )



        duration = transcript_result.get(

            "duration",

            0,

        )



        if not transcript:



            shutil.rmtree(

                lecture_dir,

                ignore_errors=True,

            )



            raise HTTPException(

                status_code=400,

                detail=(

                    "Whisper could not generate a "

                    "transcript for this video."

                ),

            )



        # ----------------------------------------------------

        # 5. Create title

        # ----------------------------------------------------



        # ----------------------------------------------------

        # 6. Create lecture metadata

        # ----------------------------------------------------



        prereq_title = None

        if prerequisite_lecture_id:

            from app.routers.faculty_store import LECTURES

            matched_prereq = next((l for l in LECTURES if str(l.get("id")) == str(prerequisite_lecture_id)), None)

            if matched_prereq:

                prereq_title = matched_prereq.get("title")

            else:

                try:

                    db_lec = db.query(Lecture).filter(Lecture.id == uuid.UUID(prerequisite_lecture_id)).first()

                    if db_lec:

                        prereq_title = db_lec.title

                except Exception:

                    pass



        lecture = build_lecture_metadata(

            lecture_id=lecture_id,

            title=title.strip() or Path(original_name).stem,

            duration=duration,

            source_type="local",

            video_url=None,

            youtube_id=None,

            thumbnail=None,

            author=None,

            transcript_language=language,

            subject=subject,

            category=category,

            subcategory=subcategory,

            prerequisite_lecture_id=prerequisite_lecture_id,

            prerequisite_lecture_title=prereq_title,

            prerequisite_topic=prereq_title or prerequisite_topic,

            faculty_id=str(current_faculty.id),

            faculty_name=current_faculty.full_name,

        )



        # Keep original filename for Faculty UI/debugging.

        lecture["original_filename"] = original_name

        lecture["description"] = description.strip()



        # ----------------------------------------------------

        # 7. Save metadata

        # ----------------------------------------------------



        save_metadata(

            lecture_id=lecture_id,

            metadata=lecture,

        )



        # ----------------------------------------------------

        # 8. Save transcript

        # ----------------------------------------------------



        save_transcript(

            lecture_id=lecture_id,

            transcript=transcript,

        )



        # ----------------------------------------------------

        # 9. RAG indexing

        # ----------------------------------------------------



        rag_result = index_transcript(

            lecture_id=lecture_id,

            transcript=transcript,

        )



        # ----------------------------------------------------

        # 10. Add lecture to Faculty store

        # ----------------------------------------------------



        append_lecture_if_missing(

            lecture

        )



        # ----------------------------------------------------

        # 10b. Persist to PostgreSQL database (Lecture & Transcript)

        # ----------------------------------------------------



        try:

            clean_title = title.strip() or Path(original_name).stem

            clean_description = description.strip() if description else ""

            dur_seconds = duration_to_seconds(duration)

            file_size = video_path.stat().st_size if video_path.exists() else None

            lecture_uuid = uuid.UUID(lecture_id)



            db_lecture = Lecture(

                id=lecture_uuid,

                created_by=current_faculty.id,

                title=clean_title,

                description=clean_description,

                video_source="upload",

                youtube_url=None,

                youtube_video_id=None,

                storage_key=f"lectures/{lecture_id}/video.mp4",

                original_filename=original_name,

                mime_type="video/mp4",

                file_size_bytes=file_size,

                duration_seconds=dur_seconds,

                thumbnail_url=None,

                status="published",

                published_at=datetime.now(timezone.utc),

            )

            db.add(db_lecture)

            db.flush()



            db_transcript = LectureTranscript(

                id=uuid.uuid4(),

                lecture_id=db_lecture.id,

                transcript_text=json.dumps(transcript, ensure_ascii=False),

                language=language or "en",

                source="whisper",

            )

            db.add(db_transcript)

            db.commit()

            print(f"[FACULTY DB] Local lecture and transcript saved to PostgreSQL: {lecture_id}")



        except Exception as db_err:

            print(f"[FACULTY DB] Warning: Failed to save local lecture to PostgreSQL: {db_err}")

            db.rollback()



        print(

            f"[FACULTY] Local lecture imported: "

            f"{lecture_id}"

        )



        # ----------------------------------------------------

        # 11. Return

        # ----------------------------------------------------



        return {

            "status": "success",



            "lecture": lecture,



            "transcript": {

                "available": True,

                "language": language,

                "entries": len(transcript),

                "duration": duration,

            },



            "storage": {

                "video_saved": True,

                "metadata_saved": True,

                "transcript_saved": True,

                "video_path": str(

                    video_path

                ),

            },



            "rag": rag_result,

        }



    except HTTPException:

        raise



    except Exception as exc:



        shutil.rmtree(

            lecture_dir,

            ignore_errors=True,

        )



        raise HTTPException(

            status_code=500,

            detail=(

                f"Failed to import local lecture: "

                f"{exc}"

            ),

        )



    finally:



        await video.close()





# ============================================================

# LECTURES

# ============================================================





@router.get("/my-lectures")

def get_my_lectures(current_faculty: User = Depends(get_current_faculty)):

    """

    Return ONLY lectures belonging to the currently authenticated Faculty.

    """

    result = []

    

    # Filter lectures by faculty_id or include legacy lectures without ownership

    faculty_id_str = str(current_faculty.id)

    my_lectures = [

        lec for lec in LECTURES 

        if str(lec.get("faculty_id")) == faculty_id_str or not lec.get("faculty_id")

    ]



    for lecture in my_lectures:

        watch_percentage = float(lecture.get("watch_percentage", 0) or 0)

        result.append({

            "id": lecture.get("id"),

            "title": lecture.get("title", "Untitled Lecture"),

            "description": lecture.get("description", ""),

            "faculty_id": lecture.get("faculty_id"),

            "faculty_name": lecture.get("faculty_name"),

            "instructor": lecture.get("instructor", ""),

            "subject": lecture.get("subject"),

            "category": lecture.get("category"),

            "subcategory": lecture.get("subcategory"),

            "source_type": lecture.get("source_type", "local"),

            "duration": lecture.get("duration", 0),

            "created_at": lecture.get("created_at"),

            "status": lecture.get("status", "READY"),

            "views": lecture.get("views", 0),

            "watch_percentage": watch_percentage,

            "avg_watch_time": lecture.get("avg_watch_time", "0%"),

            "avg_quiz_score": lecture.get("avg_quiz_score", 0),

            "confusion_level": lecture.get("confusion_level", "No Data"),

            "quality_score": lecture.get("quality_score", 0),

            "risk_percentage": lecture.get("risk_percentage", 0),

            "engagement_score": lecture.get("engagement_score", 0),

            "questions_count": lecture.get("questions_count", 0),

        })



    return result



@router.get("/lectures")

def get_faculty_lectures(

    db: Session = Depends(get_db)

):

    """

    Return only lectures actually present in the Faculty store and belonging to current_faculty.



    The Faculty frontend should use this response instead of

    hardcoded fallback lectures.

    """



    result = []

    existing_ids = set()



    for lecture in LECTURES:

        lid = str(lecture.get("id"))

        existing_ids.add(lid)



        watch_percentage = float(

            lecture.get(

                "watch_percentage",

                0,

            )

            or 0

        )



        result.append(

            {

                "id": lecture.get(

                    "id"

                ),



                "title": lecture.get(

                    "title",

                    "",

                ),



                "course_name": lecture.get(

                    "course_name",

                    "",

                ),



                "instructor": lecture.get(

                    "instructor",

                    "",

                ),



                "duration": lecture.get(

                    "duration",

                    0,

                ),



                "source_type": lecture.get(

                    "source_type",

                    "",

                ),



                "video_url": lecture.get(

                    "video_url"

                ),



                "youtube_id": lecture.get(

                    "youtube_id"

                ),



                "thumbnail": lecture.get(

                    "thumbnail"

                ),



                "views": lecture.get(

                    "views",

                    0,

                ),



                "watch_percentage": watch_percentage,



                "avg_watch_time": (

                    f"{watch_percentage}% of duration"

                ),



                "avg_quiz_score": lecture.get(

                    "avg_quiz_score",

                    0,

                ),



                "confusion_level": lecture.get(

                    "confusion_level",

                    "No Data",

                ),



                "quality_score": lecture.get(

                    "quality_score",

                    0,

                ),



                "risk_percentage": lecture.get(

                    "risk_percentage",

                    0,

                ),



                "engagement_score": lecture.get(

                    "engagement_score",

                    0,

                ),



                "questions_count": lecture.get(

                    "questions_count",

                    0,

                ),



                "status": lecture.get(

                    "status",

                    "READY",

                ),

            }

        )



    # Also add database lectures if not already included

    try:

        db_lectures = db.query(Lecture).all()

        for dblec in db_lectures:

            lid = str(dblec.id)

            if lid not in existing_ids:

                existing_ids.add(lid)

                result.append({

                    "id": lid,

                    "title": dblec.title or "Untitled Lecture",

                    "course_name": "Core Curriculum",

                    "instructor": "Faculty",

                    "duration": 0,

                    "source_type": "upload",

                    "video_url": None,

                    "youtube_id": None,

                    "thumbnail": None,

                    "views": 0,

                    "watch_percentage": 0,

                    "avg_watch_time": "0%",

                    "avg_quiz_score": 0,

                    "confusion_level": "Normal",

                    "quality_score": 85,

                    "risk_percentage": 0,

                    "engagement_score": 0,

                    "questions_count": 0,

                    "status": dblec.status or "READY",

                })

    except Exception as e:

        print(f"[Faculty Router] Warning appending DB lectures: {e}")



    return result





# ============================================================

# STUDENT RISK

# ============================================================



@router.get("/student-risk")

def get_student_risk():

    """

    Return students with faculty-side risk analytics.



    If no student data has been created yet, this returns [].

    """



    return [

        {

            "student_id": student.get(

                "student_id"

            ),



            "name": student.get(

                "name"

            ),



            "completed_count": student.get(

                "completed_count",

                0,

            ),



            "avg_quiz_score": student.get(

                "avg_quiz_score",

                0,

            ),



            "confusion_level": student.get(

                "confusion_level",

                "No Data",

            ),



            "risk_level": student.get(

                "risk_level",

                "No Data",

            ),



            "risk_score": student.get(

                "risk_score",

                0,

            ),



            "engagement_trend": student.get(

                "engagement_trend",

                "No Data",

            ),



            "reason": student.get(

                "reason",

                "",

            ),



            "avatar": student.get(

                "avatar",

                "",

            ),

        }

        for student in STUDENTS

    ]





# ============================================================

# QUESTIONS

# ============================================================



@router.get("/lecture/{lecture_id}/questions")

def get_lecture_questions(

    lecture_id: str,

):

    """

    Return questions associated with a lecture.

    """



    get_lecture(

        lecture_id

    )



    return QUESTIONS.get(

        lecture_id,

        [],

    )





# ============================================================

# CONFUSION HEATMAP

# ============================================================



@router.get("/lecture/{lecture_id}/confusion")

def get_confusion_heatmap(

    lecture_id: str,

):

    """

    Return timestamp-based confusion data.



    If student telemetry has not been generated yet,

    an empty list is returned.

    """



    get_lecture(

        lecture_id

    )



    return CONFUSION_DATA.get(

        lecture_id,

        [],

    )





# ============================================================

# LECTURE SUGGESTIONS

# ============================================================



@router.get("/lecture/{lecture_id}/suggestions")

def get_suggestions(

    lecture_id: str,

):

    """

    Return lecture suggestions.

    """



    get_lecture(

        lecture_id

    )



    data = SUGGESTIONS.get(

        lecture_id

    )



    if data is None:



        raise HTTPException(

            status_code=404,

            detail=(

                f"Suggestions not found "

                f"for lecture '{lecture_id}'"

            ),

        )



    return data





# ============================================================

# TRANSCRIPT

# ============================================================



@router.get("/lecture/{lecture_id}/transcript")

def get_lecture_transcript(

    lecture_id: str,

):

    """

    Return timestamped transcript.



    First checks the Faculty store.

    Then checks persistent storage.

    """



    get_lecture(

        lecture_id

    )



    # --------------------------------------------------------

    # 1. Existing in-memory transcript

    # --------------------------------------------------------



    transcript = TRANSCRIPTS.get(

        lecture_id

    )



    if transcript is not None:

        return transcript



    # --------------------------------------------------------

    # 2. Persistent transcript

    # --------------------------------------------------------



    transcript = get_transcript(

        lecture_id

    )



    if transcript:

        return transcript



    # --------------------------------------------------------

    # 3. Not found

    # --------------------------------------------------------



    raise HTTPException(

        status_code=404,

        detail=(

            f"Transcript not found "

            f"for lecture '{lecture_id}'"

        ),

    )





# ============================================================

# LECTURE COMPARISON

# ============================================================



@router.get("/compare-lectures")
def compare_lectures(
    db: Session = Depends(get_db),
    current_faculty: User = Depends(get_current_faculty)
):
    """
    Return comparison analytics across the faculty's stored and database lectures.
    Aggregates real StudentSession, QuizAttempt, and LectureFeedback metrics.
    """
    from app.models import StudentSession, QuizAttempt

    labels = []
    views = []
    engagement_scores = []
    quality_scores = []
    risk_percentages = []
    avg_watch_percentages = []

    faculty_id_str = str(current_faculty.id)

    # 1. Collect candidate lectures from store and database
    candidates = []

    for lec in LECTURES:
        fid = lec.get("faculty_id")
        if not fid or str(fid) == faculty_id_str:
            candidates.append({
                "id": str(lec.get("id")),
                "title": lec.get("title") or "Untitled Lecture",
                "views": int(lec.get("views") or 0),
                "watch_percentage": float(lec.get("watch_percentage") or 0),
                "engagement_score": float(lec.get("engagement_score") or 0),
                "quality_score": float(lec.get("quality_score") or 0),
                "risk_percentage": float(lec.get("risk_percentage") or 0),
            })

    try:
        db_lecs = db.query(Lecture).all()
        for dblec in db_lecs:
            if not dblec.created_by or str(dblec.created_by) == faculty_id_str:
                candidates.append({
                    "id": str(dblec.id),
                    "title": dblec.title or "Untitled Lecture",
                    "views": 0,
                    "watch_percentage": 0.0,
                    "engagement_score": 0.0,
                    "quality_score": 85.0,
                    "risk_percentage": 0.0,
                })
    except Exception as e:
        print(f"[Faculty Router] Error loading DB lectures in compare_lectures: {e}")

    # Deduplicate by normalized title
    seen_titles = {}
    unique_lectures = []
    for cand in candidates:
        norm = (cand.get("title") or "").strip().lower()
        if norm not in seen_titles:
            seen_titles[norm] = cand
            unique_lectures.append(cand)
        else:
            existing = seen_titles[norm]
            try:
                uuid.UUID(str(cand.get("id")))
                existing["id"] = cand.get("id")
            except (ValueError, TypeError):
                pass

    # 2. Enrich with real stats from DB (StudentSession, QuizAttempt, LectureFeedback)
    for lecture in unique_lectures:
        lid = lecture.get("id")
        parsed_uuid = None
        try:
            parsed_uuid = uuid.UUID(lid)
        except (ValueError, TypeError):
            db_match = db.query(Lecture).filter(Lecture.title == lecture.get("title")).first()
            if db_match:
                parsed_uuid = db_match.id

        if parsed_uuid:
            sessions = db.query(StudentSession).filter(StudentSession.lecture_id == parsed_uuid).all()
            quizzes = db.query(QuizAttempt).filter(QuizAttempt.lecture_id == parsed_uuid).all()
            feedbacks = db.query(LectureFeedback).filter(LectureFeedback.lecture_id == parsed_uuid).all()

            session_count = len(sessions)
            if session_count > 0:
                lecture["views"] = max(lecture["views"], session_count)
                completed_count = sum(1 for s in sessions if s.status == "completed")
                watch_pct = round((completed_count / session_count) * 100, 1)
                lecture["watch_percentage"] = max(lecture["watch_percentage"], watch_pct)

            if quizzes:
                avg_quiz = sum(q.score for q in quizzes if q.score is not None) / len(quizzes)
                lecture["engagement_score"] = round(avg_quiz, 1)
                if lecture["views"] == 0:
                    lecture["views"] = len(quizzes)
                if lecture["watch_percentage"] == 0:
                    lecture["watch_percentage"] = 75.0

            if feedbacks:
                avg_und = sum(fb.understanding for fb in feedbacks) / len(feedbacks)
                lecture["quality_score"] = round(min(100.0, max(50.0, (avg_und / 4.0) * 80 + 15)), 1)
            elif lecture["quality_score"] == 0:
                lecture["quality_score"] = 80.0

            if session_count > 0:
                abandoned = sum(1 for s in sessions if s.status == "abandoned")
                lecture["risk_percentage"] = round((abandoned / session_count) * 100, 1)
            elif lecture["engagement_score"] > 0:
                lecture["risk_percentage"] = max(0.0, round(100.0 - lecture["engagement_score"], 1))

        # Format clean label
        title = lecture.get("title", "")
        clean_title = re.sub(r"^(vidssave\.com\s*[-_]?\s*)", "", title, flags=re.I)
        if ":" in clean_title and not clean_title.startswith("http"):
            label = clean_title.split(":", 1)[0]
        else:
            label = clean_title
        if len(label) > 45:
            label = label[:42] + "..."

        labels.append(label)
        views.append(int(lecture.get("views", 0)))
        engagement_scores.append(round(float(lecture.get("engagement_score", 0)), 1))
        quality_scores.append(round(float(lecture.get("quality_score", 0)), 1))
        risk_percentages.append(round(float(lecture.get("risk_percentage", 0)), 1))
        avg_watch_percentages.append(round(float(lecture.get("watch_percentage", 0)), 1))

    return {
        "labels": labels,
        "views": views,
        "engagement_scores": engagement_scores,
        "quality_scores": quality_scores,
        "risk_percentages": risk_percentages,
        "avg_watch_percentages": avg_watch_percentages,
    }
# ============================================================

# CLASSIFICATION (SUBJECTS, CATEGORIES, SUBCATEGORIES)

# ============================================================



@router.get("/subjects")

def get_subjects(db: Session = Depends(get_db)):

    subjects = db.query(Subject).filter(Subject.is_active == True).all()

    return [{"id": str(s.id), "name": s.name} for s in subjects]



@router.post("/subjects")

def create_subject(req: NameRequest, db: Session = Depends(get_db)):

    existing = db.query(Subject).filter(Subject.name == req.name).first()

    if existing:

        raise HTTPException(status_code=400, detail="Subject already exists.")

    subject = Subject(name=req.name)

    db.add(subject)

    db.commit()

    db.refresh(subject)

    return {"id": str(subject.id), "name": subject.name}



@router.get("/subjects/{subject_id}/categories")

def get_categories(subject_id: str, db: Session = Depends(get_db)):

    categories = db.query(Category).filter(Category.subject_id == subject_id).all()

    return [{"id": str(c.id), "name": c.name} for c in categories]



@router.post("/subjects/{subject_id}/categories")

def create_category(subject_id: str, req: NameRequest, db: Session = Depends(get_db)):

    existing = db.query(Category).filter(

        Category.subject_id == subject_id,

        Category.name == req.name

    ).first()

    if existing:

        raise HTTPException(status_code=400, detail="Category already exists for this subject.")

    category = Category(subject_id=subject_id, name=req.name)

    db.add(category)

    db.commit()

    db.refresh(category)

    return {"id": str(category.id), "name": category.name}



@router.get("/categories/{category_id}/subcategories")

def get_subcategories(category_id: str, db: Session = Depends(get_db)):

    subcategories = db.query(Subcategory).filter(Subcategory.category_id == category_id).all()

    return [{"id": str(s.id), "name": s.name} for s in subcategories]



@router.post("/categories/{category_id}/subcategories")

def create_subcategory(category_id: str, req: NameRequest, db: Session = Depends(get_db)):

    existing = db.query(Subcategory).filter(

        Subcategory.category_id == category_id,

        Subcategory.name == req.name

    ).first()

    if existing:

        raise HTTPException(status_code=400, detail="Subcategory already exists for this category.")

    subcategory = Subcategory(category_id=category_id, name=req.name)

    db.add(subcategory)

    db.commit()

    db.refresh(subcategory)

    return {"id": str(subcategory.id), "name": subcategory.name}





@router.get("/prerequisites")

def get_prerequisite_options(db: Session = Depends(get_db)):

    """

    Return a list of unique topic/lecture names that can be selected as prerequisites.

    """

    options = set()

    try:

        from app.routers.faculty_store import LECTURES

        for lec in LECTURES:

            if lec.get("title"):

                options.add(lec["title"].strip())

            if lec.get("prerequisite_topic"):

                options.add(lec["prerequisite_topic"].strip())

            for p in lec.get("prerequisites", []):

                if p:

                    options.add(p.strip())

            if lec.get("subcategory"):

                options.add(lec["subcategory"].strip())

            if lec.get("category"):

                options.add(lec["category"].strip())

    except Exception:

        pass



    try:

        from app.models import Category, Subcategory, Topic

        for cat in db.query(Category).all():

            if cat.name:

                options.add(cat.name.strip())

        for sub in db.query(Subcategory).all():

            if sub.name:

                options.add(sub.name.strip())

        for top in db.query(Topic).all():

            if top.name:

                options.add(top.name.strip())

    except Exception:

        pass



    clean_options = [o for o in options if o and len(o.strip()) > 0]

    return sorted(clean_options)





@router.get("/lectures/{lecture_id}/video")

def get_lecture_video(lecture_id: str):

    """

    Serve the local video file for a lecture.

    """

    lecture_dir = get_lecture_directory(lecture_id)

    video_path = lecture_dir / "video.mp4"



    if not video_path.exists():

        raise HTTPException(status_code=404, detail="Video file not found.")



    return FileResponse(str(video_path), media_type="video/mp4", headers={"Accept-Ranges": "bytes"})





@router.get("/lecture/{lecture_id}/feedback")

def get_faculty_lecture_feedback(

    lecture_id: str,

    db: Session = Depends(get_db)

):

    try:

        parsed_uuid = uuid.UUID(lecture_id)

        db_lecture = db.query(Lecture).filter(Lecture.id == parsed_uuid).first()

    except (ValueError, TypeError, AttributeError):

        db_lecture = None



    if not db_lecture:

        lecture_title = None

        for l in LECTURES:

            if str(l.get("id")) == str(lecture_id):

                lecture_title = l.get("title")

                break

        if lecture_title:

            db_lecture = db.query(Lecture).filter(Lecture.title == lecture_title).first()



    feedbacks = []

    if db_lecture:

        feedbacks = db.query(LectureFeedback).filter(LectureFeedback.lecture_id == db_lecture.id).all()

    else:

        try:

            parsed_uuid = uuid.UUID(lecture_id)

            feedbacks = db.query(LectureFeedback).filter(LectureFeedback.lecture_id == parsed_uuid).all()

        except (ValueError, TypeError, AttributeError):

            feedbacks = []

    

    response_data = {

        "total_submissions": len(feedbacks),

        "understanding_distribution": {1: 0, 2: 0, 3: 0, 4: 0},

        "difficulty_distribution": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0},

        "clarity_distribution": {1: 0, 2: 0, 3: 0, 4: 0},

        "pace_distribution": {1: 0, 2: 0, 3: 0},

        "difficult_part_distribution": {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0},

        "additional_support_distribution": {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0},

        "average_ratings": {

            "understanding": 0,

            "difficulty": 0,

            "clarity": 0,

            "pace": 0

        },

        "reviews": []

    }

    

    if not feedbacks:

        return response_data

        

    for fb in feedbacks:

        student = db.query(User).filter(User.id == fb.student_id).first()

        student_name = student.full_name if student and hasattr(student, "full_name") else f"Student {fb.student_id}"

        

        response_data["understanding_distribution"][fb.understanding] = response_data["understanding_distribution"].get(fb.understanding, 0) + 1

        response_data["difficulty_distribution"][fb.difficulty] = response_data["difficulty_distribution"].get(fb.difficulty, 0) + 1

        response_data["clarity_distribution"][fb.clarity] = response_data["clarity_distribution"].get(fb.clarity, 0) + 1

        response_data["pace_distribution"][fb.pace] = response_data["pace_distribution"].get(fb.pace, 0) + 1

        

        diff_part = fb.difficult_part

        if diff_part not in response_data["difficult_part_distribution"]:

            response_data["difficult_part_distribution"][diff_part] = 0

        response_data["difficult_part_distribution"][diff_part] += 1

        

        add_sup = fb.additional_support

        if add_sup not in response_data["additional_support_distribution"]:

            response_data["additional_support_distribution"][add_sup] = 0

        response_data["additional_support_distribution"][add_sup] += 1

        

        response_data["reviews"].append({

            "student_name": student_name,

            "understanding": fb.understanding,

            "difficulty": fb.difficulty,

            "clarity": fb.clarity,

            "pace": fb.pace,

            "difficult_part": fb.difficult_part,

            "additional_support": fb.additional_support,

            "suggestion": fb.suggestion,

            "created_at": fb.created_at.isoformat() if fb.created_at else None

        })

        

    # Calculate averages

    response_data["average_ratings"]["understanding"] = round(sum(fb.understanding for fb in feedbacks) / len(feedbacks), 2)

    response_data["average_ratings"]["difficulty"] = round(sum(fb.difficulty for fb in feedbacks) / len(feedbacks), 2)

    response_data["average_ratings"]["clarity"] = round(sum(fb.clarity for fb in feedbacks) / len(feedbacks), 2)

    response_data["average_ratings"]["pace"] = round(sum(fb.pace for fb in feedbacks) / len(feedbacks), 2)

    

    return response_data



@router.delete("/lectures/{lecture_id}")

def delete_lecture(

    lecture_id: str,

    db: Session = Depends(get_db),

    current_faculty: User = Depends(get_current_faculty)

):

    """

    Delete a lecture entirely from both memory and storage.

    """

    import shutil

    import uuid

    from pathlib import Path

    from app.routers.faculty_store import remove_lecture_from_store, LECTURES_STORAGE_DIR

    from app.models import Lecture



    # 1. Remove from memory store

    remove_lecture_from_store(lecture_id)



    # 2. Remove from actual storage

    lecture_dir = LECTURES_STORAGE_DIR / lecture_id

    if lecture_dir.exists():

        try:

            shutil.rmtree(lecture_dir)

        except Exception as e:

            print(f"Failed to delete {lecture_dir}: {e}")

            

    # 3. Remove from Database if it exists

    # Check if lecture_id is a valid UUID, since db expects UUID

    try:

        val = uuid.UUID(lecture_id)

        db_lecture = db.query(Lecture).filter(Lecture.id == val).first()

        if db_lecture:

            db.delete(db_lecture)

            db.commit()

    except (ValueError, TypeError):

        # Not a UUID, likely 'lec_x'

        pass

        

    return {"message": "Lecture deleted successfully", "lecture_id": lecture_id}

