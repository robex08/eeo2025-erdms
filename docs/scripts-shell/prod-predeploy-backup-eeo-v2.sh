#!/bin/bash
set -euo pipefail

# PROD pre-deploy backup (DB + FE/BE code)
# Usage:
#   ./prod-predeploy-backup-eeo-v2.sh
#
# Notes:
# - Runs on PROD server.
# - Creates:
#   1) full DB dump (gzip)
#   2) FE+BE code backup (without data attachments focus)

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_ROOT="/var/www/__BCK_PRODUKCE/eeo-v2-predeploy-${TIMESTAMP}"
APP_SRC="/var/www/erdms-platform/apps/eeo-v2"
ENV_FILE="${APP_SRC}/api-legacy/api.eeo/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ Missing env file: $ENV_FILE"
  exit 1
fi

mkdir -p "$BACKUP_ROOT"

# Load DB vars from .env (PROD)
set -a
source "$ENV_FILE"
set +a

: "${DB_HOST:?DB_HOST missing in .env}"
: "${DB_PORT:?DB_PORT missing in .env}"
: "${DB_NAME:?DB_NAME missing in .env}"
: "${DB_USER:?DB_USER missing in .env}"
: "${DB_PASSWORD:?DB_PASSWORD missing in .env}"

DB_DUMP_FILE="${BACKUP_ROOT}/db-${DB_NAME}-${TIMESTAMP}.sql.gz"
APP_BACKUP_DIR="${BACKUP_ROOT}/eeo-v2-app"

# 1) FULL DB DUMP
export MYSQL_PWD="$DB_PASSWORD"
mysqldump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --user="$DB_USER" \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  --events \
  "$DB_NAME" | gzip -9 > "$DB_DUMP_FILE"
unset MYSQL_PWD

echo "✅ DB dump: $DB_DUMP_FILE"

# 2) FE + BE CODE BACKUP
# Data attachments are intentionally not addressed here per deployment note.
rsync -a \
  --delete \
  --exclude 'api-legacy/api.eeo/uploads/' \
  --exclude 'api-legacy/api.eeo/cache/' \
  --exclude 'api-legacy/api.eeo/temp/' \
  --exclude 'api-legacy/api.eeo/logs/' \
  "$APP_SRC/" "$APP_BACKUP_DIR/"

echo "✅ FE+BE backup: $APP_BACKUP_DIR"
echo "✅ Done: $BACKUP_ROOT"
