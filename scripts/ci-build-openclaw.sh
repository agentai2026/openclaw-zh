#!/usr/bin/env bash
# 克隆官方 openclaw → 应用汉化 → 构建（供 CI / 多平台 Release 复用）
set -euo pipefail

ROOT="${GITHUB_WORKSPACE:-$(pwd)}"
cd "$ROOT"

UPSTREAM_VERSION="${UPSTREAM_VERSION:?需要 UPSTREAM_VERSION}"
UPSTREAM_REPO="${UPSTREAM_REPO:-openclaw/openclaw}"
OPENCLAW_TARGET="${OPENCLAW_TARGET:-openclaw}"
OVERLAY_ROOT="$ROOT"

if [ -d "$OPENCLAW_TARGET" ]; then
  rm -rf "$OPENCLAW_TARGET"
fi

git clone --depth 1 "https://github.com/${UPSTREAM_REPO}.git" "$OPENCLAW_TARGET"

export OPENCLAW_TARGET OVERLAY_ROOT

if [ "${APPLY_I18N:-1}" = "0" ]; then
  echo "[build] 官方版（不应用汉化）"
  node -e "
  const fs=require('fs');
  const p='${OPENCLAW_TARGET}/package.json';
  const j=JSON.parse(fs.readFileSync(p,'utf8'));
  j.version=process.env.UPSTREAM_VERSION;
  j.name='openclaw';
  fs.writeFileSync(p, JSON.stringify(j,null,2)+'\n');
  "
else
  node scripts/apply-package-zh.js
  node scripts/apply-i18n.js
  OPENCLAW_TARGET="$OPENCLAW_TARGET" UPSTREAM_VERSION="$UPSTREAM_VERSION" \
    FORCE_REVISION="${FORCE_REVISION:-}" node scripts/bump-openclaw-version.js
fi

cd "$OPENCLAW_TARGET"
corepack enable
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=8192}"
pnpm install --no-frozen-lockfile --reporter=append-only

cd "$ROOT"
OPENCLAW_TARGET="$OPENCLAW_TARGET" node scripts/regenerate-schema-artifacts.mjs

cd "$OPENCLAW_TARGET"
pnpm canvas:a2ui:bundle || true
node scripts/tsdown-build.mjs
node scripts/runtime-postbuild.mjs
node scripts/build-stamp.mjs || true
pnpm build:plugin-sdk:dts || echo "[build] plugin-sdk dts 跳过"
node --import tsx scripts/write-plugin-sdk-entry-dts.ts || true
node --import tsx scripts/canvas-a2ui-copy.ts || true
node --import tsx scripts/copy-hook-metadata.ts || true
node --import tsx scripts/copy-export-html-templates.ts || true
node --import tsx scripts/write-build-info.ts || true
node --import tsx scripts/write-cli-startup-metadata.ts || true
node --import tsx scripts/write-cli-compat.ts || true
pnpm ui:build || true

cd "$ROOT"
if [ "${APPLY_I18N:-1}" != "0" ]; then
  OPENCLAW_TARGET="$OPENCLAW_TARGET" node scripts/prepare-npm-publish.js
  cp README.md "$OPENCLAW_TARGET/README.md"
  if [ -d "$OPENCLAW_TARGET/dist" ] && [[ "${RUNNER_OS:-Linux}" != "Windows" ]]; then
    find "$OPENCLAW_TARGET/dist" -type f \( -name '*.js' -o -name '*.mjs' -o -name '*.cjs' \) -print0 | \
      xargs -0 sed -i -E 's#(from |import |import\(|require\()"openclaw(["/])#\1"@agentai2027/openclaw-zh\2#g' || true
  fi
fi

BUILT_VERSION=$(node -p "require('./${OPENCLAW_TARGET}/package.json').version")
echo "[build] 完成，版本 ${BUILT_VERSION}"
echo "built_version=${BUILT_VERSION}" >> "${GITHUB_OUTPUT:-/dev/null}"
