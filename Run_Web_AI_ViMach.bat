@echo off
title Khoi Dong Web AI Vi Mach - Eco Green Edition
color 0A

echo ===================================================================
echo               HE THONG WEB AI VI MACH & BAN DAN (ECO GREEN)
echo ===================================================================
echo.
echo Dang khoi dong Web Server AI Vi Mach...

:: Thiet lap duong dan Models local
set OLLAMA_MODELS=%~dp0..\ollama_models

:: Chuyen den thu muc Web AI Vi Mach
cd /d "%~dp0"

:: Kiem tra va cai dat dependencies neu can
python -c "import fastapi, uvicorn, httpx" >nul 2>&1
if %errorlevel% neq 0 (
    echo Dang cai dat cac thu vien Python can thiet (FastAPI, Uvicorn, HTTPX)...
    python -m pip install -r backend/requirements.txt
)

:: Mo trinh duyet sau 3 giay
start "" http://localhost:8000

:: Khoi chay FastAPI Backend Server
echo.
echo Server dang chay tai: http://localhost:8000
echo Nhan Ctrl+C de dung server.
echo ===================================================================
python backend/main.py

pause
