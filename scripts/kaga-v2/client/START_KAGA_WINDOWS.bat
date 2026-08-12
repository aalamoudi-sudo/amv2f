@echo off
setlocal
cd /d "%~dp0"
start "KAGA V2" http://127.0.0.1:8080/
py -3 -m http.server 8080 --directory app
endlocal
