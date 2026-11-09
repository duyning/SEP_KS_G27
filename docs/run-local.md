# Run the project locally on Windows

## IntelliJ IDEA

Select **HL-RCS Full Stack (Maven)** in the Run configuration list, then Run.
This configuration compiles with Maven and starts Spring Boot plus the Vite frontend.
It has no IntelliJ `Make` step, so it does not depend on the JPS build server connection.
Use the configured Java 17 SDK. The working directory is the repository root.

Stop an older application instance first: this local configuration uses backend port 8081 and Vite port 5173.
The application defaults to backend port 8081. The full-stack launcher passes the actual backend port
to Vite through `API_TARGET`, so browser API calls reach the running backend.
The JVM socket temporary directory is set to `target` (created by Maven before startup).
On this machine the default short-name TEMP path caused `Selector.open()` to fail with
`UnixDomainSockets.connect0: Invalid argument: connect`; using a project-local directory
passed the same diagnostic. The script also sets TEMP/TMP only for its own child processes.
Existing MySQL credentials in ignored `config/mysql-local.properties` are loaded automatically.

## Terminal fallback

From the repository root:

```powershell
.\run-local.cmd
```

This uses `JAVA_HOME` when configured, otherwise the installed JDK at
`C:\Program Files\Java\jdk-17` if present. Node.js and frontend dependencies are resolved
by the existing full-stack launcher. Stop the command with Ctrl+C to stop both processes.

Frontend: http://127.0.0.1:5173/community

Backend: http://127.0.0.1:8081/api/community/posts

## IntelliJ abnormal build process termination

`Permission denied: connect: /127.0.0.1:<port>` from `org.jetbrains.jps.cmdline.BuildMain`
means the IntelliJ build process could not connect to the IDE on its local socket.
It is different from a Java compilation error or a database connection failure.
The Maven configuration above avoids that failing JPS build step; it does not change
firewall, antivirus or Windows network permissions.

JetBrains documentation: https://www.jetbrains.com/help/idea/delegate-build-and-run-actions-to-maven.html
