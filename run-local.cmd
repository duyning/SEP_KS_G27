@echo off
setlocal
cd /d "%~dp0"
if not defined JAVA_HOME if exist "C:\Program Files\Java\jdk-17\bin\java.exe" set "JAVA_HOME=C:\Program Files\Java\jdk-17"
if defined JAVA_HOME set "PATH=%JAVA_HOME%\bin;%PATH%"
if not exist "%~dp0target" mkdir "%~dp0target"
set "TEMP=%~dp0target"
set "TMP=%TEMP%"
if not exist "config\mysql-local.properties" echo [INFO] No local MySQL override found. Using application.properties and environment variables.
echo [INFO] Starting backend and frontend through Maven. Stop any previous instance first.
call "%~dp0mvnw.cmd" spring-boot:run "-Dspring-boot.run.jvmArguments=-Dhlrcs.frontend.enabled=true -Djdk.net.unixdomain.tmpdir=target" "-Dspring-boot.run.arguments=--server.port=8081"
exit /b %ERRORLEVEL%
