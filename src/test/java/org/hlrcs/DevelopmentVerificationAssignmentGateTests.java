package org.hlrcs;

import org.hlrcs.configuration.DevelopmentVerificationAssignmentRunner;
import org.hlrcs.service.DevelopmentVerificationAssignments;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import static org.junit.jupiter.api.Assertions.*;

class DevelopmentVerificationAssignmentGateTests {
    @Test void provisioningIsAbsentFromNormalAndProductionContextsEvenWithDevProfileAlsoEnabled() {
        for(var profiles:new String[][]{{"mysql"},{"prod","assignment-dev"},{"production","test","assignment-dev"}}) {
            try(var context=new AnnotationConfigApplicationContext()) {
                context.getEnvironment().setActiveProfiles(profiles);
                context.register(DevelopmentVerificationAssignments.class,DevelopmentVerificationAssignmentRunner.class);
                context.refresh();
                assertTrue(context.getBeansOfType(DevelopmentVerificationAssignments.class).isEmpty());
                assertTrue(context.getBeansOfType(DevelopmentVerificationAssignmentRunner.class).isEmpty());
            }
        }
    }
}
