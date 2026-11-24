package org.hlrcs.service;

import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.request.PropertyRegistrationRequest;
import org.hlrcs.dto.response.PropertyRegistrationResponse;
import org.hlrcs.entity.PropertyDocument;
import org.hlrcs.entity.PropertyRegistration;
import org.hlrcs.entity.enums.RegistrationStatus;
import org.hlrcs.exception.AppException;
import org.hlrcs.exception.BadRequestException;
import org.hlrcs.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.*;

@Service
@RequiredArgsConstructor
public class PropertyRegistrationService {
    private final AuthService authService;
    private final UserRepository users;
    private final PropertyRegistrationRepository registrations;
    private final PropertyDocumentRepository documents;
    private final ObjectMapper json;
    private final org.springframework.context.ApplicationEventPublisher publisher;
    private final HostApplicationRepository hostApplications;
    private final HostApplicationIdentityRepository hostIdentities;
    private static final Set<String> TYPES = Set.of("Nhà trọ truyền thống / Phòng trọ sinh viên", "Chung cư mini", "Căn hộ dịch vụ / Studio", "Homestay");
    private static final Set<String> AREAS = Set.copyOf(PropertyAreas.VALUES);
    private static final Set<String> AMENITIES = Set.of("parking", "fingerprint", "camera", "flexibleHours", "fireSafety", "separateOwner", "wifi", "laundry", "drying", "cleaning", "water", "elevator", "security", "emergencyExit", "emergencyLighting", "wasteCollection", "bicycleParking", "commonArea");
    private static final Set<String> RULES = Set.of("quietHours", "noSmoking", "noUnsafeStoves", "residenceRegistration", "cleanliness", "pets", "guestRegistration", "noBlockedExits", "safeCharging", "wasteSorting", "noSubletting", "reportIncidents");

    public record Eligibility(boolean canRegister, String reason, Integer identityApplicationId, boolean hasIdentityBackImage) {}

    @Transactional(readOnly = true)
    public Eligibility eligibility() {
        var owner=authService.getCurrentUser();
        Integer identityId=approvedIdentityId(owner.getUserId());
        return new Eligibility(true, "ELIGIBLE", identityId, identityId!=null&&hostIdentities.existsByApplicationIdAndBackContentIsNotNull(identityId));
    }

    @Transactional(readOnly = true)
    public PropertyRegistrationResponse current() {
        return registrations.findByUser_UserIdOrderByCreatedAtDesc(authService.getCurrentUser().getUserId()).stream()
                .filter(row -> row.getStatus() == RegistrationStatus.PENDING || row.getStatus() == RegistrationStatus.NEEDS_SUPPLEMENT).findFirst()
                .map(PropertyRegistrationResponse::from).orElse(null);
    }

