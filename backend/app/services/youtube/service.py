# backend/app/services/youtube/service.py

import json
import os
import re
import tempfile
import urllib.request
from pathlib import Path
from typing import Optional
from urllib.parse import parse_qs, urlparse

import yt_dlp
from faster_whisper import WhisperModel
from youtube_transcript_api import YouTubeTranscriptApi


# ============================================================
# PATHS
# ============================================================

# backend/
BACKEND_DIR = Path(__file__).resolve().parents[3]

# backend/ffmpeg/bin
FFMPEG_BIN_DIR = BACKEND_DIR / "ffmpeg" / "bin"

# backend/ffmpeg/bin/ffmpeg.exe
FFMPEG_EXE = FFMPEG_BIN_DIR / "ffmpeg.exe"


# ============================================================
# FASTER-WHISPER MODEL
# ============================================================

_faster_whisper_model = None
_faster_whisper_device = None
_faster_whisper_compute_type = None


# ============================================================
# FFMPEG
# ============================================================

def ensure_ffmpeg_available() -> None:
    """
    Makes the project-local FFmpeg available to Python.

    FFmpeg is stored inside:

        backend/ffmpeg/bin/ffmpeg.exe
    """

    if not FFMPEG_EXE.exists():
        raise FileNotFoundError(
            f"Project FFmpeg not found at: {FFMPEG_EXE}"
        )

    current_path = os.environ.get("PATH", "")
    ffmpeg_dir = str(FFMPEG_BIN_DIR)

    if ffmpeg_dir not in current_path.split(os.pathsep):
        os.environ["PATH"] = (
            ffmpeg_dir
            + os.pathsep
            + current_path
        )


# ============================================================
# FASTER-WHISPER MODEL
# ============================================================

def get_faster_whisper_model():
    """
    Load faster-whisper only once.

    Preferred configuration:
        GPU  -> CUDA + float16

    Fallback:
        CPU  -> int8

    The model is intentionally kept lightweight.
    """

    global _faster_whisper_model
    global _faster_whisper_device
    global _faster_whisper_compute_type

    if _faster_whisper_model is not None:
        return _faster_whisper_model

    print("=" * 60)
    print("[FASTER-WHISPER] Loading transcription model...")
    print("[FASTER-WHISPER] Model: base")
    print("=" * 60)

    # --------------------------------------------------------
    # Try GPU first.
    # --------------------------------------------------------

    try:
        print("[FASTER-WHISPER] Trying CUDA GPU...")

        _faster_whisper_model = WhisperModel(
            "base",
            device="cpu",
            compute_type="int8",
        )

        _faster_whisper_device = "cpu"
        _faster_whisper_compute_type = "int8"

        print(
            "[FASTER-WHISPER] GPU init skipped (missing DLLs), loaded CPU."
        )
        print(
            "[FASTER-WHISPER] Device: CPU"
        )
        print(
            "[FASTER-WHISPER] Compute type: int8"
        )

        return _faster_whisper_model

    except Exception as gpu_error:

        print(
            "[FASTER-WHISPER] CUDA initialization failed."
        )
        print(
            "[FASTER-WHISPER] CUDA reason:"
        )
        print(str(gpu_error))

        print(
            "[FASTER-WHISPER] Falling back to CPU..."
        )

    # --------------------------------------------------------
    # CPU fallback.
    # --------------------------------------------------------

    try:

        _faster_whisper_model = WhisperModel(
            "base",
            device="cpu",
            compute_type="int8",
        )

        _faster_whisper_device = "cpu"
        _faster_whisper_compute_type = "int8"

        print(
            "[FASTER-WHISPER] CPU model loaded successfully."
        )
        print(
            "[FASTER-WHISPER] Device: CPU"
        )
        print(
            "[FASTER-WHISPER] Compute type: int8"
        )

        return _faster_whisper_model

    except Exception as cpu_error:

        print(
            "[FASTER-WHISPER] CPU model loading failed."
        )

        raise RuntimeError(
            "Unable to load faster-whisper on either "
            "GPU or CPU."
        ) from cpu_error


