param(
    [ValidateSet('web', 'mobile')][string]$Target = 'mobile',
    [ValidatePattern('^https://[a-zA-Z0-9.-]+(:[0-9]{1,5})?$')][string]$GoogleBrowserOrigin
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $projectRoot
# This machine may use a Windows MySQL service instead of the optional bundled server.
if (-not (Get-NetTCPConnection -State Listen -LocalPort 3306 -ErrorAction SilentlyContinue)) {
    & (Join-Path $projectRoot 'scripts/start-local-mysql.ps1')
}
$candidates = @($env:JAVA_HOME) + @(Get-ChildItem 'C:/Program Files/Java', 'C:/Program Files/Eclipse Adoptium', "$env:USERPROFILE/.jdks" -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending | ForEach-Object FullName)
$jdk = $candidates | Where-Object { $_ -and (Test-Path (Join-Path $_ 'bin/javac.exe')) } | Select-Object -First 1
if (-not $jdk) { throw 'Install a JDK 17+ and set JAVA_HOME.' }
$env:JAVA_HOME = $jdk
$javaTmp = Join-Path $projectRoot '.local/java-tmp'
New-Item -ItemType Directory -Path $javaTmp -Force | Out-Null
$jvmArguments = '-Djdk.net.unixdomain.tmpdir="' + $javaTmp.Replace('\', '/') + '"'
$apiPort = if ($Target -eq 'web') { 8080 } else { 8081 }
$springArguments = "--server.address=0.0.0.0 --server.port=$apiPort"
if ($Target -eq 'mobile' -and $GoogleBrowserOrigin) {
    $springArguments += " --app.google.mobile-browser-origin=$GoogleBrowserOrigin"
}
& (Join-Path $projectRoot 'mvnw.cmd') spring-boot:run "-Dspring-boot.run.jvmArguments=$jvmArguments" "-Dspring-boot.run.arguments=$springArguments" '-Dspring-boot.run.profiles=mysql'
exit $LASTEXITCODE
