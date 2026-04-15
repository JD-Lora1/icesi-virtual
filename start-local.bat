@echo off
setlocal

cd /d "%~dp0"

echo Starting Laravel backend and Vite frontend...

start "Icesi Virtual API" /D "%~dp0backend" cmd /k "php artisan serve --host=0.0.0.0 --port=8000"
start "Icesi Virtual Frontend" /D "%~dp0frontend" cmd /k "npm run dev -- --host 0.0.0.0 --port 5173"

echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo.
echo If a window closes immediately, verify PHP, Composer, Node and npm are installed.

endlocal
