# Run the project locally on Windows

## Intermittent connection diagnostics (2026-11-25)

The Local run configuration writes backend output to `logs/local-application.log`.
Unhandled API exceptions include their stack trace there. Vite writes upstream
socket failures to `logs/local-proxy-errors.log` (method, path without query, target
origin and socket code only). No Authorization header or message content is logged
by the proxy. Restart the Local configuration to enable backend file logging.

Chat history/inbox GETs now retry transient failures twice and preserve their last
confirmed data. Sends are not automatically retried. A persistent background read
failure is shown as a sync status, while initial-load/send failures remain errors.
Restoring a tab reconnects SSE and uses its server resync once, rather than emitting
an extra local resync. Tests cover retry recovery, cancellation and duplicate resync.

`ERR_NETWORK_ACCESS_DENIED` in Edge does not identify the responsible network
filter. HTTP 500s were also observed historically but did not reproduce in direct
backend/proxy checks. These changes improve recovery and diagnostics; they do not
prove that persistent browser network blocking has been resolved. VPN was unchanged.

## IntelliJ IDEA

Select **HL-RCS Full Stack (Local)** in the Run configuration list, then Run.
It remains an Application configuration: a Maven `compile` before-run task builds
the current sources, then IntelliJ launches `HlRcsApplication` using Java 17 with
backend port 8081 and the Vite frontend. Its project-local TEMP/TMP and JVM socket
directory use `target`, created by compilation. It has no IntelliJ `Make` step,
so it does not depend on the JPS build server connection.
**HL-RCS Full Stack (Maven)** is an alternative that runs through `spring-boot:run`.
Use the configured Java 17 SDK. The working directory is the repository root.

Stop an older application instance first: this local configuration uses backend port 8081 and Vite port 5173.
The shared application default is 8080; the local Full Stack configurations override it to 8081.
The full-stack launcher passes the actual backend port
to Vite through `API_TARGET`, so browser API calls reach the running backend.
The JVM socket temporary directory is set to `target` (created by Maven before startup).
On this machine the default short-name TEMP path caused `Selector.open()` to fail with
`UnixDomainSockets.connect0: Invalid argument: connect`; using a project-local directory
passed the same diagnostic. The script also sets TEMP/TMP only for its own child processes.
Existing MySQL credentials in ignored `config/mysql-local.properties` are loaded automatically.

The Vite configuration warms the main entry and common lazy routes. The Local
launcher prepares the main browser module before printing `[frontend] Ready`.
After pulling frontend changes, wait for that line, then reload the browser with
Ctrl+Shift+R if an older tab is still showing the HTML bootstrap spinner.

If Edge's Console shows `ERR_NETWORK_ACCESS_DENIED` for `/src/...` or
`/api/auth/me`, the browser/network layer denied the request before an HTTP
response. This was observed on 2026-11-25 while the server endpoints were reachable
from outside that browser. A failed lazy route import previously unmounted React;
the root error boundary now provides a reload action instead of a blank screen.
Do not treat that fallback as a repair for the browser's network restriction.
Check browser VPN/network controls and endpoint protection with the user's consent.
The merge switched App/PortalScreens to lazy route imports. Those route loaders now
retry recognizable module-loading failures twice (350ms and 1000ms), then surface
the root error fallback. Runtime/syntax exceptions are never retried. The network
error alone does not establish that VPN caused it; leave VPN unchanged unless a
controlled comparison establishes a relationship.

Community's SSE connection no longer expires every 60 seconds; it rotates after
five minutes and checks session/account access on every heartbeat/event. Restart
the backend from **HL-RCS Full Stack (Local)** to apply this backend change; Vite
hot reload alone cannot replace the running Java service. Background feed resyncs
keep the current cards visible and retry temporary failures before reporting them.

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

## MySQL connection permission error

If the root cause is `java.net.SocketException: Permission denied: connect` while
Hikari/MySQL starts, Java could not open the database socket. The later Hibernate
`Unable to determine Dialect` error is a consequence; setting a dialect does not
repair the connection. Keep the configured database credentials unchanged.

Check that MySQL80 is running, then run `run-local.cmd` from a normal Windows
terminal outside a restricted execution sandbox. If Java still receives the same
permission error there, inspect the security software/Windows rule blocking that
specific Java executable; do not disable security protections globally.

On 2026-11-25, Java 17 connected to the existing MySQL 8 database and the backend
started on 8081 when launched outside the restricted runner. Port 8080 was already
in use, so both shared Full Stack configurations now agree with `run-local.cmd`.

JetBrains documentation: https://www.jetbrains.com/help/idea/delegate-build-and-run-actions-to-maven.html
