"""
backend/app/routers/faculty_store.py

CogniTrace - Faculty Data Store

The Faculty module uses persistent lecture storage as its source
of truth.

Lecture data is loaded from:

backend/storage/lectures/<lecture_id>/

Each lecture directory may contain:

    metadata.json
    transcript.json
    video.mp4

IMPORTANT:
- No dummy lectures are created here.
- No dummy students are created here.
- No dummy questions are created here.
- No dummy confusion data is created here.
- No dummy suggestions are created here.
- No dummy transcripts are created here.
- Student data remains independent from this Faculty store.
"""

from pathlib import Path
from typing import Any, Dict, List
import json


# ============================================================
# FACULTY INFORMATION
# ============================================================

FACULTY = {
    "faculty_id": "faculty_1",
    "faculty_name": "Faculty",
    "course_name": "CogniTrace Course",
}


# ============================================================
# STORAGE LOCATION
# ============================================================

BACKEND_DIR = Path(__file__).resolve().parents[2]

LECTURES_STORAGE_DIR = (
    BACKEND_DIR / "storage" / "lectures"
)


# ============================================================
# EMPTY FACULTY-SIDE ANALYTICS STORES
# ============================================================
#
# These are intentionally empty.
#
# They will later be populated from real student telemetry,
# quiz attempts, confusion detection, etc.
#
# DO NOT ADD DEMO DATA HERE.
# ============================================================

STUDENTS: List[Dict[str, Any]] = []

QUESTIONS: Dict[str, List[Dict[str, Any]]] = {}

CONFUSION_DATA: Dict[str, List[Dict[str, Any]]] = {}

SUGGESTIONS: Dict[str, Dict[str, Any]] = {}

TRANSCRIPTS: Dict[str, List[Dict[str, Any]]] = {}

RECENT_ALERTS: List[Dict[str, Any]] = []


# ============================================================
# STORAGE HELPERS
# ============================================================

def ensure_storage_directory() -> None:
    """
    Ensure the lecture storage directory exists.
    """

    LECTURES_STORAGE_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )


def load_json_file(
    file_path: Path,
    default: Any,
) -> Any:
    """
    Safely load a JSON file.

    If the file does not exist or contains invalid JSON,
    return the supplied default value.
    """

    if not file_path.exists():
        return default

    try:
        with file_path.open(
            "r",
            encoding="utf-8",
        ) as file:
            return json.load(file)

    except (
        json.JSONDecodeError,
        OSError,
        TypeError,
        ValueError,
    ):
        return default


# ============================================================
# LECTURE LOADING
# ============================================================

def load_lectures_from_storage() -> List[Dict[str, Any]]:
    """
    Load every lecture that actually exists in:

        backend/storage/lectures/

    A lecture is considered valid when its directory contains
    metadata.json.

    No hardcoded lecture IDs are used.
    """

    ensure_storage_directory()

    lectures: List[Dict[str, Any]] = []

    for lecture_dir in sorted(
        LECTURES_STORAGE_DIR.iterdir()
    ):

        if not lecture_dir.is_dir():
            continue

        lecture_id = lecture_dir.name

        metadata_path = (
            lecture_dir / "metadata.json"
        )

        if not metadata_path.exists():
            continue

        metadata = load_json_file(
            metadata_path,
            {},
        )

        if not isinstance(
            metadata,
            dict,
        ):
            metadata = {}

        # ----------------------------------------------------
        # Ensure the actual directory name is the lecture ID.
        # ----------------------------------------------------

        metadata["id"] = lecture_id

        # ----------------------------------------------------
        # Transcript information
        # ----------------------------------------------------

        transcript_path = (
            lecture_dir / "transcript.json"
        )

        if transcript_path.exists():
            transcript = load_json_file(
                transcript_path,
                [],
            )

            if isinstance(
                transcript,
                list,
            ):
                metadata["has_transcript"] = (
                    len(transcript) > 0
                )

                metadata["transcript_count"] = len(
                    transcript
                )
            else:
                metadata["has_transcript"] = False
                metadata["transcript_count"] = 0

        else:
            metadata["has_transcript"] = False
            metadata["transcript_count"] = 0

        # ----------------------------------------------------
        # Video information
        # ----------------------------------------------------

        video_path = (
            lecture_dir / "video.mp4"
        )

        metadata["has_video"] = (
            video_path.exists()
        )

        if video_path.exists():
            metadata["video_path"] = str(
                video_path
            )

        # ----------------------------------------------------
        # Defaults for analytics.
        #
        # These are NOT dummy analytics.
        # They simply mean "no data yet".
        # ----------------------------------------------------

        metadata.setdefault(
            "views",
            0,
        )

        metadata.setdefault(
            "watch_percentage",
            0,
        )

        metadata.setdefault(
            "avg_quiz_score",
            0,
        )

        metadata.setdefault(
            "confusion_level",
            "No Data",
        )

        metadata.setdefault(
            "quality_score",
            0,
        )

        metadata.setdefault(
            "risk_percentage",
            0,
        )

        metadata.setdefault(
            "engagement_score",
            0,
        )

        metadata.setdefault(
            "questions_count",
            0,
        )

        metadata.setdefault(
            "status",
            "READY",
        )

        lectures.append(
            metadata
        )

    return lectures


# ============================================================
# INITIAL LECTURE STORE
# ============================================================

LECTURES = load_lectures_from_storage()


# ============================================================
# REFRESH FUNCTION
# ============================================================

def refresh_lectures() -> List[Dict[str, Any]]:
    """
    Reload lectures from persistent storage.

    This is important after a new lecture is imported because
    the API process may already be running.
    """

    global LECTURES

    LECTURES = load_lectures_from_storage()

    return LECTURES


# ============================================================
# FIND LECTURE
# ============================================================

def get_lecture_from_store(
    lecture_id: str,
) -> Dict[str, Any] | None:
    """
    Find a lecture by ID.

    The storage directory is refreshed before searching so that
    newly imported lectures are immediately available.
    """

    refresh_lectures()

    for lecture in LECTURES:

        if lecture.get("id") == lecture_id:
            return lecture

    return None


# ============================================================
# ADD / UPDATE LECTURE
# ============================================================

def add_or_update_lecture(
    lecture: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Add a lecture to the current store or update an existing
    lecture.

    Persistent storage remains the source of truth.
    """

    global LECTURES

    lecture_id = lecture.get(
        "id"
    )

    if not lecture_id:
        raise ValueError(
            "Lecture must contain an 'id'."
        )

    updated = False

    for index, existing in enumerate(
        LECTURES
    ):

        if existing.get("id") == lecture_id:

            LECTURES[index] = {
                **existing,
                **lecture,
            }

            updated = True
            break

    if not updated:
        LECTURES.append(
            lecture
        )

    return lecture


# ============================================================
# REMOVE LECTURE FROM MEMORY
# ============================================================

def remove_lecture_from_store(
    lecture_id: str,
) -> None:
    """
    Remove a lecture from the in-memory list.

    This does NOT delete the actual storage directory.

    Persistent deletion, if ever required, should be handled
    explicitly by a separate storage operation.
    """

    global LECTURES

    LECTURES = [
        lecture
        for lecture in LECTURES
        if lecture.get("id") != lecture_id
    ]


# ============================================================
# REFRESH ALL FACULTY DATA
# ============================================================

def refresh_faculty_store() -> None:
    """
    Refresh persistent lecture data.

    Analytics stores remain empty until real data is generated.
    """

    refresh_lectures()