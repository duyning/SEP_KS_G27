package org.hlrcs;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.hlrcs.development.LocalFrontend;

@SpringBootApplication
public class HlRcsApplication {

    public static void main(String[] args) {
        var context = SpringApplication.run(HlRcsApplication.class, args);
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
