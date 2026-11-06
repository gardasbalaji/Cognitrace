# import os
# import chromadb
# from typing import List, Dict, Any
# from app.services.rag import bge_service

# # Define local persistent directory for ChromaDB in backend root
# CHROMA_DB_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../chroma_db"))

# class ChromaDBManager:
#     """
#     Singleton manager to initialize and cache the ChromaDB PersistentClient
#     and the lecture_chunks collection.
#     """
#     _client = None
#     _collection = None

#     @classmethod
#     def get_client(cls) -> chromadb.PersistentClient:
#         if cls._client is None:
#             os.makedirs(CHROMA_DB_DIR, exist_ok=True)
#             cls._client = chromadb.PersistentClient(path=CHROMA_DB_DIR)
#         return cls._client

#     @classmethod
#     def get_collection(cls):
#         if cls._collection is None:
#             client = cls.get_client()
#             # Use HNSW with cosine similarity space
#             cls._collection = client.get_or_create_collection(
#                 name="lecture_chunks",
#                 metadata={"hnsw:space": "cosine"}
#             )
#         return cls._collection

# def parse_timestamp_to_seconds(ts: Any) -> float:
#     """
#     Converts string timestamp (e.g., '01:23' or '01:23:45') or numerical value to float seconds.
#     """
#     if isinstance(ts, (int, float)):
#         return float(ts)
#     if not isinstance(ts, str):
#         return 0.0

#     parts = ts.split(':')
#     try:
#         if len(parts) == 2:
#             # MM:SS
#             return float(parts[0]) * 60 + float(parts[1])
#         elif len(parts) == 3:
#             # HH:MM:SS
#             return float(parts[0]) * 3600 + float(parts[1]) * 60 + float(parts[2])
#     except ValueError:
#         pass
#     return 0.0

# def index_lecture_chunks(lecture_id: str, course_id: str, chunks: List[Dict[str, Any]]) -> None:
#     """
#     Extracts chunk texts, generates BGE embeddings, converts timestamps to float seconds,
#     and indexes them in ChromaDB.
#     """
#     if not chunks:
#         return

#     collection = ChromaDBManager.get_collection()

#     # Extract chunk texts and generate embeddings
#     texts = [chunk["chunk_text"] for chunk in chunks]
#     embeddings = bge_service.embed_documents(texts)

#     ids = []
#     metadatas = []
#     documents = []

#     for idx, chunk in enumerate(chunks):
#         chunk_id = f"{lecture_id}_{idx}"
#         ids.append(chunk_id)
#         documents.append(chunk["chunk_text"])

#         # Ensure timestamps are stored as numerical float seconds
#         start_seconds = parse_timestamp_to_seconds(chunk.get("start_time", 0.0))
#         end_seconds = parse_timestamp_to_seconds(chunk.get("end_time", 0.0))

#         metadatas.append({
#             "lecture_id": lecture_id,
#             "course_id": course_id,
#             "start_time": start_seconds,
#             "end_time": end_seconds
#         })

#     # Upsert/add into ChromaDB collection
#     collection.add(
#         ids=ids,
#         embeddings=embeddings,
#         documents=documents,
#         metadatas=metadatas
#     )

# def query_relevant_chunks(question: str, lecture_id: str, top_k: int = 3) -> List[Dict[str, Any]]:
#     """
#     Performs semantic vector retrieval for a question, filtered by lecture_id.
#     """
#     collection = ChromaDBManager.get_collection()

#     # Embed the query with the BGE instruction prefix
#     query_vector = bge_service.embed_query(question)

#     # Query collection
#     results = collection.query(
#         query_embeddings=[query_vector],
#         n_results=top_k,
#         where={"lecture_id": lecture_id}
#     )

#     formatted_results = []
#     if not results or not results["ids"] or not results["ids"][0]:
#         return []

#     ids = results["ids"][0]
#     distances = results["distances"][0] if "distances" in results and results["distances"] else [1.0] * len(ids)
#     documents = results["documents"][0] if "documents" in results and results["documents"] else [""] * len(ids)
#     metadatas = results["metadatas"][0] if "metadatas" in results and results["metadatas"] else [{}] * len(ids)

#     for idx in range(len(ids)):
#         meta = metadatas[idx]
#         formatted_results.append({
#             "chunk_id": ids[idx],
#             "text": documents[idx],
#             "similarity_score": float(1.0 - distances[idx]), # Cosine distance to cosine similarity
#             "lecture_id": meta.get("lecture_id"),
#             "course_id": meta.get("course_id"),
#             "start_time": float(meta.get("start_time", 0.0)),
#             "end_time": float(meta.get("end_time", 0.0))
#         })

