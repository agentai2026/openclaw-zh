# OpenClaw 汉化版 - Windows 一键安装
# 用法: irm https://raw.githubusercontent.com/agentai2026/openclaw-zh/main/deploy/install.ps1 | iex

$ErrorActionPreference = "Stop"

$NpmPackage = "@agentai2027/openclaw-zh"
$MinNodeMajor = 22
$RepoUrl = "https://github.com/agentai2026/openclaw-zh"

function Write-Info($msg)  { Write-Host "[信息] $msg" -ForegroundColor Cyan }
function Write-Ok($msg)    { Write-Host "[成功] $msg" -ForegroundColor Green }
function Write-Warn($msg)  { Write-Host "[警告] $msg" -ForegroundColor Yellow }
function Write-Err($msg)   { Write-Host "[错误] $msg" -ForegroundColor Red }

function Get-NodeMajor {
    try {
        $v = (node -p "process.versions.node.split('.')[0]" 2>$null)
        return [int]$v
    } catch {
        return 0
    }
}

function Install-Node {
    Write-Warn "未检测到 Node.js >= $MinNodeMajor，尝试自动安装..."
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Write-Info "使用 winget 安装 OpenJS.NodeJS.LTS..."
        winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    } elseif (Get-Command choco -ErrorAction SilentlyContinue) {
        Write-Info "使用 Chocolatey 安装 nodejs-lts..."
        choco install nodejs-lts -y
    } else {
        Write-Err "请从 https://nodejs.org/ 手动安装 Node.js $MinNodeMajor+"
        exit 1
    }
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
                [System.Environment]::GetEnvironmentVariable("Path", "User")
}

Write-Host ""
Write-Host "  ╔═══════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║     OpenClaw 汉化版 一键安装脚本      ║" -ForegroundColor Cyan
Write-Host "  ╚═══════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Install-Node
}

$major = Get-NodeMajor
if ($major -lt $MinNodeMajor) {
    Write-Warn "当前 Node 主版本 $major，需要 >= $MinNodeMajor"
    Install-Node
    $major = Get-NodeMajor
}

Write-Ok "Node.js $(node -v) 已就绪"

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Err "未找到 npm"
    exit 1
}

Write-Info "正在安装 $NpmPackage（全局）..."
npm install -g "${NpmPackage}@latest"
if ($LASTEXITCODE -ne 0) {
    Write-Err "npm 安装失败。可尝试以管理员身份运行 PowerShell。"
    exit 1
}

Write-Ok "安装完成！"
Write-Info "文档: $RepoUrl"
Write-Info "运行: openclaw --help"
