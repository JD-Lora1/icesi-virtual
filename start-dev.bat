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
docker compose up -d --build postgres backend
if errorlevel 1 (
  echo [ERROR] No se pudieron iniciar postgres/backend.
  exit /b 1
)

echo [2/6] Instalando dependencias backend si Laravel ya existe...
if exist "backend\artisan" (
  docker compose run --rm backend composer install
  if errorlevel 1 (
    echo [ERROR] Fallo composer install.
    exit /b 1
  )
) else (
  echo [WARN] No se encontro backend\artisan.
  echo [WARN] El backend queda como estructura base. Inicializa Laravel completo para ejecutar artisan.
)

echo [3/6] Preparando .env backend...
if not exist "backend\.env" copy "backend\.env.example" "backend\.env" >nul

echo [4/6] Aplicando key/migraciones/seed si artisan existe...
if exist "backend\artisan" (
  docker compose run --rm backend php artisan key:generate --force
  docker compose run --rm backend php artisan migrate --seed --force
) else (
  echo [WARN] Se omiten migraciones/seed porque Laravel no esta inicializado.
)

echo [5/6] Levantando frontend...
docker compose up -d --build frontend
if errorlevel 1 (
  echo [ERROR] No se pudo iniciar frontend.
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
