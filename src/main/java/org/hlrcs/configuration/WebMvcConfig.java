package org.hlrcs.configuration;

import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {
    private final String frontendUrl;

    public WebMvcConfig(@Value("${app.frontend-url:http://localhost:5173}") String frontendUrl) {
        this.frontendUrl = frontendUrl.replaceAll("/+$", "");
    }

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        registry.addRedirectViewController("/", frontendUrl + "/login");
        registry.addRedirectViewController("/index.html", frontendUrl + "/account");
        registry.addRedirectViewController("/login", frontendUrl + "/login");
        registry.addRedirectViewController("/login.html", frontendUrl + "/login");
        registry.addRedirectViewController("/register", frontendUrl + "/register");
        registry.addRedirectViewController("/register.html", frontendUrl + "/register");
        registry.addRedirectViewController("/profile", frontendUrl + "/account");
        registry.addRedirectViewController("/profile.html", frontendUrl + "/account");
    }
}
