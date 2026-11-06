
from typing import List, Union


class BGEEmbeddingModel:
    _model = None

    @classmethod
    def get_instance(cls):
        if cls._model is None:
            # Import heavy libraries only when BGE is actually needed
            from sentence_transformers import SentenceTransformer

            # Render Free does not provide a CUDA GPU
            device = "cpu"

            cls._model = SentenceTransformer(
                "BAAI/bge-small-en-v1.5",
                device=device
            )

        return cls._model


def get_embeddings(texts: Union[str, List[str]]) -> List[List[float]]:
    if not texts:
        return []

    input_list = [texts] if isinstance(texts, str) else texts

    model = BGEEmbeddingModel.get_instance()

    embeddings = model.encode(
        input_list,
        normalize_embeddings=True
    )

    return embeddings.tolist()


def embed_documents(texts):
    return get_embeddings(texts)


def embed_query(text):
    prefix = "Represent this sentence for searching relevant passages: "
    full_query = f"{prefix}{text}"

    embeddings = get_embeddings(full_query)

    return embeddings[0] if embeddings else []
