#requires -Version 7.0
param(
    [int]$Port = 8081,
    [string]$RoomPhoto,
    [string]$RoomVideo,
    [switch]$SensitiveMediaOnly,
    [ValidateRange(1, 600)][int]$WaitSeconds = 150,
    [switch]$EnableAuto
)

$ErrorActionPreference = 'Stop'
$api = "http://127.0.0.1:$Port/api"
$postsPath = "$api/community/posts"
$staffPath = "$api/staff/community/posts"
$settingsPath = "$staffPath/auto-moderation"

function Get-DemoHeaders([string]$Email, [string]$Password) {
    $body = @{ email = $Email; password = $Password } | ConvertTo-Json -Compress
    $login = Invoke-RestMethod -Method Post -Uri "$api/auth/login" -ContentType 'application/json' -Body $body
    if (!$login.data.accessToken) { throw "Không đăng nhập được tài khoản demo $Email." }
    return @{ Authorization = "Bearer $($login.data.accessToken)" }
}

function New-OffTopicImage {
    Add-Type -AssemblyName System.Drawing
    $bitmap = [Drawing.Bitmap]::new(640, 400)
    $canvas = [Drawing.Graphics]::FromImage($bitmap)
    $stream = [IO.MemoryStream]::new()
    try {
        $canvas.Clear([Drawing.Color]::ForestGreen)
        $line = [Drawing.Pens]::White
        $canvas.DrawRectangle($line, 30, 30, 580, 340)
        $canvas.DrawLine($line, 320, 30, 320, 370)
        $canvas.DrawEllipse($line, 270, 150, 100, 100)
        $canvas.DrawRectangle($line, 30, 100, 100, 200)
        $canvas.DrawRectangle($line, 510, 100, 100, 200)
        $canvas.FillEllipse([Drawing.Brushes]::White, 300, 220, 44, 44)
        $canvas.FillEllipse([Drawing.Brushes]::Black, 312, 232, 20, 20)
        $bitmap.Save($stream, [Drawing.Imaging.ImageFormat]::Png)
        return ,$stream.ToArray()
    } finally {
        $stream.Dispose()
        $canvas.Dispose()
        $bitmap.Dispose()
    }
}

function Submit-DemoPost($Scenario, $Headers, $Client) {
    $body = @{
        type = 'ROOM_TRANSFER'
        title = "[DEMO-AUTO $stamp] $($Scenario.Title)"
        content = $Scenario.Content
        location = 'Tân Xã, Hòa Lạc'
        price = 1800000
        authorName = 'Dữ liệu kiểm thử'
        authorPhone = '0912345678'
    } | ConvertTo-Json -Compress
    if (!$Scenario.Bytes) {
        return (Invoke-RestMethod -Method Post -Uri $postsPath -Headers $Headers -ContentType 'application/json' -Body $body).data
    }

    $form = [Net.Http.MultipartFormDataContent]::new()
    try {
        $form.Add([Net.Http.StringContent]::new($body, [Text.Encoding]::UTF8, 'application/json'), 'details')
        $file = [Net.Http.ByteArrayContent]::new($Scenario.Bytes)
        $file.Headers.ContentType = [Net.Http.Headers.MediaTypeHeaderValue]::new($Scenario.Mime)
        $form.Add($file, $Scenario.Part, $Scenario.Name)
        $response = $Client.PostAsync($postsPath, $form).GetAwaiter().GetResult()
        try {
            $content = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult() | ConvertFrom-Json
            if (!$response.IsSuccessStatusCode) { throw "Gửi bài $($Scenario.Title) thất bại. $($content.message)" }
            return $content.data
        } finally { $response.Dispose() }
    } finally { $form.Dispose() }
}

