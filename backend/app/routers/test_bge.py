from fastapi import APIRouter
from app.services.rag.bge_service import get_embeddings
from app.services.rag.chunker import chunk_transcript

router = APIRouter()

@router.get("/bge")
def test_bge_pipeline(query: str = "Database normalization reduces redundancy"):
    """
    Test endpoint to verify chunking and BGE embedding generation.
    It embeds a test query and chunks + embeds a sample transcript.
    """
    # 1. Generate embedding for query
    query_embeddings = get_embeddings(query)
    query_embedding = query_embeddings[0] if query_embeddings else []
    dimensions = len(query_embedding)
    
    # 2. Test chunking utility with a mock transcript
    sample_transcript = [
        {"timestamp": "00:00", "end_time": "00:05", "text": "Welcome to Database Systems CS 101."},
        {"timestamp": "00:05", "end_time": "00:10", "text": "Today we will discuss database normalization."},
        {"timestamp": "00:10", "end_time": "00:15", "text": "Normalization helps reduce data redundancy and anomalies."},
        {"timestamp": "00:15", "end_time": "00:20", "text": "We divide larger tables into smaller tables."},
        {"timestamp": "00:20", "end_time": "00:25", "text": "And link them using primary-foreign key relationships."}
    ]
    
    chunks = chunk_transcript(
        transcript_items=sample_transcript,
        lecture_id="lec_test",
        course_id="CS 101",
        chunk_size=3,
        overlap=1
    )
    
    # Embed the first chunk if chunks exist
    chunk_text = ""
    chunk_embedding = []
    if chunks:
        chunk_text = chunks[0]["chunk_text"]
        chunk_embeddings = get_embeddings(chunk_text)
        chunk_embedding = chunk_embeddings[0] if chunk_embeddings else []
        
    return {
        "status": "success",
        "model": "BAAI/bge-small-en-v1.5",
        "query_tested": query,
        "query_dimensions": dimensions,
        "query_embedding_preview": query_embedding[:5],  # Avoid dumping all 384 floats in logs
        "chunking_test": {
            "total_chunks_generated": len(chunks),
            "sample_chunk": chunks[0] if chunks else None,
            "sample_chunk_text": chunk_text,
            "sample_chunk_dimensions": len(chunk_embedding) if chunk_embedding else 0,
            "sample_chunk_embedding_preview": chunk_embedding[:5] if chunk_embedding else []
        }
    }
