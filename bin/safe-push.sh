#!/usr/bin/env bash
set -euo pipefail
MESSAGE="${1:-Update TurApp}"
cd "$(dirname "$0")/.."
./bin/clean-turapp.sh
git add .gitignore app components lib types scripts docs sql supabase/migrations package.json package-lock.json tsconfig.json tailwind.config.ts postcss.config.js next-env.d.ts bin turapp-aliases.sh
./bin/check-git-safe.sh
npm run build
git commit -m "$MESSAGE"
git push
