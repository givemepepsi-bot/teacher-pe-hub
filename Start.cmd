@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Please install Node.js and try again.
  pause
  exit /b 1
)
echo PE Teacher Hub: http://127.0.0.1:5173
echo Keep this window open. Press Ctrl+C to stop.
start "" "http://127.0.0.1:5173"
node server.mjs
pause
