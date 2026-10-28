$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeRoot = Join-Path $projectRoot '.local'
$mysqlBin = Join-Path $runtimeRoot 'mysql-8.4.13-winx64/bin'
$serverConfig = Join-Path $runtimeRoot 'mysql.ini'
$clientConfig = Join-Path $runtimeRoot 'mysql-client.cnf'
$mysqlClient = Join-Path $mysqlBin 'mysql.exe'

if (-not (Test-Path -LiteralPath $mysqlClient) -or
    -not (Test-Path -LiteralPath $serverConfig) -or
    -not (Test-Path -LiteralPath $clientConfig)) {
    throw 'Local MySQL is not installed on this machine. See README.md.'
}

function Test-ProjectDatabase {
    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & $mysqlClient "--defaults-extra-file=$clientConfig" --connect-timeout=2 --database=hlrcs --batch --skip-column-names -e 'SELECT 1;' *> $null
        return $LASTEXITCODE -eq 0
    } finally {
        $ErrorActionPreference = $previousPreference
    }
}

if (Test-ProjectDatabase) {
    Write-Host 'MySQL is ready at 127.0.0.1:3306 (database: hlrcs).'
    return
}

$portListener = Get-NetTCPConnection -LocalPort 3306 -State Listen -ErrorAction SilentlyContinue
if ($portListener) {
    throw 'Port 3306 is already in use, but the project database is not accessible. Check the local credentials before starting another server.'
}

$serverProcess = Start-Process -FilePath (Join-Path $mysqlBin 'mysqld.exe') `
    -ArgumentList "--defaults-file=`"$serverConfig`"" `
    -WorkingDirectory $runtimeRoot -WindowStyle Hidden -PassThru

for ($attempt = 0; $attempt -lt 30; $attempt++) {
    if (Test-ProjectDatabase) {
        Write-Host 'MySQL is ready at 127.0.0.1:3306 (database: hlrcs).'
        return
    }
    $serverProcess.Refresh()
    if ($serverProcess.HasExited) {
        throw 'MySQL exited during startup. Check .local/mysql-error.log.'
    }
    Start-Sleep -Seconds 1
}

throw 'MySQL did not become ready. Check .local/mysql-error.log.'
