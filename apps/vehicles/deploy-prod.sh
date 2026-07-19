#!/bin/bash
# Guarded deploy script for Vehicles production frontend.
# Deploy is blocked unless explicit approval token is provided.

set -euo pipefail

APP_DIR="/var/www/erdms-dev/apps/vehicles"
SRC_DIR="$APP_DIR/build-prod"
DST_DIR="/var/www/erdms-platform/apps/vehicles"
BACKUP_ROOT="/var/www/erdms-dev/backups"
REQUIRED_TOKEN="CHANGE_ME_EXPLICIT_USER_APPROVAL"

if [[ "${PROD_DEPLOY_APPROVAL:-}" != "$REQUIRED_TOKEN" ]]; then
	echo ""
	echo "ERROR: Production deploy is blocked."
	echo "This project is in full refactor mode and deploy requires explicit user approval."
	echo ""
	echo "To deploy, run exactly:"
	echo "PROD_DEPLOY_APPROVAL=$REQUIRED_TOKEN ./deploy-prod.sh"
	echo ""
	exit 42
fi

if [[ ! -d "$SRC_DIR" ]]; then
	echo "ERROR: Missing source directory: $SRC_DIR"
	echo "Run ./build-prod.sh first."
	exit 1
fi

if [[ ! -f "$SRC_DIR/index.html" ]]; then
	echo "ERROR: build-prod seems incomplete (index.html missing)."
	exit 1
fi

TS="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="$BACKUP_ROOT/vehicles_prod_files_$TS"
mkdir -p "$BACKUP_DIR"

echo "Backup current production frontend to: $BACKUP_DIR"
rsync -a --exclude 'api/' "$DST_DIR"/ "$BACKUP_DIR"/

echo "Deploy build-prod to production (frontend only, keep api/ intact)..."
rsync -a --delete --exclude 'api/' "$SRC_DIR"/ "$DST_DIR"/

DEPLOYED_JS="$(ls "$DST_DIR"/static/js/main.*.js | head -n1)"
echo "Deployed main bundle: $DEPLOYED_JS"
echo "Embedded DB label(s):"
grep -o "vehicle-zzs[-a-z]*" "$DEPLOYED_JS" | sort -u || true
echo "Embedded API path(s):"
grep -o "/dev/api\.vehicles/vehicle/api\.php\|/api\.vehicles/vehicle/api\.php" "$DEPLOYED_JS" | sort -u || true

echo "Smoke check /vehicles"
curl -sS "https://erdms.zachranka.cz/vehicles/" | grep -o "main\.[a-f0-9]\+\.js" | head -n1 || true

echo "Deploy completed successfully."
