import os
from dotenv import load_dotenv

load_dotenv()
key = os.getenv("GEMINI_API_KEY", "").strip()


class Settings:
    PROJECT_NAME: str = "CogniTrace API"
    API_V1_STR: str = "/api"

    ALLOWED_ORIGINS: list = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "").strip()
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "").strip()


settings = Settings()
