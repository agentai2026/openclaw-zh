# OpenClaw 汉化版便携包启动脚本
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Node = Join-Path $Root "node\node.exe"
$App = Join-Path $Root "app\openclaw.mjs"
if (-not (Test-Path $Node)) { throw "未找到 Node 运行时: $Node" }
& $Node $App @args
