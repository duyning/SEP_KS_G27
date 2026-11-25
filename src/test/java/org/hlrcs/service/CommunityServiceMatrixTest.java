package org.hlrcs.service;

import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.TestFactory;
import java.util.*;

/** Service-only entry point. No controllers or standalone scanner/formatting suites. */
class CommunityServiceMatrixTest {
    @TestFactory List<DynamicTest> services() {
        var tests=new ArrayList<DynamicTest>();
        tests.addAll(new CommunityServiceUnitTest().communityCases());
        tests.addAll(new CommunityCommentServiceUnitTest().commentCases());
        tests.addAll(new CommunityFeedServiceUnitTest().feedCases());
        tests.addAll(new CommunityReportServiceUnitTest().reportCases());
        tests.addAll(new CommunityAutoModerationUnitTest().autoCases());
        tests.addAll(new CommunityMediaUnitTest().mediaCases());
        new CommunityBoundaryUnitTest().boundaryCases().stream()
                .filter(t->!t.getDisplayName().contains("CommunityPostFormatting"))
                .forEach(tests::add);
        tests.addAll(new CommunityServiceMatrixExtraTest().extraCases());
        tests.addAll(new CommunityNotificationMatrixTest().notificationCases());
        tests.addAll(new CommunityRealtimeMatrixTest().realtimeCases());
        tests.addAll(new CommunityReportAssistantMatrixTest().assistantCases());
        tests.addAll(new CommunityFeatureFlowTest().featureFlows());
        return tests;
    }
}
