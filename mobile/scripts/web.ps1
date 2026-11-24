param([string]$LanIp)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location (Join-Path $projectRoot 'frontend')
$env:API_TARGET = 'http://127.0.0.1:8080'
$webBindAddress = '0.0.0.0'
if ($LanIp) {
    $webBindAddress = $LanIp
    $env:HLRCS_VITE_LAN_INSTANCE = '1'
}
& node node_modules/vite/bin/vite.js --host $webBindAddress --port 5173 --strictPort
exit $LASTEXITCODE
