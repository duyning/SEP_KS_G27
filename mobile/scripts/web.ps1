$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location (Join-Path $projectRoot 'frontend')
$env:API_TARGET = 'http://127.0.0.1:8080'
& node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173 --strictPort
exit $LASTEXITCODE
