#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

start_backend() {
  (cd "$ROOT_DIR/backend" && php artisan serve --host=0.0.0.0 --port=8000) &
  BACKEND_PID=$!
}

start_frontend() {
  (cd "$ROOT_DIR/frontend" && npm run dev -- --host 0.0.0.0 --port 5173) &
  FRONTEND_PID=$!
}

cleanup() {
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
}

trap cleanup EXIT

printf 'Starting Laravel backend and Vite frontend...\n'
start_backend
start_frontend

printf 'Backend:  http://localhost:8000\n'
printf 'Frontend: http://localhost:5173\n'
printf 'Press Ctrl+C to stop both servers.\n'

wait
