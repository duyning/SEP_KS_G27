$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeRoot = Join-Path $projectRoot '.local'
$assetRoot = Join-Path $runtimeRoot 'demo-room-photos'
$mysqlClient = Join-Path $runtimeRoot 'mysql-8.4.13-winx64/bin/mysql.exe'
$clientConfig = Join-Path $runtimeRoot 'mysql-client.cnf'
New-Item -ItemType Directory -Path $assetRoot -Force | Out-Null

# Existing prototype illustration sources; these are not photos of real advertised rooms.
$photoSources = @(
    '1522708323590-d24dbb6b0267',
    '1502672260266-1c1ef2d93688',
    '1586023492125-27b2c045efd7',
    '1484154218962-a197022b5858',
    '1584622650111-993a426fbf0a'
)
$assetRows = @()
for ($index = 0; $index -lt $photoSources.Count; $index++) {
    $photoKey = 'photo-' + $photoSources[$index]
    $fileName = 'demo-gallery-' + ($index + 1).ToString('00') + '.jpg'
    $photoPath = Join-Path $assetRoot $fileName
    if (-not (Test-Path -LiteralPath $photoPath)) {
        & curl.exe --silent --show-error --fail --location --retry 1 --max-time 45 --output $photoPath "https://images.unsplash.com/${photoKey}?fm=jpg&fit=crop&w=1200&q=82"
        if ($LASTEXITCODE -ne 0) { throw "Could not download illustration $fileName." }
    }
    $photoBytes = [IO.File]::ReadAllBytes($photoPath)
    if ($photoBytes.Length -lt 100 -or $photoBytes[0] -ne 255 -or $photoBytes[1] -ne 216) {
        throw "Illustration is not a valid JPEG: $fileName."
    }
    $photoHex = [BitConverter]::ToString($photoBytes).Replace('-', '')
    $assetRows += "($($index + 1), '$photoKey', '$fileName', UNHEX('$photoHex'))"
}

$seedSql = @'
SET NAMES utf8mb4;
START TRANSACTION;
-- Preserve all rooms with existing owner-uploaded photos. Only fill empty DEMO galleries.
CREATE TEMPORARY TABLE tmp_hlrcs_gallery_targets AS
SELECT t.room_type_id, t.image_url FROM room_types t
JOIN properties p ON p.property_id = t.property_id
WHERE p.description LIKE '[HLRCS_DEMO_ACCOMMODATION_V1]%'
AND NOT EXISTS (SELECT 1 FROM room_type_images existing WHERE existing.room_type_id = t.room_type_id);
CREATE TEMPORARY TABLE tmp_hlrcs_gallery_assets (
    ordinal INT, source_key VARCHAR(100), file_name VARCHAR(200), file_content LONGBLOB
);
INSERT INTO tmp_hlrcs_gallery_assets VALUES
'@ + ($assetRows -join ",`n") + @'
;
INSERT INTO room_type_images (room_type_id, image_url, file_name, content_type, file_content)
SELECT t.room_type_id, '', a.file_name, 'image/jpeg', a.file_content
FROM tmp_hlrcs_gallery_targets t CROSS JOIN tmp_hlrcs_gallery_assets a
ORDER BY t.room_type_id, (LOCATE(a.source_key, t.image_url) > 0) DESC, a.ordinal;
COMMIT;
SELECT COUNT(*) AS added_demo_photos FROM tmp_hlrcs_gallery_targets t
JOIN room_type_images i ON i.room_type_id = t.room_type_id;
'@
$sqlPath = Join-Path $runtimeRoot 'seed-demo-gallery.sql'
[IO.File]::WriteAllText($sqlPath, $seedSql, (New-Object System.Text.UTF8Encoding($false)))
$previousOutputEncoding = $OutputEncoding
try {
    $OutputEncoding = New-Object System.Text.UTF8Encoding($false)
    $seedSql | & $mysqlClient "--defaults-extra-file=$clientConfig" --database=hlrcs --batch --default-character-set=utf8mb4
    if ($LASTEXITCODE -ne 0) { throw 'Could not seed demo photo galleries.' }
} finally {
    $OutputEncoding = $previousOutputEncoding
}
