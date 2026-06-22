#!/usr/bin/env bash
set -euo pipefail

# backup_production.sh
# Připraví zálohu produkce do /var/www/__BCK_PRODUKCE/<DATE>
# Používejte s opatrností. Spouštět až po potvrzení uživatele.

DATE=$(date +%F)
BACKUP_BASE=/var/www/__BCK_PRODUKCE
BACKUP_DIR="$BACKUP_BASE/$DATE"

# Výchozí produkční cesty (pokud nejsou přepsány parametrem)
PROD_ROOT=/var/www/erdms-platform
PROD_ENV="$PROD_ROOT/apps/eeo-v2/api-legacy/api.eeo/.env"

# Detectovat, zda je sudo dostupný
if command -v sudo &> /dev/null; then
  SUDO_CMD="sudo"
else
  SUDO_CMD=""
fi

DRY_RUN=1

usage(){
  cat <<EOF
Usage: $0 [--run] [--prod-root PATH] [--env PATH]
  --run          Actually perform the backup (default: dry-run)
  --prod-root    Path to production root (default: /var/www/erdms-platform)
  --env          Path to production .env (default under prod-root)
EOF
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --run) DRY_RUN=0; shift ;;
    --prod-root) PROD_ROOT=$2; PROD_ENV="$PROD_ROOT/apps/eeo-v2/api-legacy/api.eeo/.env"; shift 2 ;;
    --env) PROD_ENV=$2; shift 2 ;;
    -h|--help) usage ;;
    *) echo "Unknown arg: $1"; usage ;;
  esac
done

echo "Backup date: $DATE"
echo "Production root: $PROD_ROOT"
echo "Env file: $PROD_ENV"

if [[ ! -d "$PROD_ROOT" ]]; then
  echo "ERROR: Production root not found: $PROD_ROOT" >&2
  exit 2
fi

if [[ ! -f "$PROD_ENV" ]]; then
  echo "WARNING: Production .env not found at $PROD_ENV" >&2
  echo "Continuing but upload paths or DB credentials may be missing."
fi

# Helper to read env value
env_val(){
  local key=$1
  if [[ -f "$PROD_ENV" ]]; then
    grep -E "^${key}=" "$PROD_ENV" 2>/dev/null | sed -e 's/^'"${key}"'=//' -e 's/^"//' -e 's/"$//' || true
  fi
}

DB_HOST=$(env_val DB_HOST)
DB_PORT=$(env_val DB_PORT)
DB_NAME=$(env_val DB_NAME)
DB_USER=$(env_val DB_USER)
DB_PASSWORD=$(env_val DB_PASSWORD)
UPLOAD_ROOT_PATH=$(env_val UPLOAD_ROOT_PATH)

# sensible defaults if missing
DB_PORT=${DB_PORT:-3306}
UPLOAD_ROOT_PATH=${UPLOAD_ROOT_PATH:-$PROD_ROOT/data/eeo-v2/prilohy/}

echo "Detected DB: ${DB_NAME:-<not-set>}@${DB_HOST:-<not-set>}:$DB_PORT"
echo "Detected uploads: $UPLOAD_ROOT_PATH"

if [[ $DRY_RUN -eq 1 ]]; then
  echo "DRY RUN - no changes will be made. Rerun with --run to execute." 
fi

# Create backup dir
if [[ $DRY_RUN -eq 0 ]]; then
  $SUDO_CMD mkdir -p "$BACKUP_DIR"
  $SUDO_CMD chown root:root "$BACKUP_DIR"
else
  echo "Would create: $BACKUP_DIR"
fi

# Rsync function
do_rsync(){
  local src="$1" dest="$2"
  if [[ $DRY_RUN -eq 1 ]]; then
    echo "DRY: rsync -aHAX --progress --exclude='.git' --numeric-ids \"$src\" \"$dest\""
  else
    $SUDO_CMD rsync -aHAX --progress --exclude='.git' --numeric-ids "$src" "$dest"
  fi
}

# 1) Backup webapp (FE+BE)
WEB_SRC="$PROD_ROOT/apps/eeo-v2/"
WEB_DEST="$BACKUP_DIR/web/"
do_rsync "$WEB_SRC" "$WEB_DEST"

# 2) Backup uploads / prilohy
PRIL_DEST="$BACKUP_DIR/prilohy/"
do_rsync "$UPLOAD_ROOT_PATH" "$PRIL_DEST"

# 3) Full DB dump
if [[ -z "$DB_NAME" || -z "$DB_USER" ]]; then
  echo "Skipping DB dump; DB_NAME or DB_USER not detected in .env" >&2
else
  DUMP_FILE="$BACKUP_DIR/${DB_NAME}_full_${DATE}.sql.gz"
  if [[ $DRY_RUN -eq 1 ]]; then
    echo "DRY: mysqldump --single-transaction --routines --events --triggers -h $DB_HOST -P $DB_PORT -u$DB_USER -pPASSWORD $DB_NAME | gzip > $DUMP_FILE"
  else
    # create temporary my.cnf to avoid password on cmdline
    TMP_CNF=$(mktemp)
    chmod 600 "$TMP_CNF"
    cat > "$TMP_CNF" <<EOF
[client]
host=$DB_HOST
port=$DB_PORT
user=$DB_USER
password=$DB_PASSWORD
EOF
    if [[ -n "$SUDO_CMD" ]]; then
      $SUDO_CMD --preserve-env=TMPDIR mysqldump --defaults-extra-file="$TMP_CNF" --single-transaction --routines --events --triggers "$DB_NAME" | gzip > "$DUMP_FILE"
    else
      mysqldump --defaults-extra-file="$TMP_CNF" --single-transaction --routines --events --triggers "$DB_NAME" | gzip > "$DUMP_FILE"
    fi
    rm -f "$TMP_CNF"
    if [[ -n "$SUDO_CMD" ]]; then
      $SUDO_CMD chown root:root "$DUMP_FILE"
    fi
  fi
fi

# 4) Checksums and manifest
if [[ $DRY_RUN -eq 1 ]]; then
  echo "DRY: sha256sum $BACKUP_DIR/* > $BACKUP_DIR/checksums.sha256"
else
  sha256sum "$BACKUP_DIR"/* > "$BACKUP_DIR/checksums.sha256" 2>/dev/null || true
  echo "$(date -u) - backup created" | tee "$BACKUP_DIR/backup.log"
  if [[ -n "$SUDO_CMD" ]]; then
    $SUDO_CMD chown root:root "$BACKUP_DIR" -R
  fi
  echo "Backup completed: $BACKUP_DIR"
fi

echo "Done."
