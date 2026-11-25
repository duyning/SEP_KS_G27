package org.hlrcs;
import org.hlrcs.entity.ServiceComplaint;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class ServiceComplaintCompatibilityTests {
    @Test void legacyReportsRetainResolutionAndOutstandingRequests() {
        var c = new ServiceComplaint();
        for (String state : new String[]{"PENDING", "NEEDS_EXPLANATION", "EXPLAINED"}) {
            c.setStatus(state); assertEquals("PENDING", c.workflowStatus());
            assertEquals("NEEDS_EXPLANATION".equals(state), c.awaitingResponse()); assertNull(c.resolution());
        }
        c.setStatus("DISMISSED"); assertEquals("RESOLVED", c.workflowStatus()); assertEquals("DISMISS", c.resolution()); assertFalse(c.awaitingResponse());
        c.setStatus("REMOVED"); assertEquals("RESOLVED", c.workflowStatus()); assertEquals("REMOVE", c.resolution());
    }
    @Test void responseIsIndependentOfPendingStatusAndNeverActionableAfterResolution() {
        var c = new ServiceComplaint(); c.setStatus("PENDING"); c.setResponseRequested(true); assertTrue(c.awaitingResponse());
        c.setResponseRequested(false); assertFalse(c.awaitingResponse()); assertEquals("PENDING", c.workflowStatus());
        c.setStatus("RESOLVED"); c.setOutcome("DISMISS"); c.setResponseRequested(true); assertFalse(c.awaitingResponse()); assertEquals("DISMISS", c.resolution());
    }
}
