import torch
from typing import List, Union
from sentence_transformers import SentenceTransformer

class BGEEmbeddingModel:
    """
    Lazy-initialized singleton to manage the BAAI/bge-small-en-v1.5 embedding model.
    Ensures that the model is loaded once and shared across requests.
    """
    _model = None

    @classmethod
    def get_instance(cls) -> SentenceTransformer:
        if cls._model is None:
            # Check for GPU capability, fall back to CPU
            device = "cuda" if torch.cuda.is_available() else "cpu"
            # Load the BAAI/bge-small-en-v1.5 model
            cls._model = SentenceTransformer("BAAI/bge-small-en-v1.5", device=device)
        return cls._model

def get_embeddings(texts: Union[str, List[str]]) -> List[List[float]]:
    """
    Generate normalized BGE embeddings for a single text or a list of texts.
    
    Args:
        texts: A string or list of strings to be embedded.
        
    Returns:
        A list of float lists containing the embedding vectors.
    """
    if not texts:
        return []
        
    # Standardize input to list of strings
    is_single = isinstance(texts, str)
    input_list = [texts] if is_single else texts
    
    model = BGEEmbeddingModel.get_instance()
    
    # Generate embeddings with normalization for cosine similarity
    embeddings = model.encode(input_list, normalize_embeddings=True)
    
    # Convert numpy array to list
    return embeddings.tolist()

def embed_documents(texts: List[str]) -> List[List[float]]:
    """
    Generate normalized embeddings for a list of document chunks.
    """
    return get_embeddings(texts)

def embed_query(text: str) -> List[float]:
    """
    Generate a normalized embedding for a query with the BGE instruction prefix.
    """
    prefix = "Represent this sentence for searching relevant passages: "
    full_query = f"{prefix}{text}"
    embeddings = get_embeddings(full_query)
    return embeddings[0] if embeddings else []

