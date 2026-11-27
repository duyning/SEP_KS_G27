param([switch]$ServerOnly, [switch]$IfInstalled)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeRoot = Join-Path $projectRoot '.local'
if (-not (Test-Path -LiteralPath (Join-Path $runtimeRoot 'mysql.ini') -PathType Leaf) -and
    (Test-Path -LiteralPath (Join-Path $projectRoot '.git') -PathType Leaf)) {
    $git = Get-Command git.exe -ErrorAction SilentlyContinue
    if ($git) {
        $commonGitDir = & $git.Source -C $projectRoot rev-parse --path-format=absolute --git-common-dir
        if ($LASTEXITCODE -eq 0 -and $commonGitDir) {
            $runtimeRoot = Join-Path (Split-Path -Parent $commonGitDir) '.local'
        }
    }
}

$mysqlBin = Join-Path $runtimeRoot 'mysql-8.4.13-winx64/bin'
$serverConfig = Join-Path $runtimeRoot 'mysql.ini'
$clientConfig = Join-Path $runtimeRoot 'mysql-client.cnf'
$errorLog = Join-Path $runtimeRoot 'mysql-error.log'
$mysqlClient = Join-Path $mysqlBin $(if ($ServerOnly) { 'mysqladmin.exe' } else { 'mysql.exe' })
$mysqlServer = Join-Path $mysqlBin 'mysqld.exe'

if ($IfInstalled -and -not (Test-Path -LiteralPath $serverConfig -PathType Leaf)) {
    return
}

if (-not (Test-Path -LiteralPath $mysqlClient) -or
    -not (Test-Path -LiteralPath $mysqlServer) -or
    -not (Test-Path -LiteralPath $serverConfig) -or
    -not (Test-Path -LiteralPath $clientConfig)) {
    throw 'Local MySQL is not installed on this machine. See README.md.'
}

function Test-MySqlReady {
    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        if ($ServerOnly) {
            # Spring verifies the effective datasource credentials and schema after this ping.
            & $mysqlClient "--defaults-extra-file=$clientConfig" --connect-timeout=2 ping *> $null
        } else {
            & $mysqlClient "--defaults-extra-file=$clientConfig" --connect-timeout=2 --database=hlrcs --batch --skip-column-names -e 'SELECT 1;' *> $null
        }
        return $LASTEXITCODE -eq 0
    } finally {
        $ErrorActionPreference = $previousPreference
    }
}

$startupLock = [System.Threading.Mutex]::new($false, 'Local\HL-RCS-MySQL-3306')
$lockAcquired = $false
try {
    try {
        $lockAcquired = $startupLock.WaitOne([TimeSpan]::FromSeconds(40))
    } catch [System.Threading.AbandonedMutexException] {
        $lockAcquired = $true
    }
    if (-not $lockAcquired) {
        throw "Another launcher is still starting MySQL on port 3306. Check $errorLog."
    }

    $readyMessage = if ($ServerOnly) { 'MySQL is listening at 127.0.0.1:3306.' } else {
        'MySQL is ready at 127.0.0.1:3306 (database: hlrcs).'
    }
    if (Test-MySqlReady) {
        Write-Host $readyMessage
        return
    }

    $serverProcess = Get-Process -Name mysqld -ErrorAction SilentlyContinue |
        Where-Object Path -eq $mysqlServer | Select-Object -First 1
    if (-not $serverProcess) {
        $tcpClient = [System.Net.Sockets.TcpClient]::new()
        try {
            $tcpClient.Connect('127.0.0.1', 3306)
            $portInUse = $true
        } catch [System.Net.Sockets.SocketException] {
            $portInUse = $false
        } finally {
            $tcpClient.Dispose()
        }
        if ($portInUse) {
            throw 'Port 3306 is in use, but the MySQL readiness check failed. Check the server and local credentials.'
        }

        Write-Host 'Starting local MySQL at 127.0.0.1:3306...'
        $serverProcess = Start-Process -FilePath $mysqlServer `
            -ArgumentList "--defaults-file=`"$serverConfig`"" `
            -WorkingDirectory $runtimeRoot -WindowStyle Hidden -PassThru
    } else {
        Write-Host 'Waiting for local MySQL at 127.0.0.1:3306...'
    }

    $startupTime = [System.Diagnostics.Stopwatch]::StartNew()
    do {
        if (Test-MySqlReady) {
            Write-Host $readyMessage
            return
        }
        $serverProcess.Refresh()
        if ($serverProcess.HasExited) {
            throw "MySQL exited during startup. Check $errorLog."
        }
        Start-Sleep -Seconds 1
    } while ($startupTime.Elapsed.TotalSeconds -lt 30)

    throw "MySQL did not become ready. Check $errorLog."
} finally {
    if ($lockAcquired) {
        $startupLock.ReleaseMutex()
    }
    $startupLock.Dispose()
}
