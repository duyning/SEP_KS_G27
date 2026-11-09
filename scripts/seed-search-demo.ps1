$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$mysqlClient = 'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe'
$assetRoot = Join-Path $projectRoot '.local/demo-room-photos'
New-Item -ItemType Directory -Path $assetRoot -Force | Out-Null

# Illustration photos only; never presented as photos of real advertised rooms.
$sources = @('1522708323590-d24dbb6b0267', '1502672260266-1c1ef2d93688', '1586023492125-27b2c045efd7', '1484154218962-a197022b5858')
$assets = @()
for ($index = 0; $index -lt $sources.Count; $index++) {
    $fileName = 'demo-gallery-' + ($index + 1).ToString('00') + '.jpg'
    $path = Join-Path $assetRoot $fileName
    if (-not (Test-Path -LiteralPath $path)) {
        & curl.exe --silent --show-error --fail --location --retry 1 --max-time 40 --output $path "https://images.unsplash.com/photo-$($sources[$index])?fm=jpg&fit=crop&w=1000&q=80"
        if ($LASTEXITCODE -ne 0) { throw "Could not download $fileName. No database writes performed." }
    }
    $bytes = [IO.File]::ReadAllBytes($path)
    if ($bytes.Length -lt 100 -or $bytes[0] -ne 255 -or $bytes[1] -ne 216) { throw "Invalid JPEG: $fileName" }
    $hex = [BitConverter]::ToString($bytes).Replace('-', '')
    $assets += "($($index + 1), '$fileName', UNHEX('$hex'))"
}

$seed = Get-Content (Join-Path $projectRoot 'sql/seed-accommodations-demo.sql') -Raw -Encoding utf8
$gallery = @'
START TRANSACTION;
CREATE TEMPORARY TABLE tmp_search_photo_targets AS
SELECT t.room_type_id FROM room_types t JOIN properties p ON p.property_id=t.property_id
WHERE p.description LIKE '[HLRCS_DEMO_ACCOMMODATION_V1]%'
AND NOT EXISTS (SELECT 1 FROM room_type_images i WHERE i.room_type_id=t.room_type_id);
CREATE TEMPORARY TABLE tmp_search_photo_assets (ordinal INT, file_name VARCHAR(200), file_content LONGBLOB);
INSERT INTO tmp_search_photo_assets VALUES
'@ + ($assets -join ",`n") + @'
;
INSERT INTO room_type_images (room_type_id,image_url,file_name,content_type,file_content)
SELECT t.room_type_id,'',a.file_name,'image/jpeg',a.file_content
FROM tmp_search_photo_targets t CROSS JOIN tmp_search_photo_assets a
ORDER BY t.room_type_id, MOD(a.ordinal+t.room_type_id,4);
COMMIT;
SELECT COUNT(*) AS demo_photos FROM room_type_images i JOIN room_types t ON t.room_type_id=i.room_type_id
JOIN properties p ON p.property_id=t.property_id WHERE p.description LIKE '[HLRCS_DEMO_ACCOMMODATION_V1]%';
'@
$config = Get-Content (Join-Path $projectRoot 'src/main/resources/application.properties')
$overrideConfig = Join-Path $projectRoot 'config/application.properties'
if (Test-Path -LiteralPath $overrideConfig) { $config += Get-Content -LiteralPath $overrideConfig }
$localConfig = Join-Path $projectRoot 'config/mysql-local.properties'
if (Test-Path -LiteralPath $localConfig) { $config += Get-Content -LiteralPath $localConfig }
$line = $config | Where-Object { $_ -match '^spring\.datasource\.password=' } | Select-Object -Last 1
$value = $line.Substring($line.IndexOf('=') + 1)
$usernameLine = $config | Where-Object { $_ -match '^spring\.datasource\.username=' } | Select-Object -Last 1
$username = if ($usernameLine) { $usernameLine.Substring($usernameLine.IndexOf('=') + 1) } else { 'root' }
if ($username -match '^\$\{DB_USERNAME:(.*)\}$') {
    $username = if ($env:DB_USERNAME) { $env:DB_USERNAME } else { $Matches[1] }
}
$previousPassword = $env:MYSQL_PWD
$previousEncoding = $OutputEncoding
try {
    if ($value -match '^\$\{DB_PASSWORD:(.*)\}$') {
        $fallbackPassword = $Matches[1]
        $localPasswordLine = $config | Where-Object { $_ -match '^DB_PASSWORD=' } | Select-Object -Last 1
        $env:MYSQL_PWD = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } elseif ($localPasswordLine) { $localPasswordLine.Substring($localPasswordLine.IndexOf('=') + 1) } else { $fallbackPassword }
    } else { $env:MYSQL_PWD = $value }
    $OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    ($seed + "`n" + $gallery) | & $mysqlClient --host=127.0.0.1 --port=3306 "--user=$username" --database=hlrcs --batch --default-character-set=utf8mb4 --max-allowed-packet=64M
    if ($LASTEXITCODE -ne 0) { throw 'Search demo seed failed. See SQL error above.' }
} finally {
    $env:MYSQL_PWD = $previousPassword
    $OutputEncoding = $previousEncoding
}
