#!/usr/bin/env bash
# OpenClaw 汉化版 - Linux/macOS 一键安装
# 用法: curl -fsSL https://raw.githubusercontent.com/agentai2026/openclaw-zh/main/deploy/install.sh | bash

set -euo pipefail

NPM_PACKAGE="@agentai2027/openclaw-zh"
MIN_NODE_MAJOR=22
REPO_URL="https://github.com/agentai2026/openclaw-zh"

# 颜色输出
if [ -t 1 ]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  CYAN='\033[0;36m'
  NC='\033[0m'
else
  RED='' GREEN='' YELLOW='' CYAN='' NC=''
fi

info()  { echo -e "${CYAN}[信息]${NC} $*"; }
ok()    { echo -e "${GREEN}[成功]${NC} $*"; }
warn()  { echo -e "${YELLOW}[警告]${NC} $*"; }
err()   { echo -e "${RED}[错误]${NC} $*" >&2; }

node_major() {
  node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo "0"
}

install_node() {
  warn "未检测到 Node.js >= ${MIN_NODE_MAJOR}，尝试自动安装..."
  if command -v brew >/dev/null 2>&1; then
    info "使用 Homebrew 安装 node@${MIN_NODE_MAJOR}..."
    brew install "node@${MIN_NODE_MAJOR}" || brew install node
  elif command -v apt-get >/dev/null 2>&1; then
    info "使用 NodeSource 安装 Node.js ${MIN_NODE_MAJOR}..."
    curl -fsSL https://deb.nodesource.com/setup_${MIN_NODE_MAJOR}.x | sudo -E bash -
    sudo apt-get install -y nodejs
  elif command -v dnf >/dev/null 2>&1; then
    curl -fsSL https://rpm.nodesource.com/setup_${MIN_NODE_MAJOR}.x | sudo bash -
    sudo dnf install -y nodejs
  else
    err "请手动安装 Node.js >= ${MIN_NODE_MAJOR}: https://nodejs.org/"
    exit 1
  fi
}

main() {
  echo -e "${CYAN}"
  echo "  ╔═══════════════════════════════════════╗"
  echo "  ║     OpenClaw 汉化版 一键安装脚本      ║"
  echo "  ╚═══════════════════════════════════════╝"
  echo -e "${NC}"

  if ! command -v node >/dev/null 2>&1; then
    install_node
  fi

  MAJOR=$(node_major)
  if [ "$MAJOR" -lt "$MIN_NODE_MAJOR" ]; then
    warn "当前 Node.js 主版本为 ${MAJOR}，需要 >= ${MIN_NODE_MAJOR}"
    install_node
    MAJOR=$(node_major)
  fi

  ok "Node.js $(node -v) 已就绪"

  if ! command -v npm >/dev/null 2>&1; then
    err "未找到 npm，请重新安装 Node.js"
    exit 1
  fi

  info "正在安装 ${NPM_PACKAGE}（全局）..."
  if npm install -g "${NPM_PACKAGE}@latest"; then
    ok "安装完成！"
  else
    err "npm 安装失败，请检查网络或权限（可尝试 sudo）"
    exit 1
  fi

  echo ""
  info "验证安装..."
  if command -v openclaw >/dev/null 2>&1; then
    openclaw --version 2>/dev/null || true
  fi

  echo ""
  ok "OpenClaw 汉化版已安装"
  info "文档: ${REPO_URL}"
  info "运行: openclaw --help"
}

main "$@"