    @Transactional(rollbackFor = Exception.class, isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public PropertyRegistrationResponse submit(PropertyRegistrationRequest request, List<MultipartFile> photos,
                                                MultipartFile ownership, MultipartFile idCard, MultipartFile fireSafety) throws IOException {
        return submitInternal(request,photos,ownership,idCard,fireSafety,false);
    }
    @Transactional(rollbackFor = Exception.class)
    public PropertyRegistrationResponse submitOnboarding(PropertyRegistrationRequest request,List<MultipartFile> photos,MultipartFile ownership,MultipartFile fireSafety) throws IOException {
        return submitInternal(request,photos,ownership,null,fireSafety,true);
    }
    private PropertyRegistrationResponse submitInternal(PropertyRegistrationRequest request,List<MultipartFile> photos,MultipartFile ownership,MultipartFile idCard,MultipartFile fireSafety,boolean onboarding) throws IOException {
        validate(request);
        if (photos == null || photos.isEmpty() || photos.size() > 10) throw new BadRequestException("Cần từ 1 đến 10 ảnh nhà trọ.");
        if (ownership == null || ownership.isEmpty() || fireSafety == null || fireSafety.isEmpty()) throw new BadRequestException("Cần giấy phép kinh doanh, căn cước và chứng nhận an toàn PCCC để gửi xét duyệt.");
        // Distinct properties may be submitted concurrently. Serialize by owner
        // so retries of the same name/address cannot create duplicate profiles.
        var owner = users.findForRegistrationUpdate(authService.getCurrentUser().getUserId()).orElseThrow(() -> new BadRequestException("Không tìm thấy chủ trọ."));
        org.hlrcs.entity.HostApplicationIdentity savedIdentity=null;
        if(idCard==null||idCard.isEmpty()){
            Integer identityId=onboarding?hostApplications.findByUser_UserId(owner.getUserId()).filter(a->"MERGED".equals(a.getStatus())).map(org.hlrcs.entity.HostApplication::getId).orElse(null):approvedIdentityId(owner.getUserId());
            savedIdentity=identityId==null?null:hostIdentities.findById(identityId).orElse(null);
            if(savedIdentity==null||savedIdentity.getContent()==null||savedIdentity.getContent().length==0)
                throw new BadRequestException("Chưa có CCCD từ đơn chủ trọ đã duyệt. Vui lòng tải lên CCCD để gửi hồ sơ.");
        }
        String address=request.addressDetail().trim()+", "+request.commune();
        boolean duplicate=registrations.findByUser_UserIdOrderByCreatedAtDesc(owner.getUserId()).stream()
                .anyMatch(row->row.getStatus()!=RegistrationStatus.REJECTED && row.getName().trim().equalsIgnoreCase(request.name().trim())
                        && Objects.toString(row.getAddress(),"").trim().equalsIgnoreCase(address));
        if(duplicate)throw new AppException("Nhà trọ có cùng tên và địa chỉ đã được đăng ký. Vui lòng xem hồ sơ tại Nhà trọ của tôi.",HttpStatus.CONFLICT);
        var registration = registrations.save(PropertyRegistration.builder().user(owner).name(request.name().trim())
                .address(request.addressDetail().trim() + ", " + request.commune())
                .contactInfo(request.managerName().trim() + " · " + request.contactPhone())
                .googleMapLink(mapLink(request))
                .registrationDetails(json.writeValueAsString(request)).status(RegistrationStatus.PENDING).hostOnboarding(onboarding).build());
        for (int index = 0; index < photos.size(); index++) saveFile(registration, "PHOTO_" + index, photos.get(index), false);
        saveFile(registration, "OWNERSHIP", ownership, true);
        if(savedIdentity==null)saveFile(registration, "ID_CARD", idCard, true);
        else documents.save(PropertyDocument.builder().registration(registration).documentType("ID_CARD")
                .verificationStatus("PENDING").fileName("CCCD-da-nop-dang-ky-chu-tro"+("image/png".equals(savedIdentity.getContentType())?".png":".jpg"))
                .contentType(savedIdentity.getContentType()).fileContent(savedIdentity.getContent().clone()).build());
        if(savedIdentity!=null&&savedIdentity.getBackContent()!=null)
            documents.save(PropertyDocument.builder().registration(registration).documentType("ID_CARD_BACK").verificationStatus("PENDING")
                    .fileName("CCCD-mat-sau"+("image/png".equals(savedIdentity.getBackContentType())?".png":".jpg"))
                    .contentType(savedIdentity.getBackContentType()).fileContent(savedIdentity.getBackContent().clone()).build());
        saveFile(registration, "FIRE_SAFETY", fireSafety, true);
        publisher.publishEvent(new AutomaticVerificationAssignment.Submitted(registration.getRegistrationId()));
        return PropertyRegistrationResponse.from(registration);
    }

    private Integer approvedIdentityId(Integer ownerId){
        return hostApplications.findByUser_UserId(ownerId).filter(application->"APPROVED".equals(application.getStatus()))
                .map(org.hlrcs.entity.HostApplication::getId).filter(hostIdentities::existsById).orElse(null);
    }

    void validate(PropertyRegistrationRequest value) {
        if (!validPropertyType(value.propertyType()) || !AREAS.contains(value.commune())) throw new BadRequestException("Loại hình hoặc khu vực nhà trọ không hợp lệ.");
        if (value.name().trim().length() < 3 || value.description().trim().length() < 30 || value.managerName().trim().length() < 2 || value.addressDetail().trim().length() < 10) throw new BadRequestException("Vui lòng điền đầy đủ thông tin nhà trọ.");
        if (!phone(value.contactPhone()) || (value.zaloPhone() != null && !value.zaloPhone().isBlank() && !phone(value.zaloPhone()))) throw new BadRequestException("Số điện thoại không hợp lệ.");
        boolean hasLatitude=value.latitude()!=null&&!value.latitude().isBlank();
        boolean hasLongitude=value.longitude()!=null&&!value.longitude().isBlank();
        if(hasLatitude!=hasLongitude)throw new BadRequestException("Nếu cung cấp vị trí bản đồ, cần nhập đủ vĩ độ và kinh độ.");
        if(hasLatitude){coordinate(value.latitude(),90);coordinate(value.longitude(),180);}
        if (value.amenities().stream().anyMatch(key -> key == null || !AMENITIES.contains(key)) || !validRules(value.selectedRules())) throw new BadRequestException("Tiện ích hoặc quy định không hợp lệ.");
    }
    static String mapLink(PropertyRegistrationRequest value) {
        return value.latitude()==null||value.latitude().isBlank()||value.longitude()==null||value.longitude().isBlank()
            ? null : "https://www.google.com/maps?q="+value.latitude().trim()+","+value.longitude().trim();
    }
    static boolean validPropertyType(String value){return value!=null&&value.strip().length()>=2&&value.strip().length()<=100&&!value.matches("(?s).*\\p{Cntrl}.*");}
    private boolean validRules(List<String> selectedRules) {
        if (selectedRules == null) return false;
        long quietCount = 0;
        for (String key : selectedRules) {
            if (key == null) return false;
            if (key.equals("quietHours") || key.matches("quietHours:(?:[01]\\d|2[0-3]):[0-5]\\d")) {
                if (++quietCount > 1) return false;
            } else if (!RULES.contains(key)) {
                return false;
            }
        }
        return true;
    }
    private boolean phone(String value) { return value.replaceAll("[\\s.-]", "").matches("(?:0|\\+84)[35789]\\d{8}"); }
    private void coordinate(String value, double limit) {
        if (!value.trim().matches("[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)")) throw new BadRequestException("Tọa độ không hợp lệ.");
        double number = Double.parseDouble(value);
        if (!Double.isFinite(number) || Math.abs(number) > limit) throw new BadRequestException("Tọa độ không hợp lệ.");
    }
    void saveFile(PropertyRegistration registration, String type, MultipartFile file, boolean document) throws IOException {
        if (file.isEmpty() || file.getSize() > (document ? 10L : 5L) * 1024 * 1024) throw new BadRequestException("Tệp rỗng hoặc vượt dung lượng cho phép.");
        byte[] content = file.getBytes();
        String mime = file.getContentType();
        boolean valid = switch (mime == null ? "" : mime) {
            case "image/jpeg" -> content.length > 3 && (content[0] & 255) == 255 && (content[1] & 255) == 216 && (content[2] & 255) == 255;
            case "image/png" -> content.length > 8 && Arrays.equals(Arrays.copyOf(content, 8), new byte[]{(byte)137, 80, 78, 71, 13, 10, 26, 10});
            case "image/webp" -> content.length > 12 && new String(content, 0, 4, java.nio.charset.StandardCharsets.US_ASCII).equals("RIFF") && new String(content, 8, 4, java.nio.charset.StandardCharsets.US_ASCII).equals("WEBP");
            case "application/pdf" -> document && content.length > 5 && new String(content, 0, 5, java.nio.charset.StandardCharsets.US_ASCII).equals("%PDF-");
            default -> false;
        };
        if (!valid) throw new BadRequestException("Nội dung hoặc định dạng tệp không hợp lệ.");
        String name = Optional.ofNullable(file.getOriginalFilename()).orElse("attachment").replaceAll("[\\p{Cntrl}\\\\/]", "_");
        documents.save(PropertyDocument.builder().registration(registration).documentType(type).verificationStatus("PENDING")
                .fileName(name.substring(0, Math.min(name.length(), 200))).contentType(mime).fileContent(content).build());
    }
}
