"""
Central configuration for the Memory Engine.
Designed for 100% $0 Free-Tier operation with zero paid dependencies.
"""
import os
from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

_backend_env = Path(__file__).resolve().parent.parent / ".env"
_root_env = Path(__file__).resolve().parent.parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(_backend_env, _root_env, ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── Database ──────────────────────────────────────────────────────────────
    # Default to local SQLite for zero setup, instant queries, and zero cloud cost.
    DATABASE_URL: str = "sqlite:///./memory_engine.db"

    # ── Embeddings (100% Local, CPU, $0) ──────────────────────────────────────
    EMBEDDING_DIM: int = 384
    EMBEDDING_MODEL_NAME: str = "sentence-transformers/all-MiniLM-L6-v2"

    # ── Free-Tier LLM Provider Options ────────────────────────────────────────
    LLM_PROVIDER: str = "auto"

    # Provider A: Groq Cloud Free Tier
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "openai/gpt-oss-120b"
    GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"

    # Support OPENAI_* alias used by Groq in .env
    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = "https://api.groq.com/openai/v1"
    LLM_MODEL: str = "llama-3.3-70b-versatile"

    # Provider B: Google AI Studio Free Tier
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"

    # ── General App Settings ──────────────────────────────────────────────────
    APP_ENV: str = "development"
    LOG_LEVEL: str = "INFO"
    SECRET_KEY: str = "free-tier-dev-secret-key"

    def get_effective_groq_key(self) -> str:
        """Resolve Groq API key from GROQ_API_KEY or OPENAI_API_KEY."""
        return self.GROQ_API_KEY or self.OPENAI_API_KEY

    def get_effective_groq_base_url(self) -> str:
        """Resolve Groq API base URL."""
        return self.GROQ_BASE_URL or self.OPENAI_BASE_URL or "https://api.groq.com/openai/v1"

    def get_effective_db_url(self) -> str:
        """Resolve database URL, normalizing postgresql/sqlite schemes."""
        url = self.DATABASE_URL
        if "postgresql" in url:
            try:
                import psycopg2
                return url
            except ImportError:
                return "sqlite:///./memory_engine.db"
        if url.startswith("sqlite+aiosqlite:///"):
            return url.replace("sqlite+aiosqlite:///", "sqlite:///")
        return url


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