$stamp = Get-Date -Format 'MMdd-HHmmss'
$scenarios = @()
if (!$SensitiveMediaOnly) {
    $scenarios = @(
    @{ Title = 'Nhượng phòng khép kín gần FPT'; Content = 'Mình cần nhượng phòng 22 m² ở Tân Xã từ tháng sau. Phòng có cửa sổ, nhà vệ sinh riêng và chỗ để xe. Có thể hẹn xem phòng buổi tối rồi quyết định.'; Expected = 'CLEAR / APPROVED' }
    @{ Title = 'Nhượng phòng có gác và cửa sổ'; Content = 'Cần nhượng phòng có gác tại Tân Xã. Phòng có bếp nhỏ và bình nóng lạnh. Có thể hẹn xem phòng trực tiếp cuối tuần.'; Expected = 'OFF_TOPIC / NEED_CHANGES'; Bytes = (New-OffTopicImage); Part = 'photos'; Mime = 'image/png'; Name = 'san-bong-da.png' }
    @{ Title = 'Cho thuê phòng yêu cầu cọc'; Content = 'Ảnh phòng là của người khác, mình không có phòng thật. Ai hỏi thuê thì mình bảo chuyển 500.000 đồng giữ chỗ, sau khi nhận tiền mình sẽ chặn liên lạc.'; Expected = 'FLAGGED / PENDING' }
    @{ Title = 'Nhượng phòng chưa xác minh'; Content = 'Mình đăng hộ một người quen. Họ nói muốn gửi địa chỉ chính xác thì phải chuyển một khoản giữ chỗ. Mình chưa đến xem phòng và chưa xác minh được thông tin.'; Expected = 'FLAGGED (UNSURE) / PENDING' }
    )
}
if ($SensitiveMediaOnly -and !$RoomPhoto -and !$RoomVideo) { throw 'Hãy truyền ít nhất một tệp bằng -RoomPhoto hoặc -RoomVideo.' }
if ($RoomPhoto) {
    $file = Get-Item -LiteralPath $RoomPhoto
    $mime = switch ($file.Extension.ToLowerInvariant()) { '.png' { 'image/png' } '.jpg' { 'image/jpeg' } '.jpeg' { 'image/jpeg' } default { throw 'Ảnh phòng phải là JPG hoặc PNG.' } }
    $scenarios += @{
        Title = if ($SensitiveMediaOnly) { 'Kiểm thử ảnh nhạy cảm' } else { 'Nhượng phòng kèm ảnh thực tế' }
        Content = 'Cần nhượng phòng trọ ở Tân Xã. Có thể hẹn xem phòng trực tiếp để kiểm tra hiện trạng.'
        Expected = if ($SensitiveMediaOnly) { 'FLAGGED / PENDING' } else { 'CLEAR / APPROVED' }
        Bytes = [IO.File]::ReadAllBytes($file.FullName); Part = 'photos'; Mime = $mime; Name = $file.Name
    }
}
if ($RoomVideo) {
    $file = Get-Item -LiteralPath $RoomVideo
    if ($file.Extension -ine '.mp4') { throw 'Video phòng phải là MP4.' }
    $scenarios += @{
        Title = if ($SensitiveMediaOnly) { 'Kiểm thử video nhạy cảm' } else { 'Nhượng phòng kèm video tham quan' }
        Content = 'Mình cần nhượng phòng trọ tại Tân Xã. Có video đính kèm và có thể hẹn xem phòng trực tiếp.'
        Expected = if ($SensitiveMediaOnly) { 'FLAGGED / PENDING' } else { 'CLEAR / APPROVED' }
        Bytes = [IO.File]::ReadAllBytes($file.FullName); Part = 'videos'; Mime = 'video/mp4'; Name = $file.Name
    }
}

$admin = Get-DemoHeaders 'admin@hlrcs.com' 'admin123'
$member = Get-DemoHeaders 'user@hlrcs.com' '123456'
$settings = (Invoke-RestMethod -Uri $settingsPath -Headers $admin).data
if (!$settings.configured) { throw 'Backend chưa có khóa Gemini. Hãy cấu hình GEMINI_API_KEY và khởi động lại backend.' }
if ($settings.mode -ne 'AUTO' -and !$EnableAuto) { throw "Backend đang ở $($settings.mode). Chạy lại với -EnableAuto để bật AUTO tạm thời." }

$changedMode = $false
$client = [Net.Http.HttpClient]::new()
$client.DefaultRequestHeaders.Add('Authorization', $member.Authorization)
$submitted = @()
try {
    if ($settings.mode -ne 'AUTO') {
        $pending = (Invoke-RestMethod -Uri $staffPath -Headers $admin).data | Where-Object status -eq 'PENDING'
        foreach ($post in $pending) {
            $detail = (Invoke-RestMethod -Uri "$staffPath/$($post.id)" -Headers $admin).data
            if ($detail.scan.state -in 'PAUSED', 'QUEUED', 'RUNNING') {
                throw "Bài #$($post.id) đang có tác vụ AI. Hãy xử lý hàng đợi hiện tại trước khi bật AUTO tạm thời."
            }
        }
        $null = Invoke-RestMethod -Method Put -Uri $settingsPath -Headers $admin -ContentType 'application/json' -Body '{"mode":"AUTO"}'
        $changedMode = $true
    }

    foreach ($scenario in $scenarios) {
        $post = Submit-DemoPost $scenario $member $client
        $submitted += [pscustomobject]@{ Id = $post.id; Title = $post.title; Expected = $scenario.Expected }
        Write-Host "Đã nạp #$($post.id) $($post.title)"
    }

    $deadline = [DateTime]::UtcNow.AddSeconds($WaitSeconds)
    do {
        $results = foreach ($row in $submitted) {
            $detail = (Invoke-RestMethod -Uri "$staffPath/$($row.Id)" -Headers $admin).data
            [pscustomobject]@{
                Id = $row.Id
                Title = $row.Title
                Expected = $row.Expected
                Scan = $detail.scan.state
                Status = $detail.post.status
                Findings = ($detail.scan.findings.code -join ', ')
            }
        }
        if (!($results | Where-Object { !$_.Scan -or $_.Scan -in 'QUEUED', 'RUNNING', 'PAUSED' })) { break }
        if ([DateTime]::UtcNow -ge $deadline) { break }
        Start-Sleep -Seconds 3
    } while ($true)
    $results | Format-Table -AutoSize
} finally {
    $client.Dispose()
    if ($changedMode) {
        $body = @{ mode = $settings.mode } | ConvertTo-Json -Compress
        $null = Invoke-RestMethod -Method Put -Uri $settingsPath -Headers $admin -ContentType 'application/json' -Body $body
        Write-Host "Đã trả chế độ AI về $($settings.mode)."
    }
}
