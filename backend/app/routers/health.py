
from fastapi import APIRouter
from sqlalchemy import text
from app.database import engine

router = APIRouter()


@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "CogniTrace API",
        "version": "1.0.0-prototype"
    }


@router.get("/health/database")
def database_health_check():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return {
            "status": "healthy",
            "database": "connected",
            "message": "Neon PostgreSQL connection successful"
        }

    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }
