

# import os
# import joblib
# import numpy as np

# from fastapi import FastAPI, Depends
# from fastapi.middleware.cors import CORSMiddleware
# from pydantic import BaseModel

# from app.dependencies import get_current_student
# from app.models import User
# from app.config import settings

# from app.routers import (
#     health,
#     student,
#     faculty,
#     auth,
#     test_bge,
#     test_vector_db,
#     test_rag,
# )

# from app.routers.student import (
#     AskAIRequest,
#     ask_ai_explanation,
#     GenerateQuizRequest,
#     generate_quiz,
# )


# app = FastAPI(
#     title=settings.PROJECT_NAME,
#     description="CogniTrace Intelligent Learning Analytics Platform - Prototype API",
#     version="1.0.0",
# )


# # --------------------------------------------------
# # CORS CONFIGURATION
# # --------------------------------------------------

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=settings.ALLOWED_ORIGINS,
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )


# # --------------------------------------------------
# # LOAD TRAINED XGBOOST CONFUSION MODEL
# # --------------------------------------------------

# MODEL_PATH = "cognitrace_confusion_xgboost.pkl"

# xgboost_model = None

# if os.path.exists(MODEL_PATH):
#     try:
#         xgboost_model = joblib.load(MODEL_PATH)
#         print("XGBoost Confusion Model successfully loaded in main.py!")

#     except Exception as e:
#         print(f"Failed to load XGBoost model: {e}")

# else:
#     print(
#         f"Warning: Model file '{MODEL_PATH}' not found. " "Using fallback heuristics."
#     )


# # --------------------------------------------------
# # TELEMETRY PAYLOAD SCHEMA
# # --------------------------------------------------


# class TelemetryLogSchema(BaseModel):
#     lecture_id: str
#     event_type: str
#     timestamp: float
#     playback_speed: float
#     watch_duration: float

#     # 30-second rolling window features
#     rewinds_30s: int = 0
#     pauses_30s: int = 0
#     seeks_30s: int = 0
#     current_speed: float = 1.0


# # --------------------------------------------------
# # REGISTER ROUTERS
# # --------------------------------------------------

# app.include_router(health.router, prefix=settings.API_V1_STR, tags=["Health"])

# app.include_router(
#     student.router, prefix=f"{settings.API_V1_STR}/student", tags=["Student"]
# )

# app.include_router(
#     faculty.router, prefix=f"{settings.API_V1_STR}/faculty", tags=["Faculty"]
# )

# app.include_router(test_bge.router, prefix="/api/v1/test", tags=["Test"])

# app.include_router(test_vector_db.router, prefix="/api/v1/test", tags=["Test"])

# app.include_router(test_rag.router, prefix="/api/v1/test", tags=["Test"])

# app.include_router(auth.router)


# # --------------------------------------------------
# # REAL-TIME TELEMETRY LOG & ML CONFUSION DETECTION
# # --------------------------------------------------

# # IMPORTANT:
# # The /api/student/session-analysis/log route is already
# # registered through student.router.
# #
# # Keep only the versioned alias here.


# @app.post("/api/v1/student/session-analysis/log", tags=["Student Session Telemetry"])
# def log_session_telemetry(
#     payload: TelemetryLogSchema, current_student: User = Depends(get_current_student)
# ):
#     confusion_probability = 0.0
#     trigger_ai_drawer = False

#     # Execute ML inference if model is available
#     if xgboost_model is not None:
#         try:
#             # Feature order must match the model's training schema:
#             # Pause_Count
#             # Resume_Count
#             # Rewind_Count
#             # Forward_Seek_Count
#             # Playback_Speed_Num
#             # Completion_Num

#             feature_vector = np.array(
#                 [
#                     [
#                         payload.pauses_30s,
#                         1 if payload.event_type == "play" else 0,
#                         payload.rewinds_30s,
#                         payload.seeks_30s,
#                         payload.current_speed,
#                         payload.watch_duration / 100.0,
#                     ]
#                 ]
#             )

