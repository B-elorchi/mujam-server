#!/bin/sh
set -e

echo "==> Waiting for PostgreSQL and applying migrations"

i=0
until npx prisma migrate deploy; do
  i=$((i + 1))
  if [ "$i" -ge 30 ]; then
    echo "ERROR: PostgreSQL is not reachable after 60s."
    echo "On the VPS, DATABASE_URL must use host.docker.internal (not localhost),"
    echo "and Postgres must accept connections from Docker (172.16.0.0/12)."
    exit 1
  fi
  echo "Database not ready yet (attempt $i/30). Retrying in 2s..."
  sleep 2
done

if [ "${RUN_SEED:-false}" = "true" ]; then
  echo "==> Seeding database"
  npx ts-node prisma/seed.ts
  echo "==> Seed finished"
  exit 0
fi

echo "==> Starting API"
exec node dist/server.js
