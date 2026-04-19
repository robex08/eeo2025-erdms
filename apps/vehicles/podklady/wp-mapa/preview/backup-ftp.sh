#!/usr/bin/env bash
set -euo pipefail

# Stáhne lokální zálohu z FTP.
# Výchozí cíl je ../ftp-backup-YYYYmmdd-HHMMSS (tj. o úroveň výš než preview/).
# Složka "down" se záměrně ignoruje.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_ENV_FILE="$SCRIPT_DIR/../../.env"
LOCAL_ENV_FILE="$SCRIPT_DIR/.env.ftp"

if [[ -f "$ROOT_ENV_FILE" ]]; then
  # shellcheck disable=SC1091
  source "$ROOT_ENV_FILE"
fi

if [[ -f "$LOCAL_ENV_FILE" ]]; then
  # shellcheck disable=SC1091
  source "$LOCAL_ENV_FILE"
fi

FTP_USER="${FTP_USER:-${FTP_USERNAME:-}}"
FTP_PASS="${FTP_PASS:-${FTP_PASSWORD:-}}"
FTP_REMOTE_DIR="${FTP_BACKUP_REMOTE_PATH:-${FTP_ROOT_PATH:-${FTP_REMOTE_DIR:-}}}"

: "${FTP_HOST:?Missing FTP_HOST}"
: "${FTP_USER:?Missing FTP_USER}"
: "${FTP_PASS:?Missing FTP_PASS}"
: "${FTP_REMOTE_DIR:?Missing FTP_REMOTE_DIR}"
FTP_PORT="${FTP_PORT:-21}"
FTP_SSL="${FTP_SSL:-false}"

if ! command -v lftp >/dev/null 2>&1; then
  echo "Chybí lftp. Nainstaluj ho (např. sudo apt install lftp)."
  exit 1
fi

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_BASE_DIR="${FTP_LOCAL_BACKUP_ROOT:-$SCRIPT_DIR/..}"
BACKUP_DIR="$BACKUP_BASE_DIR/ftp-backup-$TIMESTAMP"

mkdir -p "$BACKUP_DIR"

SSL_FLAG="off"
if [[ "$FTP_SSL" == "true" ]]; then
  SSL_FLAG="on"
fi

echo "[1/1] Stahuji FTP zálohu do: $BACKUP_DIR"

lftp -u "$FTP_USER","$FTP_PASS" -p "$FTP_PORT" "$FTP_HOST" <<EOF
set ssl:verify-certificate no
set ftp:ssl-allow $SSL_FLAG
set net:max-retries 2
set net:timeout 20
set xfer:clobber on

cd "$FTP_REMOTE_DIR"
mirror --verbose \
  --exclude-glob down \
  --exclude-glob down/** \
  --exclude-glob */down \
  --exclude-glob */down/** \
  . "$BACKUP_DIR"
bye
EOF

echo "Hotovo: záloha uložena v $BACKUP_DIR"
