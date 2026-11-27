package org.hlrcs.development;

import org.springframework.core.env.Environment;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

/** Starts the bundled Windows database before Spring initializes the datasource. */
public final class LocalMySql {
    private static final Pattern LOCAL_DATABASE =
            Pattern.compile("jdbc:mysql://(?:127\\.0\\.0\\.1|localhost)(?::3306)?/[\\w-]+(?:\\?.*)?");

    private LocalMySql() { }

    public static void ensureReady(Environment environment) {
        if (!System.getProperty("os.name").startsWith("Windows")
                || environment.matchesProfiles("test")
                || !environment.getProperty("hlrcs.mysql.auto-start", Boolean.class, true)
                || !LOCAL_DATABASE.matcher(environment.getProperty("spring.datasource.url", "")).matches()) {
            return;
        }

        Path launcher = Path.of("scripts", "start-local-mysql.ps1").toAbsolutePath();
        if (!Files.isRegularFile(launcher)) {
            return;
        }

        Process process;
        try {
            process = new ProcessBuilder("powershell.exe", "-NoProfile", "-NonInteractive",
                    "-ExecutionPolicy", "Bypass", "-File", launcher.toString(), "-ServerOnly", "-IfInstalled")
                    .inheritIO()
                    .start();
        } catch (IOException exception) {
            throw new IllegalStateException("Could not run the local MySQL startup script: " + launcher, exception);
        }

        try {
            if (!process.waitFor(90, TimeUnit.SECONDS)) {
                throw new IllegalStateException("Timed out waiting for local MySQL on port 3306.");
            }
            if (process.exitValue() != 0) {
                throw new IllegalStateException("Local MySQL could not start. See the startup script output above.");
            }
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted while waiting for local MySQL.", exception);
        } finally {
            if (process.isAlive()) {
                process.destroyForcibly();
            }
        }
    }
}
