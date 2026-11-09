param([switch]$Pending)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$mysqlClient = 'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe'
$properties = Get-Content (Join-Path $projectRoot 'src/main/resources/application.properties')
$passwordLine = $properties | Where-Object { $_ -match '^spring\.datasource\.password=' } | Select-Object -First 1
$passwordValue = $passwordLine.Substring($passwordLine.IndexOf('=') + 1)
$previousPassword = $env:MYSQL_PWD
$previousEncoding = $OutputEncoding
try {
    if ($passwordValue -match '^\$\{DB_PASSWORD:(.*)\}$') {
        $env:MYSQL_PWD = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { $Matches[1] }
    } else { $env:MYSQL_PWD = $passwordValue }
    $OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    $seedPath = if ($Pending) { 'sql/seed-services-pending-demo.sql' } else { 'sql/seed-services-demo.sql' }
    Get-Content (Join-Path $projectRoot $seedPath) -Raw -Encoding utf8 |
        & $mysqlClient --host=127.0.0.1 --port=3306 --user=root --database=hlrcs --batch --default-character-set=utf8mb4
    if ($LASTEXITCODE -ne 0) { throw 'Service demo seed failed.' }
} finally {
    $env:MYSQL_PWD = $previousPassword
    $OutputEncoding = $previousEncoding
}
