from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.services.rag.chunker import chunk_transcript
from app.services.rag.vector_store import index_lecture_chunks, query_relevant_chunks, ChromaDBManager

router = APIRouter()

class VectorSearchRequest(BaseModel):
    question: str
    lecture_id: str
    top_k: Optional[int] = 3

# Standard mock transcript containing both database normalization and OOP inheritance concepts
sample_transcript = [
    {"timestamp": "00:00", "end_time": "00:05", "text": "Welcome to Database Systems CS 101."},
    {"timestamp": "00:05", "end_time": "00:10", "text": "Today we will discuss database normalization and schema design."},
    {"timestamp": "00:10", "end_time": "00:15", "text": "Normalization helps reduce data redundancy and anomalies in relations."},
    {"timestamp": "00:15", "end_time": "00:20", "text": "We divide larger tables into smaller tables to achieve normal forms."},
    {"timestamp": "00:20", "end_time": "00:25", "text": "And link them using primary-foreign key relationships to keep consistency."},
    {"timestamp": "00:25", "end_time": "00:30", "text": "Object-oriented programming features class inheritance and polymorphism."},
    {"timestamp": "00:30", "end_time": "00:35", "text": "Inheritance allows a subclass to inherit attributes and methods of a superclass."},
    {"timestamp": "00:35", "end_time": "00:40", "text": "Polymorphism means many forms of method implementation."}
]

@router.post("/vector-search")
def test_vector_search(req: VectorSearchRequest):
    """
    POST route to chunk, index, and semantically retrieve relevant sections
    of a mock transcript using ChromaDB vector store.
    """
    if not req.question or not req.lecture_id:
        raise HTTPException(status_code=400, detail="Missing question or lecture_id")

    # 1. Generate overlapping chunks from sample transcript
    chunks = chunk_transcript(
        transcript_items=sample_transcript,
        lecture_id=req.lecture_id,
        course_id="CS 101",
        chunk_size=3,
        overlap=1
    )
    
    # 2. Index the chunks in ChromaDB
    # First, let's clear previous dummy indices for this lecture to keep results reproducible
    collection = ChromaDBManager.get_collection()
    try:
        collection.delete(where={"lecture_id": req.lecture_id})
    except Exception:
        pass
        
    index_lecture_chunks(
        lecture_id=req.lecture_id,
        course_id="CS 101",
        chunks=chunks
    )
    
    # 3. Perform semantic query
    results = query_relevant_chunks(
        question=req.question,
        lecture_id=req.lecture_id,
        top_k=req.top_k
    )
    
    return {
        "status": "success",
        "question": req.question,
        "lecture_id": req.lecture_id,
        "indexed_chunks": len(chunks),
        "results": results
    }