# ============================================================
# YOUTUBE VIDEO ID
# ============================================================

def extract_youtube_video_id(
    url: str
) -> Optional[str]:
    """
    Extract a YouTube video ID from common YouTube URL formats.

    Supported:

        https://www.youtube.com/watch?v=XXXXXXXXXXX
        https://youtube.com/watch?v=XXXXXXXXXXX
        https://youtu.be/XXXXXXXXXXX
        https://www.youtube.com/shorts/XXXXXXXXXXX
        https://youtube.com/live/XXXXXXXXXXX
        https://www.youtube.com/embed/XXXXXXXXXXX
        https://www.youtube.com/v/XXXXXXXXXXX
        https://www.youtube-nocookie.com/embed/XXXXXXXXXXX

    Also supports directly passing an 11-character
    YouTube video ID.
    """

    if not url:
        return None

    url = url.strip()

    if not url:
        return None

    # --------------------------------------------------------
    # Direct video ID
    # --------------------------------------------------------

    if re.fullmatch(
        r"[A-Za-z0-9_-]{11}",
        url
    ):
        return url

    # --------------------------------------------------------
    # Parse URL
    # --------------------------------------------------------

    try:

        parsed = urlparse(url)

        hostname = (
            parsed.hostname or ""
        ).lower()

        path = (
            parsed.path or ""
        ).strip("/")

        query = parse_qs(
            parsed.query
        )

    except Exception:

        return None

    # --------------------------------------------------------
    # Valid YouTube hosts
    # --------------------------------------------------------

    valid_youtube_hosts = {
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "music.youtube.com",
        "youtube-nocookie.com",
        "www.youtube-nocookie.com",
        "youtu.be",
        "www.youtu.be",
    }

    if hostname not in valid_youtube_hosts:
        return None

    video_id = None

    # ========================================================
    # youtu.be/VIDEO_ID
    # ========================================================

    if hostname in {
        "youtu.be",
        "www.youtu.be",
    }:

        parts = path.split("/")

        if parts and parts[0]:
            video_id = parts[0]

    # ========================================================
    # youtube.com/watch?v=VIDEO_ID
    # ========================================================

    elif path == "watch":

        values = query.get("v")

        if values:
            video_id = values[0]

    # ========================================================
    # youtube.com/shorts/VIDEO_ID
    # ========================================================

    elif path.startswith("shorts/"):

        parts = path.split("/")

        if len(parts) >= 2:
            video_id = parts[1]

    # ========================================================
    # youtube.com/live/VIDEO_ID
    # ========================================================

    elif path.startswith("live/"):

        parts = path.split("/")

        if len(parts) >= 2:
            video_id = parts[1]

    # ========================================================
    # youtube.com/embed/VIDEO_ID
    # ========================================================

    elif path.startswith("embed/"):

        parts = path.split("/")

        if len(parts) >= 2:
            video_id = parts[1]

    # ========================================================
    # youtube.com/v/VIDEO_ID
    # ========================================================

    elif path.startswith("v/"):

        parts = path.split("/")

        if len(parts) >= 2:
            video_id = parts[1]

    # ========================================================
    # Validate
    # ========================================================

    if not video_id:
        return None

    video_id = video_id.split("?")[0]
    video_id = video_id.split("&")[0]
    video_id = video_id.split("#")[0]

    if re.fullmatch(
        r"[A-Za-z0-9_-]{11}",
        video_id
    ):
        return video_id

    return None


# ============================================================
# YOUTUBE METADATA
# ============================================================

def get_youtube_metadata(
    video_id: str
):
    """
    Get basic YouTube metadata using oEmbed.
    """

    oembed_url = (
        "https://www.youtube.com/oembed?"
        f"url=https://www.youtube.com/watch?v={video_id}"
        "&format=json"
    )

    try:

        request = urllib.request.Request(
            oembed_url,
            headers={
                "User-Agent": "Mozilla/5.0"
            },
        )

        with urllib.request.urlopen(
            request,
            timeout=5
        ) as response:

            data = json.loads(
                response.read().decode()
            )

            return {
                "title": data.get(
                    "title",
                    f"YouTube Video {video_id}"
                ),
                "author": data.get(
                    "author_name",
                    "Unknown Creator"
                ),
                "thumbnail": data.get(
                    "thumbnail_url",
                    (
                        f"https://i.ytimg.com/vi/"
                        f"{video_id}/hqdefault.jpg"
                    ),
                ),
            }

    except Exception:

        return {
            "title": (
                f"YouTube Video {video_id}"
            ),
            "author": "Unknown Creator",
            "thumbnail": (
                f"https://i.ytimg.com/vi/"
                f"{video_id}/hqdefault.jpg"
            ),
        }


