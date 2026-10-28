#backend/app/services/faculty/lecture_storage.py

import json
from pathlib import Path
from typing import Any, Dict, List


# backend/storage/lectures
BACKEND_DIR = Path(__file__).resolve().parents[3]
LECTURES_STORAGE_DIR = BACKEND_DIR / "storage" / "lectures"


def ensure_storage_directory() -> None:
    """Create the main lecture storage directory if it does not exist."""
    LECTURES_STORAGE_DIR.mkdir(parents=True, exist_ok=True)


def get_lecture_directory(lecture_id: str) -> Path:
    """Return the storage directory for a specific lecture."""
    ensure_storage_directory()

    lecture_dir = LECTURES_STORAGE_DIR / lecture_id
    lecture_dir.mkdir(parents=True, exist_ok=True)

    return lecture_dir


def save_metadata(lecture_id: str, metadata: Dict[str, Any]) -> str:
    """Save lecture metadata as metadata.json."""
    lecture_dir = get_lecture_directory(lecture_id)

    metadata_path = lecture_dir / "metadata.json"

    with metadata_path.open("w", encoding="utf-8") as file:
        json.dump(metadata, file, indent=4, ensure_ascii=False)

    return str(metadata_path)


def save_transcript(
    lecture_id: str,
    transcript: List[Dict[str, Any]]
) -> str:
    """Save the complete timestamped transcript as transcript.json."""
    lecture_dir = get_lecture_directory(lecture_id)

    transcript_path = lecture_dir / "transcript.json"

    with transcript_path.open("w", encoding="utf-8") as file:
        json.dump(transcript, file, indent=4, ensure_ascii=False)

    return str(transcript_path)


def get_metadata(lecture_id: str) -> Dict[str, Any]:
    """Load metadata.json for a lecture."""
    lecture_dir = get_lecture_directory(lecture_id)
    metadata_path = lecture_dir / "metadata.json"

    if not metadata_path.exists():
        return {}

    with metadata_path.open("r", encoding="utf-8") as file:
        return json.load(file)


def get_transcript(lecture_id: str) -> List[Dict[str, Any]]:
    """Load transcript.json for a lecture."""
    lecture_dir = get_lecture_directory(lecture_id)
    transcript_path = lecture_dir / "transcript.json"

    if not transcript_path.exists():
        return []

    with transcript_path.open("r", encoding="utf-8") as file:
        return json.load(file)


def get_video_path(lecture_id: str) -> Path:
    """Return the expected local video path for a lecture."""
    lecture_dir = get_lecture_directory(lecture_id)

    return lecture_dir / "video.mp4"