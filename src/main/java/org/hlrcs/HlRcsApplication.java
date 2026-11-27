package org.hlrcs;

import org.hlrcs.development.LocalFrontend;
import org.hlrcs.development.LocalMySql;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class HlRcsApplication {

    public static void main(String[] args) {
        var application = new SpringApplication(HlRcsApplication.class);
        application.addInitializers(context -> LocalMySql.ensureReady(context.getEnvironment()));
        var context = application.run(args);
        if (Boolean.getBoolean("hlrcs.frontend.enabled")) {
            try {
                LocalFrontend.start(context);
            } catch (Exception exception) {
                context.close();
                throw new IllegalStateException("Could not start the React frontend", exception);
            }
        }
    }

}
