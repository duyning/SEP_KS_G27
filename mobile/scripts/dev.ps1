param([string]$LanIp, [switch]$CheckOnly, [string]$GoogleBrowserOrigin)
$ErrorActionPreference = 'Stop'
$mobileRoot = Split-Path -Parent $PSScriptRoot
$projectRoot = Split-Path -Parent $mobileRoot
$envFile = Join-Path $mobileRoot '.env.local'
$lines = if (Test-Path -LiteralPath $envFile) { @(Get-Content -LiteralPath $envFile) } else { @() }
$originKey = 'EXPO_PUBLIC_GOOGLE_BROWSER_ORIGIN'
if (-not $PSBoundParameters.ContainsKey('GoogleBrowserOrigin')) {
    $savedOrigin = $lines | Where-Object { $_ -match '^\s*EXPO_PUBLIC_GOOGLE_BROWSER_ORIGIN\s*=' } | Select-Object -Last 1
    $GoogleBrowserOrigin = if ($savedOrigin) { ($savedOrigin -split '=', 2)[1].Trim().Trim('"', "'") } else { $env:EXPO_PUBLIC_GOOGLE_BROWSER_ORIGIN }
}
if ($GoogleBrowserOrigin) {
    $parsedOrigin = $null
    if (-not [uri]::TryCreate($GoogleBrowserOrigin, [UriKind]::Absolute, [ref]$parsedOrigin) -or
        $parsedOrigin.Scheme -ne 'https' -or $parsedOrigin.HostNameType -ne [UriHostNameType]::Dns -or
        $parsedOrigin.IsLoopback -or -not $parsedOrigin.Host.Contains('.') -or
        $parsedOrigin.AbsolutePath -ne '/' -or $parsedOrigin.UserInfo -or $parsedOrigin.Query -or $parsedOrigin.Fragment) {
        throw 'GoogleBrowserOrigin must be an HTTPS domain origin without a path, query or fragment.'
    }
    $GoogleBrowserOrigin = $parsedOrigin.GetLeftPart([UriPartial]::Authority)
}

function Test-Api([string]$BaseUrl) {
    try {
        $result = Invoke-RestMethod "$BaseUrl/api/properties/search?page=0&size=1" -TimeoutSec 4
        return $result.success -eq $true -and $null -ne $result.data.items
    } catch { return $false }
}