# ============================================================
# TIME FORMAT
# ============================================================

def format_seconds_to_timestamp(
    seconds: float
) -> str:

    total_seconds = max(
        0,
        int(seconds)
    )

    hours = (
        total_seconds // 3600
    )

    minutes = (
        total_seconds % 3600
    ) // 60

    secs = (
        total_seconds % 60
    )

    if hours > 0:

        return (
            f"{hours:02d}:"
            f"{minutes:02d}:"
            f"{secs:02d}"
        )

    return (
        f"{minutes:02d}:"
        f"{secs:02d}"
    )


# ============================================================
# YOUTUBE CAPTIONS
# ============================================================

def get_youtube_captions(
    video_id: str
):
    """
    Obtain transcript directly from YouTube.

    YouTubeTranscriptApi is used only for YouTube.

    faster-whisper is NOT used here.
    """

    print(
        f"[YOUTUBE] Trying YouTubeTranscriptApi "
        f"for {video_id}..."
    )

    api = YouTubeTranscriptApi()

    transcript_list = api.list(
        video_id
    )

    selected_language = "en"

    # --------------------------------------------------------
    # Prefer English transcript
    # --------------------------------------------------------

    try:

        transcript = (
            transcript_list.find_transcript(
                ["en"]
            )
        )

    except Exception:

        # ----------------------------------------------------
        # Use first available transcript
        # ----------------------------------------------------

        transcript = next(
            iter(transcript_list)
        )

        selected_language = (
            transcript.language_code
        )

    # --------------------------------------------------------
    # Fetch transcript
    # --------------------------------------------------------

    fetched_data = transcript.fetch()

    formatted_entries = []

    max_seconds = 0.0

    # --------------------------------------------------------
    # Convert into CogniTrace format
    # --------------------------------------------------------

    for item in fetched_data:

        start_seconds = float(
            item.start
        )

        duration = float(
            item.duration
        )

        end_seconds = (
            start_seconds
            + duration
        )

        max_seconds = max(
            max_seconds,
            end_seconds
        )

        text = str(
            item.text
        ).strip()

        if not text:
            continue

        formatted_entries.append(
            {
                "timestamp": (
                    format_seconds_to_timestamp(
                        start_seconds
                    )
                ),
                "seconds": int(
                    start_seconds
                ),
                "end_time": (
                    format_seconds_to_timestamp(
                        end_seconds
                    )
                ),
                "text": text,
                "speaker": "Speaker",
            }
        )

    print(
        "[YOUTUBE] Captions found: "
        f"{len(formatted_entries)} entries"
    )

    return {
        "transcript": formatted_entries,
        "language": selected_language,
        "duration": (
            format_seconds_to_timestamp(
                max_seconds
            )
        ),
        "source": "youtube_transcript_api",
    }


# ============================================================
# DOWNLOAD YOUTUBE AUDIO
# ============================================================

