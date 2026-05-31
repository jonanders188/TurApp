#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="../turapp-context-$(date +%Y%m%d-%H%M).zip"
zip -r "$OUT" \
  app components lib types scripts docs sql supabase/migrations \
  package.json package-lock.json tsconfig.json tailwind.config.ts postcss.config.js next-env.d.ts \
  data/curated-vestfold-trails.json turapp-aliases.sh bin \
  -x "node_modules/*" \
  -x ".next/*" \
  -x ".git/*" \
  -x ".vercel/*" \
  -x ".env" \
  -x ".env.*" \
  -x "*.log" \
  -x "*.zip" \
  -x ".DS_Store" \
  -x "tsconfig.tsbuildinfo" \
  -x "data/imported/*" \
  -x "data/osm/*"
ls -lh "$OUT"
unzip -l "$OUT" | grep -E "node_modules|\.next|\.git|\.env|data/imported|data/osm|\.pbf|\.geojson" && { echo "ADVARSEL: Zipen inneholder noe den ikke burde."; exit 1; } || echo "OK: Zip ser ren ut."
echo "Last opp: $OUT"
