@echo off
cd /d "%~dp0app"
start "KAGA Static Server" /min py -m http.server 4176 --bind 127.0.0.1
timeout /t 2 /nobreak >nul
start "KAGA FINAL EXPERIENCE" http://127.0.0.1:4176
