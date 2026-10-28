from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.services.rag.vector_store import query_relevant_chunks
from app.services.rag.generator import generate_explanation

router = APIRouter()


class RAGExplanationRequest(BaseModel):
    question: str
    lecture_id: str
    level: Optional[str] = "medium"


@router.post("/rag-explanation")
def test_rag_explanation(req: RAGExplanationRequest):
    """
    POST route to fetch relevant transcript segments from vector store
    and generate a difficulty-adjusted explanation using Google Gemini.
    """
    if not req.question or not req.lecture_id:
        raise HTTPException(status_code=400, detail="Missing question or lecture_id")

    # 1. Retrieve top matching segments from the vector store
    # Using top_k=6 to supply sufficient context
    context_chunks = query_relevant_chunks(
        question=req.question, lecture_id=req.lecture_id, top_k=6
    )

    if not context_chunks:
        # Provide a helpful error if they haven't indexed anything or if the lecture doesn't match
        return {
            "status": "warning",
            "message": f"No transcript context found for lecture_id '{req.lecture_id}'. Make sure to index chunks first.",
            "explanation": "No transcript contexts available.",
            "retrieved_context": [],
        }

    # 2. Call the generator service to request the Gemini-based explanation
    explanation = generate_explanation(
        question=req.question, context_chunks=context_chunks, level=req.level
    )

    # 3. Compile response with explanation, level, and metadata timestamps
    return {
        "status": "success",
        "question": req.question,
        "lecture_id": req.lecture_id,
        "level": req.level,
        "explanation": explanation,
        "retrieved_context": [
            {
                "chunk_id": chunk["chunk_id"],
                "text": chunk["text"],
                "start_time": chunk["start_time"],
                "end_time": chunk["end_time"],
                "similarity_score": chunk["similarity_score"],
            }
            for chunk in context_chunks
        ],
    }
