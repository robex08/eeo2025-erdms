#!/bin/bash
set -euo pipefail

# Rsync only changed PHP files from DEV -> PROD.
# Changed set is detected automatically by checksum compare (DEV vs PROD).
# Default is DRY-RUN for safety.
#
# Usage:
#   ./prod-rsync-changed-php-eeo-v2.sh            # dry-run
#   ./prod-rsync-changed-php-eeo-v2.sh --apply    # real copy

MODE="dry-run"
if [[ "${1:-}" == "--apply" ]]; then
  MODE="apply"
fi

SRC_BASE="/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo"
DST_BASE="/var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo"

if [[ ! -d "$SRC_BASE" ]]; then
  echo "❌ Missing source dir: $SRC_BASE"
  exit 1
fi

if [[ ! -d "$DST_BASE" ]]; then
  echo "❌ Missing destination dir: $DST_BASE"
  exit 1
fi

RSYNC_OPTS=(-av --checksum --itemize-changes)
if [[ "$MODE" == "dry-run" ]]; then
  RSYNC_OPTS+=(--dry-run)
fi

# Detect changed PHP files by checksum (relative paths)
mapfile -t FILES < <(
  rsync -avnc --itemize-changes \
    --include='*/' \
    --include='*.php' \
    --exclude='*' \
    "$SRC_BASE/" "$DST_BASE/" \
  | awk '/^>f/ { sub(/^>[^ ]* +/, ""); print }'
)

if [[ ${#FILES[@]} -eq 0 ]]; then
  echo "✅ No PHP differences found between DEV and PROD."
  exit 0
fi

echo "Mode: $MODE"
echo "Source: $SRC_BASE"
echo "Target: $DST_BASE"
echo ""
echo "Detected changed PHP files (${#FILES[@]}):"
for rel in "${FILES[@]}"; do
  echo " - $rel"
done
echo ""

for rel in "${FILES[@]}"; do
  src="$SRC_BASE/$rel"
  dst="$DST_BASE/$rel"

  if [[ ! -f "$src" ]]; then
    echo "⚠️  Skip missing source file: $src"
    continue
  fi

  install -d "$(dirname "$dst")"
  rsync "${RSYNC_OPTS[@]}" "$src" "$dst"
done

echo ""
if [[ "$MODE" == "dry-run" ]]; then
  echo "✅ Dry-run done. Use --apply for real copy."
else
  echo "✅ PHP rsync applied."
fi
