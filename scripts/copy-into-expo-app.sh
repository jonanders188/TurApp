#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="${1:-.}"
mkdir -p "$TARGET_DIR/src/data" "$TARGET_DIR/src/types" "$TARGET_DIR/src/utils" "$TARGET_DIR/assets/mockups"

cp data/trails.vestfold.json "$TARGET_DIR/src/data/trails.vestfold.json"
cp data/trails.vestfold.geojson "$TARGET_DIR/src/data/trails.vestfold.geojson"
cp src/types/trail.ts "$TARGET_DIR/src/types/trail.ts"
cp src/utils/filterTrails.ts "$TARGET_DIR/src/utils/filterTrails.ts"
cp src/utils/weatherScore.ts "$TARGET_DIR/src/utils/weatherScore.ts"
cp mockups/*.png "$TARGET_DIR/assets/mockups/"

echo "Copied Turrute starter files into $TARGET_DIR"
echo "Next: import trails from src/data/trails.vestfold.json in your React Native screens."
