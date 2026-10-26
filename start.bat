@echo off
title Dhun - Ad-Free Indian Music App
echo ========================================================
echo   Starting Dhun - Ad-Free Indian Music App
echo ========================================================
echo.

set "PATH=C:\Program Files\nodejs;%PATH%"

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found. Please verify Node.js installation.
    pause
    exit /b 1
)

start "" http://localhost:5000
node server.js

pause
