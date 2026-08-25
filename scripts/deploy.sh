#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

# --- CONFIG ---
SSH_USER="gadeuz"
SSH_HOST="uz03.ahost.uz"
SSH_PORT="22"
REMOTE_DIR="~/gade-uz"
# --------------

./scripts/build-deploy.sh

echo "→ Syncing to ${SSH_USER}@${SSH_HOST}:${REMOTE_DIR}…"
rsync -avz --delete \
  --exclude='.env' \
  --exclude='tmp/' \
  -e "ssh -p ${SSH_PORT}" \
  deploy/ "${SSH_USER}@${SSH_HOST}:${REMOTE_DIR}/"

echo "→ Restarting app…"
ssh -p ${SSH_PORT} "${SSH_USER}@${SSH_HOST}" "touch ${REMOTE_DIR}/tmp/restart.txt || mkdir -p ${REMOTE_DIR}/tmp && touch ${REMOTE_DIR}/tmp/restart.txt"

echo "✓ Deployed."
