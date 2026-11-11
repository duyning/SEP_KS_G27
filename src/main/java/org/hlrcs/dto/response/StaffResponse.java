package org.hlrcs.dto.response;

import org.hlrcs.dto.request.PropertyRegistrationRequest;
import java.time.LocalDateTime;
import java.util.List;

public class StaffResponse {
    public record Verification(Integer registrationId, String name, String address, String ownerName,
            String ownerEmail, String ownerPhone, String managerName, String contactPhone, String propertyType,
            String status, LocalDateTime createdAt, LocalDateTime reviewedAt, String reviewerName,
            int documentCount, int requiredDocumentCount, Integer coverId, Integer ownerId, Integer targetPropertyId,
            LocalDateTime submittedAt, String assignedStaffName, long assignmentVersion, boolean canReview,
            boolean readyForApproval, int photoCount, Integer publishedPropertyId, String reasonNote, boolean reverificationRequired, List<String> reverificationReasons) {}
    public record Attachment(Integer documentId, String type, String fileName, String verificationStatus,
            String contentType, Long fileSize, LocalDateTime uploadedAt) {}
    public record Activity(Integer logId, String staffName, String targetType, Integer targetId,
            String action, String note, LocalDateTime createdAt) {}
    public record SubmissionEvent(Integer eventId,String actorName,String action,LocalDateTime createdAt) {}
    public record Detail(Verification summary, PropertyRegistrationRequest submission, List<Attachment> photos,
            List<Attachment> documents, String reasonNote, List<Activity> history, PropertyRegistrationRequest publishedSubmission,
            List<SubmissionEvent> submissionEvents, Integer assignedStaffId, String assignedStaffName, long assignmentVersion, boolean canReview) {}
    public record QueueItem(String key, String type, String title, String requester, String description,
            String status, LocalDateTime createdAt, String detailLink) {}
    public record Dashboard(long pendingVerifications, long pendingReports, Integer pendingFeedback,
            long pendingSupport, long pendingCommunity, long activeProperties, long processedTasks,
            Double slaPercent, Double averageResponseHours, List<QueueItem> queue, List<Activity> activities) {}
}
