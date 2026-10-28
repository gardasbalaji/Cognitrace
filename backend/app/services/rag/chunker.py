from typing import List, Dict, Any

def chunk_transcript(
    transcript_items: List[Dict[str, Any]], 
    lecture_id: str, 
    course_id: str = "CS 101", 
    chunk_size: int = 5, 
    overlap: int = 2
) -> List[Dict[str, Any]]:
    """
    Groups consecutive transcript items into overlapping chunks.
    
    Each chunk contains:
    - lecture_id: ID of the lecture
    - course_id: ID of the course (defaults to CS 101)
    - start_time: Start timestamp of the chunk (e.g. "00:00")
    - end_time: End timestamp of the chunk (e.g. "00:15")
    - chunk_text: Concatenated text of all lines in the chunk
    
    Args:
        transcript_items: List of dictionaries containing "timestamp", "end_time", "text".
        lecture_id: The ID of the lecture.
        course_id: The ID of the course.
        chunk_size: Number of transcript items in each chunk.
        overlap: Number of overlapping transcript items between consecutive chunks.
        
    Returns:
        List of chunks with corresponding metadata.
    """
    if not transcript_items:
        return []
        
    # Check bounds
    if chunk_size <= 0:
        raise ValueError("chunk_size must be greater than 0")
    if overlap < 0 or overlap >= chunk_size:
        raise ValueError("overlap must be non-negative and less than chunk_size")
        
    chunks = []
    step = chunk_size - overlap
    
    for i in range(0, len(transcript_items), step):
        items_slice = transcript_items[i : i + chunk_size]
        if not items_slice:
            continue
            
        # Concatenate text content
        chunk_text = " ".join([item["text"].strip() for item in items_slice if item.get("text")])
        
        # Get start timestamp of the first item
        start_time = items_slice[0].get("timestamp", "00:00")
        
        # Get end timestamp of the last item in the slice
        last_item = items_slice[-1]
        end_time = last_item.get("end_time", last_item.get("timestamp", start_time))
        
        chunks.append({
            "lecture_id": lecture_id,
            "course_id": course_id,
            "start_time": start_time,
            "end_time": end_time,
            "chunk_text": chunk_text
        })
        
        # Stop processing if we have processed the last items
        if i + chunk_size >= len(transcript_items):
            break
            
    return chunks
