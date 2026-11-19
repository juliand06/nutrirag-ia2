#!/bin/sh
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_FILE="${BACKUP_DIR}/nutrirag_${PGDATABASE:-nutrirag_db}_${STAMP}.dump"

mkdir -p "$BACKUP_DIR"

echo "[backup] Generando dump comprimido: $OUT_FILE"
pg_dump --format=custom --compress=9 --no-owner --no-privileges "$PGDATABASE" > "$OUT_FILE"

echo "[backup] Verificando integridad con pg_restore --list"
pg_restore --list "$OUT_FILE" > /dev/null

sha256sum "$OUT_FILE" > "${OUT_FILE}.sha256"

echo "[backup] Rotando backups mayores a ${RETENTION_DAYS} días"
find "$BACKUP_DIR" -type f \( -name "*.dump" -o -name "*.dump.sha256" \) -mtime "+${RETENTION_DAYS}" -delete

echo "[backup] Completado OK: $OUT_FILE"