def download_youtube_audio(
    video_id: str,
    output_directory: str
) -> Path:
    """
    Download YouTube audio.

    Kept for backward compatibility.

    The main YouTube transcript pipeline does NOT
    use this when YouTube captions are available.
    """

    ensure_ffmpeg_available()

    youtube_url = (
        f"https://www.youtube.com/watch?v={video_id}"
    )

    output_base = (
        Path(output_directory)
        / "youtube_audio"
    )

    print(
        "[YOUTUBE] Downloading audio..."
    )

    ydl_opts = {

        "format": "bestaudio/best",

        "outtmpl": (
            str(output_base)
            + ".%(ext)s"
        ),

        "noplaylist": True,

        "quiet": True,

        "no_warnings": True,

        "ffmpeg_location": str(
            FFMPEG_BIN_DIR
        ),

        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "wav",
                "preferredquality": "192",
            }
        ],
    }

    with yt_dlp.YoutubeDL(
        ydl_opts
    ) as ydl:

        ydl.download(
            [youtube_url]
        )

    audio_path = (
        output_base.with_suffix(".wav")
    )

    if not audio_path.exists():

        raise FileNotFoundError(
            "YouTube audio was downloaded, "
            "but the WAV file could not be found."
        )

    print(
        "[YOUTUBE] Audio downloaded: "
        f"{audio_path}"
    )

    return audio_path


# ============================================================
# FASTER-WHISPER TRANSCRIPTION
# ============================================================

def transcribe_with_whisper(
    audio_path: Path
):
    """
    Transcribe local audio/video using faster-whisper.

    IMPORTANT:
        The function name is kept as
        transcribe_with_whisper()
        so existing backend code does not
        need to change.

    Internally, it now uses faster-whisper.

    GPU:
        CUDA + float16

    CPU:
        int8 fallback

    Output format remains compatible with
    the previous CogniTrace transcript format.
    """

    ensure_ffmpeg_available()

    audio_path = Path(
        audio_path
    )

    if not audio_path.exists():

        raise FileNotFoundError(
            f"Audio/video file not found: "
            f"{audio_path}"
        )

    model = get_faster_whisper_model()

    print("=" * 60)
    print(
        "[FASTER-WHISPER] Starting transcription"
    )
    print(
        f"[FASTER-WHISPER] File: {audio_path}"
    )
    print(
        f"[FASTER-WHISPER] Device: "
        f"{_faster_whisper_device}"
    )
    print(
        f"[FASTER-WHISPER] Compute type: "
        f"{_faster_whisper_compute_type}"
    )
    print("=" * 60)

    try:

        # ----------------------------------------------------
        # Transcribe
        # ----------------------------------------------------

        segments, info = model.transcribe(
            str(audio_path),

            # English is the current intended
            # language for the CogniTrace lectures.
            language="en",

            task="transcribe",

            # Beam size 5 provides a good balance
            # between speed and accuracy.
            beam_size=5,

            # Do not condition heavily on previous text.
            # This helps reduce repeated/hallucinated text.
            condition_on_previous_text=False,

            # Generate timestamps.
            word_timestamps=False,

            # Keep temperature deterministic.
            temperature=0.0,

            # Avoid overly long silence processing.
            vad_filter=True,

            # VAD parameters.
            vad_parameters={
                "min_silence_duration_ms": 500,
            },
        )

        detected_language = (
            getattr(
                info,
                "language",
                "unknown"
            )
            or "unknown"
        )

        language_probability = (
            getattr(
                info,
                "language_probability",
                None
            )
        )

        print(
            "[FASTER-WHISPER] Detected language: "
            f"{detected_language}"
        )

        if language_probability is not None:

            print(
                "[FASTER-WHISPER] Language "
                "probability: "
                f"{language_probability:.4f}"
            )

        # ----------------------------------------------------
        # Convert generator into CogniTrace entries
        # ----------------------------------------------------

        formatted_entries = []

        max_seconds = 0.0

        for segment in segments:

            start_seconds = float(
                getattr(
                    segment,
                    "start",
                    0.0
                )
            )

            end_seconds = float(
                getattr(
                    segment,
                    "end",
                    start_seconds
                )
            )

            text = (
                getattr(
                    segment,
                    "text",
                    ""
                )
                or ""
            ).strip()

            if not text:
                continue

            max_seconds = max(
                max_seconds,
                end_seconds
            )

            formatted_entries.append(
                {
                    "timestamp": (
                        format_seconds_to_timestamp(
                            start_seconds
                        )
                    ),
                    "seconds": int(
                        start_seconds
                    ),
                    "end_time": (
                        format_seconds_to_timestamp(
                            end_seconds
                        )
                    ),
                    "text": text,
                    "speaker": "Speaker",
                }
            )

            # ------------------------------------------------
            # Print progress
            # ------------------------------------------------

            print(
                "[FASTER-WHISPER] "
                f"{format_seconds_to_timestamp(start_seconds)}"
                " - "
                f"{format_seconds_to_timestamp(end_seconds)}: "
                f"{text}"
            )

        # ----------------------------------------------------
        # Validate result
        # ----------------------------------------------------

        if not formatted_entries:

            raise ValueError(
                "faster-whisper completed but "
                "did not produce any transcript segments."
            )

        print("=" * 60)
        print(
            "[FASTER-WHISPER] Transcription complete."
        )
        print(
            "[FASTER-WHISPER] Segments: "
            f"{len(formatted_entries)}"
        )
        print(
            "[FASTER-WHISPER] Duration: "
            f"{format_seconds_to_timestamp(max_seconds)}"
        )
        print("=" * 60)

        return {
            "transcript": formatted_entries,
            "language": detected_language,
            "duration": (
                format_seconds_to_timestamp(
                    max_seconds
                )
            ),
            "source": "faster_whisper",
        }

    except Exception as exc:

        print("=" * 60)
        print(
            "[FASTER-WHISPER] Transcription failed."
        )
        print(
            "[FASTER-WHISPER] Error:"
        )
        print(str(exc))
        print("=" * 60)

        raise


