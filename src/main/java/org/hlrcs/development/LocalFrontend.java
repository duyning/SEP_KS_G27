package org.hlrcs.development;

import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.event.ContextClosedEvent;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/** Optional development process, enabled only by the IntelliJ Full Stack configuration. */
public final class LocalFrontend {
    private LocalFrontend() { }

    public static void start(ConfigurableApplicationContext context) throws Exception {
        Path frontend = Path.of("frontend").toAbsolutePath().normalize();
        if (!Files.isRegularFile(frontend.resolve("scripts/intellij-dev.mjs"))) {
            throw new IllegalStateException("Set the IntelliJ working directory to the folder containing pom.xml and frontend.");
        }
        String executable = System.getProperty("os.name").startsWith("Windows") ? "node.exe" : "node";
        List<Path> directories = new ArrayList<>();
        String nodeHome = System.getenv("NODE_HOME");
        if (nodeHome != null) directories.add(Path.of(nodeHome));
        String path = System.getenv("PATH");
        if (path != null) {
            for (String directory : path.split(java.io.File.pathSeparator)) {
                if (!directory.isBlank()) directories.add(Path.of(directory.replace("\"", "")));
            }
        }
        directories.add(Path.of(System.getProperty("user.home"), ".cache", "codex-runtimes",
                "codex-primary-runtime", "dependencies", "node", "bin"));
        String programFiles = System.getenv("ProgramFiles");
        if (programFiles != null) directories.add(Path.of(programFiles, "nodejs"));
        Path node = directories.stream().map(directory -> directory.resolve(executable))
                .filter(Files::isRegularFile).findFirst()
                .orElseThrow(() -> new IllegalStateException("Node.js was not found. Install Node.js 22.12+ and restart IntelliJ."));

        ProcessBuilder builder = new ProcessBuilder(node.toString(), "scripts/intellij-dev.mjs",
                Long.toString(ProcessHandle.current().pid()));
        builder.directory(frontend.toFile()).inheritIO();
        builder.environment().put("PATH", node.getParent() + java.io.File.pathSeparator + (path == null ? "" : path));
        builder.environment().put("API_TARGET", "http://127.0.0.1:"
                + context.getEnvironment().getProperty("local.server.port", "8080"));
        Process process = builder.start();
        context.addApplicationListener(event -> {
            if (event instanceof ContextClosedEvent) process.destroy();
        });
        Runtime.getRuntime().addShutdownHook(new Thread(process::destroy, "frontend-shutdown"));
        process.onExit().thenAccept(exited -> {
            if (context.isActive()) {
                System.err.println("Frontend stopped (exit " + exited.exitValue() + "). Stopping backend; check the frontend output above.");
                context.close();
            }
        });
    }
}
