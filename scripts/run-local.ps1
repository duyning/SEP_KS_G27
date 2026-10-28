param([string]$JavaHome)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot

if (-not $JavaHome) {
    $javaCandidates = @(
        $env:JAVA_HOME,
        (Join-Path $env:ProgramFiles 'Java/jdk-21'),
        (Join-Path $env:ProgramFiles 'Java/jdk-17')
    )
    $JavaHome = $javaCandidates | Where-Object {
        $_ -and (Test-Path -LiteralPath (Join-Path $_ 'bin/java.exe'))
    } | Select-Object -First 1
}
if (-not $JavaHome -or -not (Test-Path -LiteralPath (Join-Path $JavaHome 'bin/java.exe'))) {
    throw 'Set JAVA_HOME to a JDK 17+ installation or pass -JavaHome.'
}

& (Join-Path $PSScriptRoot 'start-local-mysql.ps1')
$javaTmp = Join-Path $projectRoot '.local/java-tmp'
New-Item -ItemType Directory -Path $javaTmp -Force | Out-Null
$mavenCommand = Get-Command mvn.cmd -ErrorAction SilentlyContinue
$mavenPath = if ($mavenCommand) { $mavenCommand.Source } else { Join-Path $projectRoot 'mvnw.cmd' }
$previousJavaHome = $env:JAVA_HOME

Push-Location $projectRoot
try {
    $env:JAVA_HOME = $JavaHome
    # Windows packaged app runners can give Java an unusable Unix socket temp path.
    $jvmArguments = '-Djdk.net.unixdomain.tmpdir="' + $javaTmp.Replace('\', '/') + '"'
    & $mavenPath spring-boot:run "-Dspring-boot.run.jvmArguments=$jvmArguments"
    if ($LASTEXITCODE -ne 0) {
        throw 'Backend startup failed. See the Maven output above.'
    }
} finally {
    Pop-Location
    $env:JAVA_HOME = $previousJavaHome
}
