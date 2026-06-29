#!/bin/sh
set -e

SCHEMA="./node_modules/@nehemias/db/prisma/schema.prisma"

echo "[api] Aplicando migraciones de la base de datos..."
pnpm exec prisma migrate deploy --schema "$SCHEMA"

echo "[api] Iniciando servidor Nehemías..."
exec node dist/server.js
