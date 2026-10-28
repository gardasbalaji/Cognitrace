from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "CogniTrace API",
        "version": "1.0.0-prototype"
    }
