#!/usr/bin/env bash
# OpenClaw 汉化版便携包启动脚本
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NODE="${ROOT}/node/bin/node"
APP="${ROOT}/app/openclaw.mjs"
if [ ! -x "$NODE" ]; then
  NODE="${ROOT}/node/node"
fi
exec "$NODE" "$APP" "$@"
