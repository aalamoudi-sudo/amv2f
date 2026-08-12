@echo off
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  start "KAGA Local Server" /min py -3 -m http.server 4174 --bind 127.0.0.1 --directory app
) else (
  start "KAGA Local Server" /min python -m http.server 4174 --bind 127.0.0.1 --directory app
)
timeout /t 1 /nobreak >nul
start "" "http://127.0.0.1:4174/"
