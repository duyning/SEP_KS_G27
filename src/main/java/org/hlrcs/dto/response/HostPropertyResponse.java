package org.hlrcs.dto.response;

import java.time.LocalDateTime;
import java.util.List;

public record HostPropertyResponse(List<PropertyDetail> records) {
    public record Attachment(Integer documentId, String type, String fileName, String verificationStatus) {}
    public record ChangeRequest(Integer registrationId,String status,String reasonNote) {}
    public record PropertyDetail(Integer propertyId, Integer registrationId, String name, String address,
            String displayStatus, boolean verified, String propertyType, String addressDetail, String commune,
            String managerName, String contactPhone, String zaloPhone, String contactInfo, String description,
            List<String> amenities, List<String> selectedRules, String rules, List<Attachment> photos,
            List<Attachment> documents, int roomTypeCount, Integer totalRooms, Integer vacantRooms,
            long pendingViewingCount, LocalDateTime createdAt, LocalDateTime updatedAt, String reasonNote,ChangeRequest changeRequest,String latitude,String longitude) {}
}
