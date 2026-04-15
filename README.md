# icesi-virtual-project

Monorepo para un sistema de gestion curricular con:

- `backend/`: Laravel 11 completo, orientado a API REST
- `frontend/`: React 18 + Vite
- `data/`: scripts SQL existentes (`INIT.sql`, `INSERT.sql`, `DROP.sql`)
- `docker-compose.yml`: orquestacion de PostgreSQL, backend y frontend
- `start-dev.bat`: arranque sencillo para Windows

## Estructura

```text
icesi-virtual/
├── backend/
│   ├── app/Http/Controllers/Api/HealthController.php
│   ├── routes/api.php
│   ├── bootstrap/app.php
│   ├── docker/Dockerfile
│   ├── .env.example
│   ├── artisan
│   └── composer.json
├── frontend/
│   ├── src/components/HealthCheck.jsx
│   ├── src/services/api.js
│   ├── src/hooks/useHealth.js
│   ├── src/App.jsx
│   ├── src/main.jsx
│   ├── package.json
│   ├── vite.config.js
│   ├── Dockerfile
│   └── .env.example
├── data/
│   ├── INIT.sql
│   ├── INSERT.sql
│   └── DROP.sql
├── docker-compose.yml
├── start-dev.bat
└── .env.example
```

## Requisitos

- Docker Desktop con Docker Compose
- Windows (para usar `start-dev.bat`)

## Inicio rapido

1. En la raiz del proyecto, ejecuta:

```bat
start-dev.bat
```

El script hace este flujo:

1. `docker compose up -d --build postgres backend frontend`
2. `docker compose exec backend composer install`
3. `docker compose exec backend php artisan key:generate --force`
4. `docker compose exec backend php artisan migrate --seed --force`
5. `docker compose exec frontend npm install`

2. URLs esperadas:

- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- PostgreSQL: localhost:5432

## Endpoint API de ejemplo

Ruta en backend:

- `GET /api/health`

Respuesta esperada (JSON):

```json
{
  "status": "ok",
  "service": "icesi-virtual-backend",
  "timestamp": "2026-04-14T00:00:00Z"
}
```

## Frontend: ejemplo de consumo

El frontend incluye ejemplo de consumo con `fetch` en:

- `frontend/src/services/api.js`
- `frontend/src/hooks/useHealth.js`
- `frontend/src/components/HealthCheck.jsx`

## Backend Laravel

El backend ya fue inicializado con Laravel 11 completo. La API de ejemplo se expone en:

- `GET /api/health`

Archivos clave:

- `backend/.env.example` (conexion PostgreSQL)
- `backend/bootstrap/app.php` (habilita rutas API)
- `backend/routes/api.php` (ruta `/api/health`)
- `backend/app/Http/Controllers/Api/HealthController.php` (controller ejemplo)

## Comandos utiles

```bash
docker compose up -d --build
docker compose logs -f backend
docker compose logs -f frontend
docker compose down
```