#     return formatted_results

import os
from typing import List, Dict, Any

# Define local persistent directory for ChromaDB in backend root
CHROMA_DB_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../../chroma_db")
)


class ChromaDBManager:
    """
    Singleton manager for ChromaDB PersistentClient
    and the lecture_chunks collection.
    """

    _client = None
    _collection = None

    @classmethod
    def get_client(cls):
        if cls._client is None:
            # Import ChromaDB only when the database is needed
            import chromadb

            os.makedirs(CHROMA_DB_DIR, exist_ok=True)

            cls._client = chromadb.PersistentClient(
                path=CHROMA_DB_DIR
            )

        return cls._client

    @classmethod
    def get_collection(cls):

        if cls._collection is None:

            client = cls.get_client()

            cls._collection = client.get_or_create_collection(
                name="lecture_chunks", metadata={"hnsw:space": "cosine"}
            )

        return cls._collection


def parse_timestamp_to_seconds(ts: Any) -> float:
    """
    Converts:
        MM:SS
        HH:MM:SS
        numeric timestamps

    into seconds.
    """

    if isinstance(ts, (int, float)):
        return float(ts)

    if not isinstance(ts, str):
        return 0.0

    parts = ts.split(":")

    try:

        if len(parts) == 2:

            return float(parts[0]) * 60 + float(parts[1])

        elif len(parts) == 3:

            return float(parts[0]) * 3600 + float(parts[1]) * 60 + float(parts[2])

    except ValueError:

        pass

    return 0.0


def index_lecture_chunks(
    lecture_id: str, course_id: str, chunks: List[Dict[str, Any]]
) -> None:
    """
    Generates BGE embeddings for transcript chunks
    and stores them in ChromaDB.

    Existing chunk IDs are updated using upsert().
    """

    from app.services.rag import bge_service
    if not chunks:
        return

    collection = ChromaDBManager.get_collection()

    # Extract chunk text
    texts = [chunk["chunk_text"] for chunk in chunks]

    # Generate normalized BGE embeddings
    embeddings = bge_service.embed_documents(texts)

    ids = []
    metadatas = []
    documents = []

    for idx, chunk in enumerate(chunks):

        chunk_id = f"{lecture_id}_{idx}"

        ids.append(chunk_id)

        documents.append(chunk["chunk_text"])

        start_seconds = parse_timestamp_to_seconds(chunk.get("start_time", 0.0))

        end_seconds = parse_timestamp_to_seconds(chunk.get("end_time", 0.0))

        metadatas.append(
            {
                "lecture_id": lecture_id,
                "course_id": course_id,
                "start_time": start_seconds,
                "end_time": end_seconds,
            }
        )

    # IMPORTANT:
    # upsert prevents duplicate-ID problems when
    # the same lecture is indexed again.
    collection.upsert(
        ids=ids, embeddings=embeddings, documents=documents, metadatas=metadatas
    )


def query_relevant_chunks(
    question: str, lecture_id: str, top_k: int = 6
) -> List[Dict[str, Any]]:
    """
    Performs semantic BGE retrieval from ChromaDB
    while restricting results to the requested lecture.
    """
    from app.services.rag import bge_service

    collection = ChromaDBManager.get_collection()

    # Generate normalized BGE query embedding
    query_vector = bge_service.embed_query(question)

    if not query_vector:
        return []

    # Query only chunks belonging to this lecture
    results = collection.query(
        query_embeddings=[query_vector],
        n_results=top_k,
        where={"lecture_id": lecture_id},
    )

    formatted_results = []

    if not results or not results.get("ids") or not results["ids"][0]:
        return []

    ids = results["ids"][0]

    distances = (
        results["distances"][0] if results.get("distances") else [1.0] * len(ids)
    )

    documents = results["documents"][0] if results.get("documents") else [""] * len(ids)

    metadatas = results["metadatas"][0] if results.get("metadatas") else [{}] * len(ids)

    for idx in range(len(ids)):

        meta = metadatas[idx]

        formatted_results.append(
            {
                "chunk_id": ids[idx],
                "text": documents[idx],
                "similarity_score": float(1.0 - distances[idx]),
                "lecture_id": meta.get("lecture_id"),
                "course_id": meta.get("course_id"),
                "start_time": float(meta.get("start_time", 0.0)),
                "end_time": float(meta.get("end_time", 0.0)),
            }
        )

    return formatted_results
