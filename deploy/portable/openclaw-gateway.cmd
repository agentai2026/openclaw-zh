@echo off
setlocal
set "ROOT=%~dp0.."
"%ROOT%\node\node.exe" "%ROOT%\app\openclaw.mjs" %*
