@echo off
echo ============================================================
echo Launching Adaptive Voice Agent with Long-Term Memory
echo ============================================================
start "Memory Engine Backend (Port 8000)" cmd /k "run_backend.bat"
timeout /t 2 >nul
start "Echo UI Workstation (Port 5173)" cmd /k "run_frontend.bat"
echo Applications launched!
echo - Backend API:  http://127.0.0.1:8000
echo - Swagger Docs: http://127.0.0.1:8000/docs
echo - UI Workstation: http://localhost:5173
pause

