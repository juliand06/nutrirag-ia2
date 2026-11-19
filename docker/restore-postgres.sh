#!/bin/sh
set -eu

if [ $# -lt 1 ]; then
  echo "Uso: $0 <archivo_backup.dump>"
  exit 1
fi

DUMP_FILE="$1"
if [ ! -f "$DUMP_FILE" ]; then
  echo "Archivo no encontrado: $DUMP_FILE"
  exit 1
fi

if [ -f "${DUMP_FILE}.sha256" ]; then
  sha256sum -c "${DUMP_FILE}.sha256"
fi

echo "[restore] Verificando contenido del backup..."
pg_restore --list "$DUMP_FILE" > /dev/null

echo "[restore] Restaurando sobre base $PGDATABASE..."
pg_restore --clean --if-exists --no-owner --no-privileges -d "$PGDATABASE" "$DUMP_FILE"
echo "[restore] Restauración completada."
