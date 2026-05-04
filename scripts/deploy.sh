#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${APP_DIR}/docker-compose.prod.yml"

compose() {
  docker compose -f "${COMPOSE_FILE}" "$@"
}

cd "${APP_DIR}"

echo "[deploy] syncing repository"
git fetch origin main
git reset --hard origin/main

echo "[deploy] building production images"
compose build backend nginx

echo "[deploy] ensuring runtime dependencies are up"
compose up -d redis

echo "[deploy] running database migrations"
compose run --rm backend npm run migration:run

echo "[deploy] starting application services"
compose up -d --remove-orphans backend nginx redis

echo "[deploy] checking backend health"
compose exec -T backend node -e "fetch('http://127.0.0.1:4000/health').then(async (res) => { if (!res.ok) process.exit(1); console.log(await res.text()); }).catch((error) => { console.error(error); process.exit(1); })"

echo "[deploy] done"
