@echo off
setlocal
title PlayCarys Optimizer Launcher
color 0b

echo ========================================================
echo               PLAYCARYS PLATFORM LAUNCHER
echo ========================================================
echo.

color 0a
:: Change this path if your backend folder is located elsewhere
set BACKEND_PATH=d:\AKHIL\ACADEMIC\ALL sub\FFSD\codes\playcarys_updated\back-end
set FRONTEND_PATH=%~dp0

echo ==========================================
echo Starting PlayCarys Platform (Full Backend)
echo ==========================================
if not exist "%BACKEND_PATH%" (
    color 0c
    echo [ERROR] Backend directory not found: "%BACKEND_PATH%"
    echo Please update the BACKEND_PATH in this script.
    pause
    exit /b 1
)

echo [1/3] Starting PlayCarys NestJS Backend...
start "PlayCarys Backend Server" cmd /k "cd /d "%BACKEND_PATH%" && npm run start:dev"

echo [2/3] Preparing PlayCarys Frontend...
cd /d "%FRONTEND_PATH%"

if not exist "node_modules\" (
    echo [INFO] node_modules not found. Installing frontend dependencies...
    call npm install
)

echo [3/3] Starting PlayCarys Frontend Server...
start "PlayCarys Web Server" cmd /c "npx http-server . -p 8080 -c-1 & pause"

echo.
echo ========================================================
echo ALL ENGINES ENGAGED! Waiting for servers to boot...
echo ========================================================
:: Wait 3 seconds to ensure http-server is fully bound to the port
timeout /t 3 /nobreak >nul

echo Opening the PlayCarys Dashboard...
start http://localhost:8080
exit /b
