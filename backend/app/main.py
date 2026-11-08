"""
FastAPI Application Entry Point.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.chat import router as chat_router
from app.api.memories import router as memories_router
from app.api.sessions import router as sessions_router
from app.config import settings
from app.database.session import init_db

# Initialize database schema on startup
init_db()

app = FastAPI(
    title="Adaptive Lifecycle Memory Engine API",
    description="Evidence-Grounded Canonical Memory Adaptation & Cross-Session Retrieval",
    version="1.0.0",
)

# Enable CORS for local React development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(sessions_router)
app.include_router(chat_router)
app.include_router(memories_router)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "app_env": settings.APP_ENV,
        "database": "sqlite (local $0)" if "sqlite" in settings.DATABASE_URL else "postgresql",
        "embedding_dim": settings.EMBEDDING_DIM
    }
