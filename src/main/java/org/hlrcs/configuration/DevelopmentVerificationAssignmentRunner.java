package org.hlrcs.configuration;

import lombok.RequiredArgsConstructor;
import org.hlrcs.service.DevelopmentVerificationAssignments;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;
import java.nio.file.Files;
import java.nio.file.Path;

@Component @RequiredArgsConstructor @Order(100)
@Profile("assignment-dev & !prod & !production")
@ConditionalOnProperty(name = "app.verification-assignments.enabled", havingValue = "true")
public class DevelopmentVerificationAssignmentRunner implements ApplicationRunner {
    private final DevelopmentVerificationAssignments assignments;
    private final Environment environment;
    private final ObjectMapper json;
    @Override public void run(ApplicationArguments args) throws Exception {
        // Explicit local file + operator required; never create sample accounts or guess IDs.
        var file = environment.getRequiredProperty("app.verification-assignments.file");
        var operator = environment.getRequiredProperty("app.verification-assignments.operator");
        var commands = json.readValue(Files.readString(Path.of(file)), DevelopmentVerificationAssignments.Command[].class);
        for (var command : commands) assignments.apply(command, operator);
    }
}
