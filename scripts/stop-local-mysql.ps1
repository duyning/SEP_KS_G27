$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeRoot = Join-Path $projectRoot '.local'
$mysqlAdmin = Join-Path $runtimeRoot 'mysql-8.4.13-winx64/bin/mysqladmin.exe'
$adminConfig = Join-Path $runtimeRoot 'mysql-admin.cnf'

if (-not (Test-Path -LiteralPath $mysqlAdmin) -or
    -not (Test-Path -LiteralPath $adminConfig)) {
    throw 'Local MySQL is not installed on this machine. See README.md.'
}

& $mysqlAdmin "--defaults-extra-file=$adminConfig" --connect-timeout=3 shutdown
if ($LASTEXITCODE -ne 0) {
    throw 'Could not stop local MySQL. Check whether the server is running.'
}
Write-Host 'Local MySQL shut down.'
