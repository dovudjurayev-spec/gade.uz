#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "→ Building Next.js…"
npm run build

echo "→ Assembling deploy/…"
rm -rf deploy deploy.tar.gz
mkdir deploy
cp -r .next/standalone/. deploy/
cp -r .next/static deploy/.next/static
cp -r public deploy/public

echo "→ Packing deploy.tar.gz…"
tar -C deploy -czf deploy.tar.gz .

SIZE=$(du -h deploy.tar.gz | cut -f1)
echo "✓ deploy.tar.gz ready ($SIZE)"
