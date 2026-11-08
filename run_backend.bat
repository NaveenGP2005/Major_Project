@echo off
echo ============================================================
echo Starting Adaptive Memory Engine Backend (FastAPI on Neon DB)
echo ============================================================
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
pause

