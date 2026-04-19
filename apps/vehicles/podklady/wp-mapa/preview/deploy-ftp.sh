#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   cp .env.ftp.example .env.ftp
#   edit .env.ftp
#   ./deploy-ftp.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

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

# Mapování proměnných z kořenového .env
FTP_USER="${FTP_USER:-${FTP_USERNAME:-}}"
FTP_PASS="${FTP_PASS:-${FTP_PASSWORD:-}}"
FTP_REMOTE_DIR="${FTP_ROOT_PATH:-${FTP_REMOTE_DIR:-}}"

: "${FTP_HOST:?Missing FTP_HOST}"
: "${FTP_USER:?Missing FTP_USER}"
: "${FTP_PASS:?Missing FTP_PASS}"
: "${FTP_REMOTE_DIR:?Missing FTP_REMOTE_DIR}"
FTP_PORT="${FTP_PORT:-21}"
FTP_SSL="${FTP_SSL:-false}"

if [[ "${FTP_DELETE:-}" == "true" ]]; then
  echo "Upozornění: FTP_DELETE=true je ignorováno. Mazání na FTP je natrvalo zakázané."
fi

if ! command -v lftp >/dev/null 2>&1; then
  echo "Chybí lftp. Nainstaluj ho (např. sudo apt install lftp)."
  exit 1
fi

echo "[1/2] Build Vite aplikace"
npm run build

echo "[2/2] Upload dist/ přes FTP"
SSL_FLAG="off"
if [[ "$FTP_SSL" == "true" ]]; then
  SSL_FLAG="on"
fi

lftp -u "$FTP_USER","$FTP_PASS" -p "$FTP_PORT" "$FTP_HOST" <<EOF
set ssl:verify-certificate no
set ftp:ssl-allow $SSL_FLAG
set net:max-retries 2
set net:timeout 20
set xfer:clobber on

mkdir -p "$FTP_REMOTE_DIR"
cd "$FTP_REMOTE_DIR"
mirror -R --verbose dist/ .
bye
EOF

echo "Hotovo: dist/ nahráno do $FTP_HOST:$FTP_REMOTE_DIR"
