#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf .next out dist build
rm -f tsconfig.tsbuildinfo
rm -f *.log
find . -name '.DS_Store' -delete
printf 'Ryddet lokale build/cache-filer.\n'
