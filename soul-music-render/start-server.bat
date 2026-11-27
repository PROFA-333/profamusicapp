@echo off
setlocal
cd /d "%~dp0"

title Soul Music Server (port 3001)
echo.
echo  Soul Music server launcher
echo  Working dir: %CD%
echo  Listening on: 0.0.0.0:3001  (phone URL: http://192.168.1.2:3001)
echo  Press Ctrl+C to stop.
echo.

:loop
npm start
echo.
echo  Server exited (code %ERRORLEVEL%). Restarting in 3 seconds...
echo  (Press Ctrl+C now to stop.)
timeout /t 3 /nobreak >nul
goto loop