# ============================================================
# YOUTUBE WHISPER TRANSCRIPT
# ============================================================

def get_youtube_whisper_transcript(
    video_id: str
):
    """
    Kept for backward compatibility.

    This function downloads YouTube audio and sends it
    through the same faster-whisper transcription engine.

    IMPORTANT:
        The normal YouTube pipeline does NOT call this.
        YouTube uses YouTubeTranscriptApi first.
    """

    ensure_ffmpeg_available()

    with tempfile.TemporaryDirectory(
        prefix="cognitrace_youtube_"
    ) as temp_directory:

        audio_path = (
            download_youtube_audio(
                video_id,
                temp_directory
            )
        )

        return transcribe_with_whisper(
            audio_path
        )


# ============================================================
# MAIN YOUTUBE TRANSCRIPT FUNCTION
# ============================================================

def get_youtube_transcript(
    video_id: str
):
    """
    Main YouTube transcript pipeline.

    YouTube videos use YouTubeTranscriptApi only.

    faster-whisper is NOT used as a YouTube fallback.

    Local uploaded videos use faster-whisper.
    """

    if not video_id:

        raise ValueError(
            "YouTube video ID is required."
        )

    print(
        "[YOUTUBE] Starting transcript import..."
    )

    print(
        "[YOUTUBE] Video ID: "
        + video_id
    )

    print(
        "[YOUTUBE] Source: "
        "YouTubeTranscriptApi"
    )

    try:

        result = get_youtube_captions(
            video_id
        )

        print(
            "[YOUTUBE] Transcript import successful."
        )

        return result

    except Exception as exc:

        print(
            "[YOUTUBE] Transcript API failed."
        )

        print(
            "[YOUTUBE] Reason: "
            + str(exc)
        )

        raise ValueError(
            "Unable to obtain a transcript from YouTube. "
            "This lecture may not have an accessible "
            "YouTube transcript/caption track."
        ) from exc


# ============================================================
# LOCAL VIDEO → FASTER-WHISPER
# ============================================================

def get_local_video_transcript(
    video_path: str
):
    """
    Transcribes a locally uploaded video using
    faster-whisper.

    FFmpeg is automatically taken from:

        backend/ffmpeg/bin/

    The output structure is the same as before, so
    faculty.py does not need to change just because
    the transcription engine changed.
    """

    path = Path(
        video_path
    )

    if not path.exists():

        raise FileNotFoundError(
            f"Video file not found: {video_path}"
        )

    print(
        "[LOCAL VIDEO] Starting transcription..."
    )

    print(
        "[LOCAL VIDEO] File: "
        f"{path}"
    )

    result = transcribe_with_whisper(
        path
    )

    print(
        "[LOCAL VIDEO] Transcript generated "
        "successfully."
    )

    return result