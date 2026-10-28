$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeRoot = Join-Path $projectRoot '.local'
$mysqlClient = Join-Path $runtimeRoot 'mysql-8.4.13-winx64/bin/mysql.exe'
$clientConfig = Join-Path $runtimeRoot 'mysql-client.cnf'
$seedFile = Join-Path $projectRoot 'sql/seed-accommodations-demo.sql'

& (Join-Path $PSScriptRoot 'start-local-mysql.ps1')
$previousOutputEncoding = $OutputEncoding
try {
    $OutputEncoding = New-Object System.Text.UTF8Encoding($false)
    Get-Content -LiteralPath $seedFile -Raw -Encoding utf8 |
        & $mysqlClient "--defaults-extra-file=$clientConfig" --database=hlrcs --batch --default-character-set=utf8mb4
    if ($LASTEXITCODE -ne 0) {
        throw 'Could not seed demo accommodations. Check the SQL error above.'
    }
} finally {
    $OutputEncoding = $previousOutputEncoding
}
