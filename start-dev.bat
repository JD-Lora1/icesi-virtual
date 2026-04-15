@echo off
setlocal

cd /d "%~dp0"

echo ================================
echo ICESI VIRTUAL - START DEV
echo ================================

docker --version >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Docker no esta instalado o no esta en PATH.
  exit /b 1
)

docker compose version >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Docker Compose no esta disponible.
  exit /b 1
)

echo [1/6] Levantando servicios base...
docker compose up -d --build postgres backend frontend
if errorlevel 1 (
  echo [ERROR] No se pudieron iniciar los servicios Docker.
  exit /b 1
)

echo [2/6] Instalando dependencias PHP del backend...
docker compose exec backend composer install
if errorlevel 1 (
  echo [ERROR] Fallo composer install.
  exit /b 1
)

echo [3/6] Preparando .env backend...
copy /Y "backend\.env.example" "backend\.env" >nul

echo [4/6] Aplicando key/migraciones/seed si artisan existe...
docker compose exec backend php artisan key:generate --force
docker compose exec backend php artisan migrate --seed --force

echo [5/6] Levantando frontend...
docker compose exec frontend npm install
if errorlevel 1 (
  echo [ERROR] Fallo npm install en frontend.
  exit /b 1
)

echo [6/6] Verificando servicios...
docker compose ps

echo.
echo Servicios activos:
echo - Backend:  http://localhost:8000
echo - Frontend: http://localhost:5173
echo - Postgres: localhost:5432
echo.
echo Para ver logs: docker compose logs -f

endlocal
