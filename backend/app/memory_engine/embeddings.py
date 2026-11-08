"""
100% Local Free Embeddings Engine.
Primary: HuggingFace sentence-transformers/all-MiniLM-L6-v2 (384 dimensions, CPU, $0).
Fallback: Deterministic n-gram hash unit-vector generator for fast, zero-download offline testing.
"""
import hashlib
import logging
import re
from typing import List, Optional
import numpy as np

from app.config import settings

logger = logging.getLogger(__name__)

_ST_MODEL = None
_ST_FAILED = False


def _get_sentence_transformer():
    """Lazily load SentenceTransformer model if available."""
    global _ST_MODEL, _ST_FAILED
    if _ST_MODEL is not None:
        return _ST_MODEL
    if _ST_FAILED:
        return None

    try:
        from sentence_transformers import SentenceTransformer
        logger.info(f"Loading local embedding model: {settings.EMBEDDING_MODEL_NAME}")
        _ST_MODEL = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
        return _ST_MODEL
    except Exception as e:
        logger.warning(
            f"Local sentence-transformers model could not be loaded ({e}). "
            "Engaging fast deterministic 384-dim hash/unit-vector fallback."
        )
        _ST_FAILED = True
        return None


def generate_deterministic_vector(text: str, dim: int = 384) -> List[float]:
    """
    Deterministic 384-dimensional unit vector using n-gram feature hashing.
    Provides semantic token overlap properties without downloading any external weights.
    """
    if not text or not text.strip():
        vec = np.zeros(dim, dtype=np.float32)
        vec[0] = 1.0
        return vec.tolist()

    clean_text = re.sub(r'[^\w\s]', ' ', text.lower()).strip()
    words = clean_text.split()
    features = list(words)

    # Add character 3-grams for subword similarity
    for w in words:
        if len(w) >= 3:
            for i in range(len(w) - 2):
                features.append(w[i:i+3])

    vec = np.zeros(dim, dtype=np.float32)
    for feat in features:
        h = int(hashlib.md5(feat.encode("utf-8")).hexdigest(), 16)
        idx = h % dim
        sign = 1.0 if (h >> 9) & 1 else -1.0
        vec[idx] += sign

    norm = np.linalg.norm(vec)
    if norm > 1e-6:
        vec = vec / norm
    else:
        vec[0] = 1.0

    return vec.tolist()


def get_embedding(text: str) -> List[float]:
    """
    Generate a 384-dimensional embedding for text.
    1. Tries sentence-transformers if available.
    2. Falls back to deterministic unit vector if offline or downloading.
    """
    model = _get_sentence_transformer()
    if model is not None:
        try:
            emb = model.encode(text, convert_to_numpy=True, normalize_embeddings=True)
            return emb.tolist()
        except Exception as e:
            logger.warning(f"SentenceTransformer encoding failed ({e}), using deterministic fallback.")

    return generate_deterministic_vector(text, dim=settings.EMBEDDING_DIM)


def compute_cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """Compute cosine similarity between two float vectors using NumPy."""
    if not vec_a or not vec_b:
        return 0.0
    a = np.array(vec_a, dtype=np.float32)
    b = np.array(vec_b, dtype=np.float32)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a < 1e-6 or norm_b < 1e-6:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))

