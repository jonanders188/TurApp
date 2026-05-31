#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

bad_files="$(git diff --cached --name-only | grep -E '(^node_modules/|^\.next/|^data/osm/|\.pbf$|\.geojson$|data/imported/.*\.json$|\.env|\.zip$|tsconfig\.tsbuildinfo$)' || true)"

if [ -n "$bad_files" ]; then
  echo "STOPP: Disse filene skal ikke committes:"
  echo "$bad_files"
  echo "Fjern dem med: git restore --staged <fil>"
  exit 1
fi

echo "OK: Ingen store/hemmelige filer staged."
