param([string]$LanIp, [switch]$CheckOnly)
$ErrorActionPreference = 'Stop'
$mobileRoot = Split-Path -Parent $PSScriptRoot
$projectRoot = Split-Path -Parent $mobileRoot

function Test-Api([string]$BaseUrl) {
    try {
        $result = Invoke-RestMethod "$BaseUrl/api/properties/search?page=0&size=1" -TimeoutSec 4
        return $result.success -eq $true -and $null -ne $result.data.items
    } catch { return $false }
}

if (-not $LanIp) {
    $networks = @(Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -and $_.IPv4Address -and $_.InterfaceAlias -notmatch 'vEthernet|VPN|Virtual|Loopback' })
    $network = $networks | Sort-Object @{ Expression = { if ($_.InterfaceAlias -match 'Wi-Fi|Wireless|WLAN') { 0 } else { 1 } } } | Select-Object -First 1
    if (-not $network) { throw 'No LAN connection found. Connect Wi-Fi or pass -LanIp with the address reachable by your phone.' }
    $LanIp = @($network.IPv4Address)[0].IPAddress
}
$parsedIp = $null
if (-not [System.Net.IPAddress]::TryParse($LanIp, [ref]$parsedIp) -or $parsedIp.AddressFamily -ne 'InterNetwork' -or $LanIp -match '^(127\.|169\.254\.|0\.)') { throw 'LanIp must be a reachable IPv4 LAN address.' }
$apiUrl = "http://${LanIp}:8081"
Write-Host "[HL_RCS] Phone API: $apiUrl"

foreach ($target in @('web', 'mobile')) {
    $apiPort = if ($target -eq 'web') { 8080 } else { 8081 }
    if (Test-Api "http://127.0.0.1:$apiPort") { continue }
    $listener = Get-NetTCPConnection -State Listen -LocalPort $apiPort -ErrorAction SilentlyContinue
    if ($listener) { throw "Port $apiPort is occupied but HL_RCS API is not ready. Check the existing backend; no process was stopped." }
    $runtime = Join-Path $projectRoot '.local'
    New-Item -ItemType Directory -Path $runtime -Force | Out-Null
    $log = Join-Path $runtime "$target-backend.log"
    $errorLog = Join-Path $runtime "$target-backend-error.log"
    $runner = Join-Path $PSScriptRoot 'backend.ps1'
    Write-Host "[HL_RCS] Starting $target API on $apiPort..."
    $backend = Start-Process powershell.exe -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$runner`"", '-Target', $target) -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput $log -RedirectStandardError $errorLog -PassThru
    $ready = $false
    for ($attempt = 0; $attempt -lt 90; $attempt++) {
        if (Test-Api "http://127.0.0.1:$apiPort") { $ready = $true; break }
        $backend.Refresh()
        if ($backend.HasExited) { throw "Backend exited. See $log and $errorLog" }
        Start-Sleep -Seconds 2
    }
    if (-not $ready) { throw "Backend startup timed out. See $log and $errorLog. Do not launch another backend until checking these logs." }
}
if (-not (Test-Api $apiUrl)) { throw "Backend works on localhost but not at $apiUrl. Check server binding and Windows Firewall for TCP 8081 on your private Wi-Fi network." }

# Change only the API value; preserve OAuth IDs and all other local settings.
$envFile = Join-Path $mobileRoot '.env.local'
$lines = if (Test-Path -LiteralPath $envFile) { @(Get-Content -LiteralPath $envFile) } else { @() }
$lines = @($lines | Where-Object { $_ -notmatch '^\s*EXPO_PUBLIC_API_URL\s*=' }) + "EXPO_PUBLIC_API_URL=$apiUrl"
[System.IO.File]::WriteAllLines($envFile, [string[]]$lines, (New-Object System.Text.UTF8Encoding $false))
$env:EXPO_PUBLIC_API_URL = $apiUrl
$env:REACT_NATIVE_PACKAGER_HOSTNAME = $LanIp
Write-Host '[HL_RCS] API ready. Phone and computer must use the same Wi-Fi (no client isolation).'
if (-not (Get-NetTCPConnection -State Listen -LocalPort 5173 -ErrorAction SilentlyContinue)) {
    $webRunner = Join-Path $PSScriptRoot 'web.ps1'
    $web = Start-Process powershell.exe -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$webRunner`"") -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $projectRoot '.local/web-ui.log') -RedirectStandardError (Join-Path $projectRoot '.local/web-ui-error.log') -PassThru
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        if (Get-NetTCPConnection -State Listen -LocalPort 5173 -ErrorAction SilentlyContinue) { break }
        $web.Refresh()
        if ($web.HasExited) { throw 'Web startup failed. Check .local/web-ui-error.log.' }
        Start-Sleep -Seconds 1
    }
}
$webResponse = Invoke-WebRequest 'http://127.0.0.1:5173/@vite/client' -UseBasicParsing -TimeoutSec 5
if ($webResponse.Content -notmatch 'vite') { throw 'Port 5173 is occupied by an unexpected server.' }
$webApi = Invoke-RestMethod 'http://127.0.0.1:5173/api/properties/search?page=0&size=1' -TimeoutSec 10
if ($webApi.success -ne $true) { throw 'Web API proxy on 5173 is not ready. It must target 8080.' }
Write-Host '[HL_RCS] Web: http://localhost:5173 | Web API: 8080 | App API: 8081 | Expo: 8082'
if ($CheckOnly) { return }
if (Get-NetTCPConnection -State Listen -LocalPort 8082 -ErrorAction SilentlyContinue) {
    $status = Invoke-WebRequest 'http://127.0.0.1:8082/status' -UseBasicParsing -TimeoutSec 5
    $statusText = if ($status.Content -is [byte[]]) { [System.Text.Encoding]::UTF8.GetString($status.Content) } else { [string]$status.Content }
    if ($statusText -notmatch 'packager-status:running') { throw 'Port 8082 is occupied by another service. Stop it before running Expo.' }
    Write-Host "[HL_RCS] Expo already running on 8082. Open exp://${LanIp}:8082 in Expo Go. If its API/IP is stale, stop the old Expo with Ctrl+C and run npm run dev again."
    return
}
Push-Location $mobileRoot
try {
    & node (Join-Path $mobileRoot 'node_modules/expo/bin/cli') start --go --lan --clear --port 8082
    if ($LASTEXITCODE -ne 0) { throw 'Expo stopped with an error. See output above.' }
} finally { Pop-Location }
