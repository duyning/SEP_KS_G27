package org.hlrcs.service;

import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.response.HostRoomTypesResponse;
import org.hlrcs.dto.response.HostRoomTypesResponse.PropertySummary;
import org.hlrcs.dto.response.HostRoomTypesResponse.RoomTypeSummary;
import org.hlrcs.entity.enums.RegistrationStatus;
import org.hlrcs.exception.ResourceNotFoundException;
import org.hlrcs.repository.PropertyRepository;
import org.hlrcs.repository.PropertyRegistrationRepository;
import org.hlrcs.repository.RoomTypeRepository;
import org.hlrcs.repository.UserRepository;
import org.hlrcs.dto.request.RoomTypeRequest;
import org.hlrcs.entity.RoomType;
import org.hlrcs.exception.AppException;
import org.hlrcs.exception.BadRequestException;
import org.springframework.http.HttpStatus;
import tools.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.hlrcs.repository.*;
import org.hlrcs.entity.Property;
import org.hlrcs.entity.RoomTypeImage;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class HostRoomTypeService {
    private final AuthService authService;
    private final PropertyRepository properties;
    private final PropertyRegistrationRepository registrations;
    private final RoomTypeRepository roomTypes;
    private final UserRepository users;
    private final ObjectMapper json;
    private final RoomTypeImageRepository images;
    private final BookingRepository bookings;
    private final RoomTypeVideoRepository videos;
    private final RoomTypeAmenityRepository amenityLinks;
    private final WishlistRepository wishlists;
    private final RoomRepository rooms;
    private final RoomMapping roomMapper;
    private static final Set<String> AMENITIES = Set.of("airConditioner", "waterHeater", "balcony", "kitchen", "loft", "refrigerator", "washingMachine", "bed", "wardrobe", "desk", "wifi", "privateBathroom");

    private RoomTypeSummary summary(RoomType type) {
        List<String> amenities = List.of();
        if (type.getAmenitiesJson() != null) try { amenities = java.util.Arrays.asList(json.readValue(type.getAmenitiesJson(), String[].class)); }
        catch (tools.jackson.core.JacksonException ignored) { /* Older rows may not have structured amenities. */ }
        var physical=rooms.findByRoomType_RoomTypeIdOrderByRoomNumberAsc(type.getRoomTypeId());
        return new RoomTypeSummary(type.getRoomTypeId(), type.getProperty().getPropertyId(), type.getRoomType(), type.getPrice(), type.getAreaSqm(), type.getServicePrice(), type.getDescription(), type.getCapacity(), type.getDeposit(), type.getImageUrl(), amenities, type.getElectricityPrice(), type.getWaterPrice(), type.getInternetPrice(), physical.size(), (int)physical.stream().filter(room->"VACANT".equals(room.getStatus())).count(), type.getCreatedAt(), images.findByRoomType_RoomTypeIdOrderByImageIdAsc(type.getRoomTypeId()).stream().map(row -> new HostRoomTypesResponse.Image(row.getImageId(), row.getFileName())).toList(),physical.stream().map(roomMapper::summary).toList());
    }

    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public RoomTypeSummary create(RoomTypeRequest value) {
        return save(value, null, List.of());
    }

    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED, rollbackFor = Exception.class)
    public RoomTypeSummary save(RoomTypeRequest value, Integer id, List<MultipartFile> photos) {
        var owner = users.findForRegistrationUpdate(authService.getCurrentUser().getUserId()).orElseThrow();
        var property = properties.findByOwner_UserIdOrderByPropertyIdAsc(owner.getUserId()).stream().filter(row -> row.getPropertyId().equals(value.propertyId())).findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Bạn không có quyền tạo loại phòng cho nhà trọ này."));
        if (!"ACTIVE".equalsIgnoreCase(property.getStatus()) || (property.getRegistration() != null && property.getRegistration().getStatus() != RegistrationStatus.APPROVED)) throw new AppException("Nhà trọ phải được phê duyệt và đang hoạt động trước khi tạo loại phòng.", HttpStatus.CONFLICT);
        String name = value.roomType().trim();
        if (name.length() < 3) throw new BadRequestException("Tên loại phòng cần từ 3 đến 100 ký tự.");
        var type = id == null ? RoomType.builder().property(property).build() : owned(id);
        if (!type.getProperty().getPropertyId().equals(property.getPropertyId())) throw new BadRequestException("Không thể chuyển loại phòng sang nhà trọ khác.");
        if (id == null ? roomTypes.existsByProperty_PropertyIdAndRoomTypeIgnoreCase(property.getPropertyId(), name) : roomTypes.existsByProperty_PropertyIdAndRoomTypeIgnoreCaseAndRoomTypeIdNot(property.getPropertyId(), name, id)) throw new AppException("Tên loại phòng đã tồn tại trong nhà trọ.", HttpStatus.CONFLICT);
        if (value.amenities().stream().anyMatch(key -> !AMENITIES.contains(key)) || value.amenities().stream().distinct().count() != value.amenities().size()) throw new BadRequestException("Tiện nghi không hợp lệ hoặc bị lặp.");
        String image = value.imageUrl() == null ? "" : value.imageUrl().trim();
        if (!image.isEmpty()) try {
            var url = java.net.URI.create(image);
            if (!"https".equalsIgnoreCase(url.getScheme()) || url.getHost() == null || url.getRawUserInfo() != null) throw new IllegalArgumentException();
        } catch (IllegalArgumentException error) { throw new BadRequestException("Hình ảnh phải là đường dẫn HTTPS hợp lệ."); }
        var existing = id == null ? List.<RoomTypeImageRepository.Metadata>of() : images.findByRoomType_RoomTypeIdOrderByImageIdAsc(id);
        var keep = value.retainedImageIds() == null ? existing.stream().map(RoomTypeImageRepository.Metadata::getImageId).toList() : value.retainedImageIds();
        if (keep.stream().distinct().count() != keep.size() || keep.stream().anyMatch(key -> existing.stream().noneMatch(row -> key.equals(row.getImageId())))) throw new BadRequestException("Ảnh giữ lại không thuộc loại phòng này.");
        var uploads = photos == null ? List.<MultipartFile>of() : photos;
        if (keep.size() + uploads.size() > 10) throw new BadRequestException("Mỗi loại phòng được tối đa 10 ảnh.");
        type.setRoomType(name);type.setPrice(value.price());type.setAreaSqm(value.areaSqm().floatValue());type.setCapacity(value.capacity());
        type.setDeposit(value.deposit() == null ? value.price() : value.deposit());type.setImageUrl(image.isEmpty() ? null : image);
        type.setDescription(value.description() == null ? null : value.description().trim());type.setAmenitiesJson(json.writeValueAsString(value.amenities()));
        type.setElectricityPrice(value.electricityPrice());type.setWaterPrice(value.waterPrice());type.setInternetPrice(value.internetPrice());type.setServicePrice(value.servicePrice());
        roomTypes.saveAndFlush(type);
        for (var row : existing) if (!keep.contains(row.getImageId())) images.deleteById(row.getImageId());
        for (var upload : uploads) saveImage(type, upload);
        images.flush();
        return summary(type);
    }

    private RoomType owned(Integer id) {
        return roomTypes.findById(id).filter(type -> type.getProperty().getOwner().getUserId().equals(authService.getCurrentUser().getUserId()))
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy loại phòng trong nhà trọ của bạn."));
    }
    @Transactional(readOnly = true)
    public RoomTypeSummary detail(Integer id) { return summary(owned(id)); }

    public record ImageContent(byte[] bytes, String contentType) {}
    @Transactional(readOnly = true)
    public ImageContent image(Integer id, Integer imageId) {
        owned(id);
        var image = images.findById(imageId).filter(row -> row.getRoomType().getRoomTypeId().equals(id) && row.getFileContent() != null)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ảnh của loại phòng này."));
        return new ImageContent(image.getFileContent(), image.getContentType());
    }
    private void saveImage(RoomType type, MultipartFile file) {
        if (file.isEmpty() || file.getSize() > 5L * 1024 * 1024) throw new BadRequestException("Ảnh rỗng hoặc vượt quá 5 MB.");
        try {
            byte[] bytes = file.getBytes();
            String mime = Objects.toString(file.getContentType(), "");
            boolean valid = switch (mime) {
                case "image/png" -> bytes.length > 8 && java.util.Arrays.equals(java.util.Arrays.copyOf(bytes,8),new byte[]{(byte)137,80,78,71,13,10,26,10});
                case "image/jpeg" -> bytes.length > 3 && (bytes[0]&255)==255 && (bytes[1]&255)==216 && (bytes[2]&255)==255;
                case "image/webp" -> bytes.length > 12 && new String(bytes,0,4,java.nio.charset.StandardCharsets.US_ASCII).equals("RIFF") && new String(bytes,8,4,java.nio.charset.StandardCharsets.US_ASCII).equals("WEBP");
                default -> false;
            };
            if (!valid) throw new BadRequestException("Chỉ nhận ảnh JPG, PNG hoặc WEBP có nội dung hợp lệ.");
            String name = Objects.toString(file.getOriginalFilename(),"anh-loai-phong").replaceAll("[\\p{Cntrl}\\\\/]","_");
            images.save(RoomTypeImage.builder().roomType(type).imageUrl("").fileName(name.substring(0,Math.min(name.length(),200))).contentType(mime).fileContent(bytes).build());
        } catch (IOException error) { throw new BadRequestException("Không đọc được ảnh tải lên."); }
    }
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public void delete(Integer id) {
        users.findForRegistrationUpdate(authService.getCurrentUser().getUserId()).orElseThrow();
        var type = owned(id);
        if (rooms.existsByRoomType_RoomTypeId(id)) throw new AppException("Loại phòng đang có phòng thực tế liên kết, không thể xóa.",HttpStatus.CONFLICT);
        if (bookings.existsByRoomType_RoomTypeId(id)) throw new AppException("Loại phòng đã có lịch hẹn liên quan, không thể xóa để bảo toàn lịch sử.",HttpStatus.CONFLICT);
        images.deleteByRoomType_RoomTypeId(id);videos.deleteByRoomType_RoomTypeId(id);amenityLinks.deleteByRoomType_RoomTypeId(id);wishlists.deleteByRoomType_RoomTypeId(id);
        try { roomTypes.delete(type);roomTypes.flush(); }
        catch (org.springframework.dao.DataIntegrityViolationException error) { throw new AppException("Loại phòng đang có dữ liệu liên quan, không thể xóa. Vui lòng tải lại danh sách.",HttpStatus.CONFLICT); }
    }

    @Transactional(readOnly = true)
    public HostRoomTypesResponse getRoomTypes(Integer propertyId) {
        Integer ownerId = authService.getCurrentUser().getUserId();
        var owned = properties.findByOwner_UserIdOrderByPropertyIdAsc(ownerId);
        if (propertyId != null && owned.stream().noneMatch(property -> propertyId.equals(property.getPropertyId()))) {
            throw new ResourceNotFoundException("Không tìm thấy nhà trọ trong danh sách bạn được phép quản lý");
        }
        var summaries = owned.stream().map(property -> new PropertySummary(property.getPropertyId(), property.getName(), property.getAddress(), property.getStatus())).toList();
        var types = roomTypes.findByProperty_Owner_UserId(ownerId).stream()
                .filter(type -> propertyId == null || propertyId.equals(type.getProperty().getPropertyId()))
                .map(this::summary).toList();
        return new HostRoomTypesResponse(summaries,
                registrations.countByUser_UserIdAndStatus(ownerId, RegistrationStatus.PENDING) + registrations.countByUser_UserIdAndStatus(ownerId, RegistrationStatus.NEEDS_SUPPLEMENT), types);
    }
}