# A healthy search endpoint alone does not mean the running JVM has the current routes.
function Update-MobileBackend {
    $owners = @(Get-NetTCPConnection -State Listen -LocalPort 8081 | Select-Object -ExpandProperty OwningProcess -Unique)
    if ($owners.Count -ne 1) { throw 'Could not identify the mobile API process on port 8081.' }
    $running = Get-CimInstance Win32_Process -Filter "ProcessId = $($owners[0])"
    if (-not $running) { return }
    $runningOrigin = [regex]::Match([string]$running.CommandLine, '--app\.google\.mobile-browser-origin=([^\s"]+)').Groups[1].Value
    $changed = Get-ChildItem (Join-Path $projectRoot 'src/main') -Recurse -File |
        Where-Object { $_.LastWriteTimeUtc -gt $running.CreationDate.ToUniversalTime() } |
        Select-Object -First 1
    if (-not $changed -and $runningOrigin -eq [string]$GoogleBrowserOrigin) { return }

    $parent = Get-CimInstance Win32_Process -Filter "ProcessId = $($running.ParentProcessId)"
    $projectPattern = [regex]::Escape($projectRoot.Replace('\', '/'))
    $appCommand = ([string]$running.CommandLine).Replace('\', '/')
    $parentCommand = ([string]$parent.CommandLine).Replace('\', '/')
    $isProjectBackend = $running.Name -eq 'java.exe' -and
        $appCommand -match '\borg\.hlrcs\.HlRcsApplication\b' -and
        $appCommand -match '--server\.port=8081(?:\s|$)' -and
        ($appCommand -match $projectPattern -or $parentCommand -match $projectPattern)
    if (-not $isProjectBackend) { throw 'A reload is needed, but the listener on 8081 is not a verified HL_RCS mobile backend. Close it and rerun npm run dev.' }

    Write-Host '[HL_RCS] Reloading the mobile API on 8081 with current source and settings...'
    $process = Get-Process -Id $running.ProcessId -ErrorAction Stop
    if ([Math]::Abs(($process.StartTime - $running.CreationDate).TotalSeconds) -gt 1) {
        throw 'The process on port 8081 changed during startup. Rerun npm run dev.'
    }
    $process | Stop-Process -ErrorAction Stop
    if (-not $process.WaitForExit(12000)) { throw 'The old mobile API did not stop within 12 seconds.' }
}

function Test-WebMap([string]$BaseUrl) {
    try {
        $map = Invoke-WebRequest "$BaseUrl/mobile-property-map.html" -UseBasicParsing -TimeoutSec 4
        return $map.Content -match '/src/mobile-property-map\.jsx'
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
    if (Test-Api "http://127.0.0.1:$apiPort") {
        if ($target -eq 'web') { continue }
        Update-MobileBackend
        if (Test-Api "http://127.0.0.1:$apiPort") { continue }
    }
    $listener = Get-NetTCPConnection -State Listen -LocalPort $apiPort -ErrorAction SilentlyContinue
    if ($listener) { throw "Port $apiPort is occupied but HL_RCS API is not ready. Check the existing backend; no process was stopped." }
    $runtime = Join-Path $projectRoot '.local'
    New-Item -ItemType Directory -Path $runtime -Force | Out-Null
    $log = Join-Path $runtime "$target-backend.log"
    $errorLog = Join-Path $runtime "$target-backend-error.log"
    $runner = Join-Path $PSScriptRoot 'backend.ps1'
    Write-Host "[HL_RCS] Starting $target API on $apiPort..."
    $backendArguments = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$runner`"", '-Target', $target)
    if ($target -eq 'mobile' -and $GoogleBrowserOrigin) {
        $backendArguments += @('-GoogleBrowserOrigin', $GoogleBrowserOrigin)
    }
    $backend = Start-Process powershell.exe -ArgumentList $backendArguments -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput $log -RedirectStandardError $errorLog -PassThru
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

# Preserve OAuth IDs and other local settings.
$lines = @($lines | Where-Object { $_ -notmatch '^\s*EXPO_PUBLIC_API_URL\s*=' }) + "EXPO_PUBLIC_API_URL=$apiUrl"
if ($GoogleBrowserOrigin -or $PSBoundParameters.ContainsKey('GoogleBrowserOrigin')) {
    $lines = @($lines | Where-Object { $_ -notmatch '^\s*EXPO_PUBLIC_GOOGLE_BROWSER_ORIGIN\s*=' }) + "$originKey=$GoogleBrowserOrigin"
}
[System.IO.File]::WriteAllLines($envFile, [string[]]$lines, (New-Object System.Text.UTF8Encoding $false))
$env:EXPO_PUBLIC_API_URL = $apiUrl
$env:EXPO_PUBLIC_GOOGLE_BROWSER_ORIGIN = $GoogleBrowserOrigin
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
$webLanUrl = "http://${LanIp}:5173"
$mapReady = Test-WebMap $webLanUrl
if (-not $mapReady) {
    $webListeners = @(Get-NetTCPConnection -State Listen -LocalPort 5173 -ErrorAction SilentlyContinue)
    if ($webListeners.Count -gt 0 -and -not ($webListeners | Where-Object { $_.LocalAddress -notin @('127.0.0.1', '::1') }) -and
        (Test-WebMap 'http://127.0.0.1:5173')) {
        # IntelliJ owns the loopback server. Bind only the LAN address so the existing web session stays up.
        $webRunner = Join-Path $PSScriptRoot 'web.ps1'
        $webArguments = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$webRunner`"", '-LanIp', $LanIp)
        $web = Start-Process powershell.exe -ArgumentList $webArguments -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $projectRoot '.local/web-map-lan.log') -RedirectStandardError (Join-Path $projectRoot '.local/web-map-lan-error.log') -PassThru
        $mapDeadline = [DateTime]::UtcNow.AddSeconds(60)
        do {
            $mapReady = Test-WebMap $webLanUrl
            if ($mapReady) { break }
            $web.Refresh()
            if ($web.HasExited) { break }
            Start-Sleep -Seconds 1
        } while ([DateTime]::UtcNow -lt $mapDeadline)
    }
}
if ($mapReady) {
    Write-Host "[HL_RCS] System map ready at $webLanUrl."
} else {
    Write-Warning "The system map is unavailable at $webLanUrl. The app can still use its device map. Check .local/web-map-lan-error.log or port 5173 on the private network."
}
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