#             probs = xgboost_model.predict_proba(feature_vector)[0]

#             # Class 1 = Confused
#             confusion_probability = float(probs[1])

#             if confusion_probability >= 0.80:
#                 trigger_ai_drawer = True

#         except Exception as e:
#             print(f"Inference exception: {e}")

#             # Fallback heuristic
#             if payload.rewinds_30s >= 2 or (
#                 payload.pauses_30s >= 2 and payload.current_speed <= 1.0
#             ):
#                 trigger_ai_drawer = True
#                 confusion_probability = 0.85

#     else:
#         # Fallback if trained model is unavailable
#         if payload.rewinds_30s >= 2 or (
#             payload.pauses_30s >= 2 and payload.current_speed <= 1.0
#         ):
#             trigger_ai_drawer = True
#             confusion_probability = 0.85

#     return {
#         "status": "success",
#         "lecture_id": payload.lecture_id,
#         "event_type": payload.event_type,
#         "confusion_detected": trigger_ai_drawer,
#         "confusion_probability": round(confusion_probability, 4),
#         "trigger_ai_drawer": trigger_ai_drawer,
#     }


# # --------------------------------------------------
# # VERSIONED ASK AI ALIAS
# # --------------------------------------------------


# @app.post("/api/v1/student/ask-ai", tags=["Student"])
# def ask_ai_v1_alias(
#     req: AskAIRequest, current_student: User = Depends(get_current_student)
# ):
#     return ask_ai_explanation(req, current_student)


# # --------------------------------------------------
# # VERSIONED GENERATE QUIZ ALIAS
# # --------------------------------------------------


# @app.post("/api/v1/student/generate-quiz", tags=["Student"])
# def generate_quiz_v1_alias(
#     req: GenerateQuizRequest, current_student: User = Depends(get_current_student)
# ):
#     return generate_quiz(req, current_student)


# # --------------------------------------------------
# # ROOT ENDPOINT
# # --------------------------------------------------


# @app.get("/")
# def read_root():
#     return {
#         "message": "Welcome to the CogniTrace Prototype API Server",
#         "documentation": "/docs",
#         "health_check": f"{settings.API_V1_STR}/health",
#     }

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import (
    auth,
    faculty,
    health,
    student,
    test_bge,
    test_rag,
    test_vector_db,
)


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="CogniTrace Intelligent Learning Analytics Platform - Prototype API",
    version="1.0.0",
)


# --------------------------------------------------
# CORS CONFIGURATION
# --------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# REGISTER ROUTERS
# --------------------------------------------------

app.include_router(health.router, prefix=settings.API_V1_STR, tags=["Health"])
app.include_router(
    student.router,
    prefix=f"{settings.API_V1_STR}/student",
    tags=["Student"],
)
app.include_router(
    faculty.router,
    prefix=f"{settings.API_V1_STR}/faculty",
    tags=["Faculty"],
)
app.include_router(test_bge.router, prefix="/api/v1/test", tags=["Test"])
app.include_router(test_vector_db.router, prefix="/api/v1/test", tags=["Test"])
app.include_router(
    auth.router,
    prefix=f"{settings.API_V1_STR}/auth",
    tags=["Authentication"],
)



# NOTE:
# Student endpoints such as:
#   /api/v1/student/session-analysis/log
#   /api/v1/student/ask-ai
#   /api/v1/student/generate-quiz
# are already registered by student.router above.
# Do not register duplicate direct-call aliases here. FastAPI dependency
# injection (including the database session) is handled by the router.


# --------------------------------------------------
# ROOT ENDPOINT
# --------------------------------------------------

@app.get("/")
def read_root():
    return {
        "message": "Welcome to the CogniTrace Prototype API Server",
        "documentation": "/docs",
        "health_check": f"{settings.API_V1_STR}/health",
    }
