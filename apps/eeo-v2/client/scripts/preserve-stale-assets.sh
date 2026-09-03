#!/bin/bash
# Preserve old lazy-loaded chunks across builds so already-open browser tabs
# can still navigate long enough to show the update/reload prompt.

set -e

MODE="$1"
BUILD_DIR="${2:-build}"
CACHE_DIR=".stale-build-assets/$BUILD_DIR"

case "$MODE" in
  before)
    rm -rf "$CACHE_DIR"
    if [ -d "$BUILD_DIR/static" ]; then
      mkdir -p "$CACHE_DIR/static"
      if [ -d "$BUILD_DIR/static/js" ]; then
        mkdir -p "$CACHE_DIR/static/js"
        find "$BUILD_DIR/static/js" -maxdepth 1 -type f \( -name '*.chunk.js' -o -name '*.chunk.js.map' \) -exec cp -p {} "$CACHE_DIR/static/js/" \;
      fi
      if [ -d "$BUILD_DIR/static/css" ]; then
        mkdir -p "$CACHE_DIR/static/css"
        find "$BUILD_DIR/static/css" -maxdepth 1 -type f \( -name '*.chunk.css' -o -name '*.chunk.css.map' \) -exec cp -p {} "$CACHE_DIR/static/css/" \;
      fi
    fi
    ;;
  after)
    if [ -d "$CACHE_DIR/static" ]; then
      mkdir -p "$BUILD_DIR/static/js" "$BUILD_DIR/static/css"
      if [ -d "$CACHE_DIR/static/js" ]; then
        find "$CACHE_DIR/static/js" -maxdepth 1 -type f -exec cp -pn {} "$BUILD_DIR/static/js/" \;
      fi
      if [ -d "$CACHE_DIR/static/css" ]; then
        find "$CACHE_DIR/static/css" -maxdepth 1 -type f -exec cp -pn {} "$BUILD_DIR/static/css/" \;
      fi
    fi
    ;;
  *)
    echo "Usage: $0 before|after [build-dir]" >&2
    exit 1
    ;;
esac
