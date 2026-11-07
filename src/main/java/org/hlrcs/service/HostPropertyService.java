package org.hlrcs.service;

import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.request.PropertyRegistrationRequest;
import org.hlrcs.dto.response.HostPropertyResponse;
import org.hlrcs.dto.response.HostPropertyResponse.Attachment;
import org.hlrcs.dto.response.HostPropertyResponse.PropertyDetail;
import org.hlrcs.entity.Property;
import org.hlrcs.entity.PropertyRegistration;
import org.hlrcs.entity.enums.BookingStatus;
import org.hlrcs.entity.enums.RegistrationStatus;
import org.hlrcs.exception.ResourceNotFoundException;
import org.hlrcs.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class HostPropertyService {
    private final AuthService authService;
    private final PropertyRepository properties;
    private final PropertyRegistrationRepository registrations;
    private final PropertyDocumentRepository documents;
    private final RoomTypeRepository roomTypes;
    private final BookingRepository bookings;
    private final ObjectMapper json;
    private final RoomRepository rooms;

    @Transactional(readOnly = true)
    public HostPropertyResponse getProperties(Integer selectedId) {
        Integer ownerId = authService.getCurrentUser().getUserId();
        var owned = properties.findByOwner_UserIdOrderByPropertyIdAsc(ownerId);
        var ownedTypes = roomTypes.findByProperty_Owner_UserId(ownerId);
        var result = new ArrayList<PropertyDetail>();
        for (var property : owned) {
            if (selectedId != null && !selectedId.equals(property.getPropertyId())) continue;
            var registration = property.getRegistration();
            // A corrupt cross-owner relationship must not expose another person's documents.
            if (registration != null && !ownerId.equals(registration.getUser().getUserId())) registration = null;
            int count = (int) ownedTypes.stream().filter(type -> type.getProperty().getPropertyId().equals(property.getPropertyId())).count();
            result.add(detail(property, registration, count));
        }
        if (selectedId != null && result.isEmpty()) throw new ResourceNotFoundException("Không tìm thấy nhà trọ này trong danh sách bạn được phép quản lý.");
        if (selectedId == null) {
            var linked=owned.stream().filter(property->property.getRegistration()!=null).map(property->property.getRegistration().getRegistrationId()).collect(java.util.stream.Collectors.toSet());
            for(var registration:registrations.findByUser_UserIdOrderByCreatedAtDesc(ownerId))
                if(!linked.contains(registration.getRegistrationId())&&registration.getTargetPropertyId()==null)result.add(detail(null,registration,0));
        }
        return new HostPropertyResponse(result);
    }

    private PropertyDetail detail(Property property, PropertyRegistration registration, int typeCount) {
        PropertyRegistrationRequest details = null;
        if (registration != null && registration.getRegistrationDetails() != null) {
            try { details = json.readValue(registration.getRegistrationDetails(), PropertyRegistrationRequest.class); }
            catch (tools.jackson.core.JacksonException ignored) { /* Legacy profiles can predate structured registration details. */ }
        }
        String status = "INACTIVE";
        if (registration != null && registration.getStatus() == RegistrationStatus.PENDING) status = "PENDING";
        else if (registration != null && registration.getStatus() == RegistrationStatus.NEEDS_SUPPLEMENT) status = "NEEDS_SUPPLEMENT";
        else if (registration != null && registration.getStatus() == RegistrationStatus.REJECTED) status = "REJECTED";
        else if (property != null && "ACTIVE".equalsIgnoreCase(property.getStatus())) status = "VISIBLE";
        else if (registration != null && registration.getStatus() == RegistrationStatus.APPROVED) status = "APPROVED";
        var photos = new ArrayList<Attachment>();
        var files = new ArrayList<Attachment>();
        if (registration != null) for (var file : documents.findByRegistration_RegistrationIdOrderByDocumentIdAsc(registration.getRegistrationId())) {
            var metadata = new Attachment(file.getDocumentId(), file.getDocumentType(), file.getFileName(), file.getVerificationStatus());
            if (file.getDocumentType() != null && file.getDocumentType().matches("PHOTO_\\d+")) photos.add(metadata);
            else if (List.of("OWNERSHIP", "ID_CARD", "FIRE_SAFETY").contains(file.getDocumentType() == null ? "" : file.getDocumentType())) files.add(metadata);
        }
        List<String> requestedFields = registration != null && registration.getStatus() == RegistrationStatus.NEEDS_SUPPLEMENT
                ? safeRequested(registration) : List.of();
        Map<String, String> fieldNotes = registration != null && registration.getStatus() == RegistrationStatus.NEEDS_SUPPLEMENT
                ? RegistrationEditPolicy.fieldNotes(registration, json) : Map.of();
        return new PropertyDetail(property == null ? null : property.getPropertyId(), registration == null ? null : registration.getRegistrationId(),
                property == null ? registration.getName() : property.getName(), property == null ? registration.getAddress() : property.getAddress(), status,
                registration != null && registration.getStatus() == RegistrationStatus.APPROVED,
                details == null ? null : details.propertyType(), details == null ? null : details.addressDetail(), details == null ? null : details.commune(), details == null ? null : details.nearby(),
                details == null ? null : details.managerName(), details == null ? null : details.contactPhone(), details == null ? null : details.zaloPhone(),
                property == null ? registration.getContactInfo() : property.getContactInfo(),
                property != null && property.getDescription() != null ? property.getDescription() : details == null ? null : details.description(),
                details == null || details.amenities() == null ? List.of() : details.amenities(), details == null || details.selectedRules() == null ? List.of() : details.selectedRules(),
                details == null ? null : details.rules(), photos, files, typeCount, property==null?null:Math.toIntExact(rooms.countByProperty_PropertyId(property.getPropertyId())), property==null?null:Math.toIntExact(rooms.countByProperty_PropertyIdAndStatus(property.getPropertyId(),"VACANT")),
                property == null ? 0 : bookings.countByRoomType_Property_PropertyIdAndStatus(property.getPropertyId(), BookingStatus.PENDING),
                property == null ? registration.getCreatedAt() : property.getCreatedAt(), property == null ? registration.getReviewedAt() : property.getUpdatedAt(), registration == null ? null : registration.getReasonNote(),
                requestedFields, fieldNotes,
                property==null?null:registrations.findByUser_UserIdOrderByCreatedAtDesc(property.getOwner().getUserId()).stream().filter(r->property.getPropertyId().equals(r.getTargetPropertyId())&&registrationId(property).equals(r.getBaseRegistrationId())&&r.getStatus()!=RegistrationStatus.APPROVED).findFirst().map(r->new HostPropertyResponse.ChangeRequest(r.getRegistrationId(),r.getStatus().name(),r.getReasonNote(),safeRequested(r),RegistrationEditPolicy.fieldNotes(r,json))).orElse(null),details==null?null:details.latitude(),details==null?null:details.longitude());
    }

    private List<String> safeRequested(PropertyRegistration registration) {
        if (registration == null || registration.getStatus() != RegistrationStatus.NEEDS_SUPPLEMENT) return List.of();
        try { return RegistrationEditPolicy.requested(registration, json); }
        catch (Exception ignored) { return List.of(); }
    }

    public record Photo(byte[] content, String contentType) {}
    @Transactional(readOnly = true)
    public Photo getPhoto(Integer id) {
        var file = documents.findById(id).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ảnh."));
        if (file.getArchivedAt()!=null || !authService.getCurrentUser().getUserId().equals(file.getRegistration().getUser().getUserId())
                || file.getDocumentType() == null || !file.getDocumentType().matches("PHOTO_\\d+") || file.getFileContent() == null
                || !List.of("image/jpeg", "image/png", "image/webp").contains(file.getContentType() == null ? "" : file.getContentType())) {
            throw new ResourceNotFoundException("Không tìm thấy ảnh.");
        }
        return new Photo(file.getFileContent(), file.getContentType());
    }
    private Integer registrationId(Property property){return property.getRegistration()==null?-1:property.getRegistration().getRegistrationId();}
}
