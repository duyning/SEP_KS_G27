package org.hlrcs.service;

import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.response.AccommodationPage;
import org.hlrcs.dto.response.AccommodationSummary;
import org.hlrcs.dto.response.AccommodationDetail;
import org.hlrcs.dto.request.PropertyRegistrationRequest;
import org.hlrcs.entity.RoomType;
import org.hlrcs.exception.BadRequestException;
import org.hlrcs.exception.ResourceNotFoundException;
import org.hlrcs.repository.RoomRepository;
import org.hlrcs.repository.RoomTypeImageRepository;
import org.hlrcs.repository.RoomTypeRepository;
import org.hlrcs.repository.FeedbackRepository;
import org.hlrcs.repository.PropertyDocumentRepository;
import org.hlrcs.repository.PropertyRepository;
import tools.jackson.databind.ObjectMapper;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.net.URI;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AccommodationService {
    private final RoomTypeRepository roomTypes;
    private final RoomRepository rooms;
    private final RoomTypeImageRepository images;
    private final FeedbackRepository feedbacks;
    private final ObjectMapper json;
    private final PropertyDocumentRepository documents;
    private final PropertyRepository properties;
    private static final Set<String> IMAGE_TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    private static final Map<String, String> LOCATIONS = Map.of(
            "tan-xa", "Tân Xã", "thach-hoa", "Thạch Hòa", "binh-yen", "Bình Yên", "cnc", "công nghệ cao");
    private static final Map<String, String> TYPES = Map.of(
            "khep-kin", "khép kín", "gac-lung", "gác", "chung-cu-mini", "chung cư mini");

    public AccommodationPage list(int page, int size, String q, String location, String price, String sort, String type,
                                  String amenities, boolean availableOnly) {
        if (page < 0 || size < 1 || size > 50) throw new BadRequestException("Trang phải từ 0; kích thước trang từ 1 đến 50.");
        if (q.length() > 200) throw new BadRequestException("Từ khóa tối đa 200 ký tự.");
        Specification<RoomType> filter = PublicAccommodationPolicy.visible();
        if (!q.isBlank()) filter = filter.and((root, query, cb) -> {
            var property = root.get("property");
            String pattern = contains(q.trim());
            return cb.or(cb.like(cb.lower(property.get("name")), pattern, '\\'),
                    cb.like(cb.lower(property.get("address")), pattern, '\\'),
                    cb.like(cb.lower(root.get("roomType")), pattern, '\\'));
        });
        if (!"all".equals(location)) {
            String value = LOCATIONS.get(location);
            if (value == null) throw new BadRequestException("Khu vực không hợp lệ.");
            filter = filter.and((root, query, cb) -> cb.like(cb.lower(root.get("property").get("address")), contains(value), '\\'));
        }
        if (!"all".equals(type)) {
            String value = TYPES.get(type);
            if (value == null) throw new BadRequestException("Loại phòng không hợp lệ.");
            filter = filter.and((root, query, cb) -> {
                var name = cb.lower(root.<String>get("roomType"));
                var matches = cb.like(name, contains(value), '\\');
                return "gac-lung".equals(type) ? cb.or(matches, cb.like(name, contains("xép"), '\\')) : matches;
            });
        }
        filter = filter.and(priceFilter(price));
        filter = filter.and(amenityFilter(amenities));
        if (availableOnly) filter = filter.and((root, query, cb) -> {
            var vacant = query.subquery(Integer.class);
            var room = vacant.from(org.hlrcs.entity.Room.class);
            vacant.select(cb.literal(1)).where(cb.equal(room.get("roomType"), root), cb.equal(room.get("status"), "VACANT"));
            return cb.exists(vacant);
        });
        if ("rating-desc".equals(sort)) filter = filter.and((root, query, cb) -> {
            if (query.getResultType() != Long.class && query.getResultType() != long.class) {
                var rating = query.subquery(Double.class);
                var review = rating.from(org.hlrcs.entity.Feedback.class);
                rating.select(cb.avg(review.get("rating"))).where(
                        cb.equal(review.get("property"),root.get("property")),
                        cb.equal(review.get("user").get("status"),org.hlrcs.entity.enums.UserStatus.ACTIVE),
                        cb.between(review.get("rating"),1,5));
                query.orderBy(cb.desc(cb.coalesce(rating,0.0)),cb.desc(root.get("roomTypeId")));
            }
            return cb.conjunction();
        });
        Sort ordering = switch (sort) {
            case "recommended", "newest" -> Sort.by(Sort.Direction.DESC, "roomTypeId");
            case "price-asc" -> Sort.by("price").and(Sort.by("roomTypeId"));
            case "price-desc" -> Sort.by(Sort.Direction.DESC, "price").and(Sort.by("roomTypeId"));
            case "area-desc" -> Sort.by(Sort.Direction.DESC, "areaSqm").and(Sort.by("roomTypeId"));
            case "rating-desc" -> Sort.unsorted();
            default -> throw new BadRequestException("Cách sắp xếp không hợp lệ.");
        };
        var result = roomTypes.findAll(filter, PageRequest.of(page, size, ordering));
        return new AccommodationPage(summaries(result.getContent()), result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages());
    }

    private List<String> roomAmenities(RoomType type) {
        if (type.getAmenitiesJson() == null) return List.of();
        try { return Arrays.asList(json.readValue(type.getAmenitiesJson(), String[].class)); }
        catch (tools.jackson.core.JacksonException ignored) { return List.of(); }
    }

    private Specification<RoomType> amenityFilter(String value) {
        Set<String> roomKeys = Set.of("airConditioner","waterHeater","washingMachine","balcony","refrigerator","kitchen");
        Set<String> commonKeys = Set.of("elevator","fingerprint","camera","flexibleHours","fireSafety","separateOwner");
        var keys = value.isBlank() ? List.<String>of() : Arrays.asList(value.split(",",-1));
        if(keys.size()>12 || keys.stream().anyMatch(key -> !roomKeys.contains(key) && !commonKeys.contains(key)))
            throw new BadRequestException("Tiện nghi tìm kiếm không hợp lệ.");
        var commonMatches = new HashMap<String,List<Integer>>();
        if(keys.stream().anyMatch(key -> commonKeys.contains(key) || "washingMachine".equals(key))) {
            for(var profile:properties.findPublicProfiles()) {
                if(profile.getDetails()==null) continue;
                try {
                    var form=json.readValue(profile.getDetails(),PropertyRegistrationRequest.class);
                    var declared=form.amenities()==null?List.<String>of():form.amenities();
                    for(var key:keys) if(declared.contains("washingMachine".equals(key)?"laundry":key))
                        commonMatches.computeIfAbsent(key,ignored -> new ArrayList<>()).add(profile.getPropertyId());
                } catch (tools.jackson.core.JacksonException ignored) { /* No invented amenities for legacy records. */ }
            }
        }
        return (root,query,cb) -> {
            var predicates=new ArrayList<jakarta.persistence.criteria.Predicate>();
            for(var key:keys) {
                var room=roomKeys.contains(key)?cb.like(root.get("amenitiesJson"),"%\""+key+"\"%"):cb.disjunction();
                var ids=commonMatches.getOrDefault(key,List.of());
                predicates.add(ids.isEmpty()?room:cb.or(room,root.get("property").get("propertyId").in(ids)));
            }
            return cb.and(predicates.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
    }

    private Specification<RoomType> priceFilter(String price) {
        return switch (price) {
            case "all" -> (root, query, cb) -> cb.conjunction();
            case "under-15" -> (root, query, cb) -> cb.lessThan(root.get("price"), new BigDecimal("1500000"));
            case "15-25" -> (root, query, cb) -> cb.between(root.get("price"), new BigDecimal("1500000"), new BigDecimal("2500000"));
            case "25-35" -> (root, query, cb) -> cb.and(cb.greaterThan(root.get("price"), new BigDecimal("2500000")), cb.lessThanOrEqualTo(root.get("price"), new BigDecimal("3500000")));
            case "above-35" -> (root, query, cb) -> cb.greaterThan(root.get("price"), new BigDecimal("3500000"));
            default -> throw new BadRequestException("Khoảng giá không hợp lệ.");
        };
    }

    private static String contains(String value) {
        return "%" + value.toLowerCase(Locale.ROOT).replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
    }

    private RoomType publicType(Integer propertyId, Integer roomTypeId) {
        return roomTypes.findOne(PublicAccommodationPolicy.visible().and((root, query, cb) -> cb.and(
                cb.equal(root.get("roomTypeId"), roomTypeId), cb.equal(root.get("property").get("propertyId"), propertyId))))
                .orElseThrow(() -> new ResourceNotFoundException("Nhà trọ hoặc loại phòng không còn được công khai."));
    }

    public AccommodationSummary detail(Integer propertyId, Integer roomTypeId) {
        return summaries(List.of(publicType(propertyId, roomTypeId))).get(0);
    }

    public AccommodationDetail fullDetail(Integer propertyId, Integer roomTypeId) {
        var type = publicType(propertyId, roomTypeId);
        var property = type.getProperty();
        var registration = property.getRegistration();
        PropertyRegistrationRequest profile = null;
        if (registration.getRegistrationDetails() != null) {
            try { profile = json.readValue(registration.getRegistrationDetails(), PropertyRegistrationRequest.class); }
            catch (tools.jackson.core.JacksonException ignored) { /* Legacy registrations may have no structured fields. */ }
        }
        var summary = summaries(List.of(type)).get(0);
        Map<String, AccommodationDetail.Photo> gallery = new LinkedHashMap<>();
        for (var image : images.findPublicImageMetadata(List.of(roomTypeId))) {
            String url = IMAGE_TYPES.contains(Objects.toString(image.getContentType(), ""))
                    ? "/api/properties/" + propertyId + "/room-types/" + roomTypeId + "/images/" + image.getImageId()
                    : safeImageUrl(image.getImageUrl());
            if (url != null) gallery.putIfAbsent(url, new AccommodationDetail.Photo(url, type.getRoomType()));
        }
        if (gallery.isEmpty() && summary.imageUrl() != null) {
            gallery.put(summary.imageUrl(), new AccommodationDetail.Photo(summary.imageUrl(), type.getRoomType()));
        }
        List<String> amenities = List.of();
        if (type.getAmenitiesJson() != null) {
            try { amenities = Arrays.asList(json.readValue(type.getAmenitiesJson(), String[].class)); }
            catch (tools.jackson.core.JacksonException ignored) { /* Missing legacy amenities are not invented. */ }
        }
        String address = Objects.toString(property.getAddress(), "");
        String mapUrl = address.isBlank() ? null : "https://www.google.com/maps/search/?api=1&query="
                + java.net.URLEncoder.encode(address, java.nio.charset.StandardCharsets.UTF_8);
        if (summary.latitude() != null && summary.longitude() != null)
            mapUrl = "https://www.google.com/maps/dir/?api=1&destination="
                    + summary.latitude().toPlainString() + "," + summary.longitude().toPlainString();
        var similar = roomTypes.findAll(PublicAccommodationPolicy.visible().and((root, query, cb) ->
                cb.notEqual(root.get("property").get("propertyId"), propertyId)), PageRequest.of(0, 3, Sort.by(Sort.Direction.DESC, "roomTypeId")));
        return new AccommodationDetail(summary, gallery.values().stream().limit(10).toList(), type.getCapacity(), type.getDeposit(),
                type.getElectricityPrice(), type.getWaterPrice(), type.getInternetPrice(), type.getServicePrice(),
                type.getDescription(), profile != null && profile.description() != null ? profile.description() : property.getDescription(),
                amenities, profile == null || profile.amenities() == null ? List.of() : profile.amenities(),
                profile == null || profile.selectedRules() == null ? List.of() : profile.selectedRules(), profile == null ? null : profile.rules(),
                registration.getReviewedAt(), mapUrl, profile == null ? null : profile.nearby(),
                reviews(propertyId), summaries(similar.getContent()), publicContact(profile),
                documents.findByRegistration_RegistrationIdOrderByDocumentIdAsc(registration.getRegistrationId()).stream()
                        .filter(file -> Objects.toString(file.getDocumentType(), "").matches("PHOTO_\\d+")
                                && IMAGE_TYPES.contains(Objects.toString(file.getContentType(), "")))
                        .map(file -> new AccommodationDetail.Photo("/api/public/properties/photos/" + file.getDocumentId(), property.getName()))
                        .toList(),
                summaries(roomTypes.findAll(PublicAccommodationPolicy.visible().and((root, query, cb) ->
                        cb.equal(root.get("property").get("propertyId"), propertyId)), Sort.by("price", "roomTypeId"))));
    }

    /** Only the property registration's contact fields are approved for public use; never fall back to User.phoneNumber. */
    private AccommodationDetail.PublicContact publicContact(PropertyRegistrationRequest profile) {
        if (profile == null) return null;
        String phone = publicPhone(profile.contactPhone());
        String zalo = publicPhone(profile.zaloPhone());
        return phone == null && zalo == null ? null : new AccommodationDetail.PublicContact(phone, zalo, profile.managerName());
    }

    private String publicPhone(String value) {
        if (value == null) return null;
        String normalized = value.replaceAll("[\\s.()-]", "");
        return normalized.matches("(?:0|\\+84)[35789]\\d{8}") ? normalized : null;
    }

    private AccommodationDetail.ReviewSummary reviews(Integer propertyId) {
        var counts = new ArrayList<>(Collections.nCopies(5, 0L));
        long total = 0, weighted = 0;
        for (var count : feedbacks.publicRatingCounts(propertyId)) {
            counts.set(count.getRating() - 1, count.getTotal());
            total += count.getTotal(); weighted += count.getRating() * count.getTotal();
        }
        var latest = feedbacks.publicLatest(propertyId, PageRequest.of(0, 3, Sort.by(Sort.Direction.DESC, "createdAt", "feedbackId")))
                .stream().map(review -> new AccommodationDetail.Review(review.getFeedbackId(),
                        review.getUser().getFullName() == null ? "Người dùng" : review.getUser().getFullName(),
                        review.getRating(), review.getContent(), review.getCreatedAt())).toList();
        return new AccommodationDetail.ReviewSummary(total == 0 ? null : Math.round(10.0 * weighted / total) / 10.0, total, counts, latest);
    }

    private List<AccommodationSummary> summaries(List<RoomType> types) {
        if (types.isEmpty()) return List.of();
        var ids = types.stream().map(RoomType::getRoomTypeId).toList();
        var vacancies = rooms.countPublicVacancies(ids).stream().collect(Collectors.toMap(
                RoomRepository.VacancyCount::getRoomTypeId, RoomRepository.VacancyCount::getAvailableRooms));
        Map<Integer, Integer> coverIds = new HashMap<>();
        for (var image : images.findPublicImageMetadata(ids)) {
            if (IMAGE_TYPES.contains(Objects.toString(image.getContentType(), ""))) coverIds.putIfAbsent(image.getRoomTypeId(), image.getImageId());
        }
        return types.stream().map(type -> {
            var property = type.getProperty();
            String imageUrl = safeImageUrl(type.getImageUrl());
            if (coverIds.containsKey(type.getRoomTypeId())) imageUrl = "/api/properties/" + property.getPropertyId()
                    + "/room-types/" + type.getRoomTypeId() + "/images/" + coverIds.get(type.getRoomTypeId());
            var coordinates = publishedCoordinates(property);
            return new AccommodationSummary(property.getPropertyId(), type.getRoomTypeId(), property.getName(), type.getRoomType(),
                    property.getAddress(), imageUrl, type.getPrice(), type.getAreaSqm(), "APPROVED", vacancies.getOrDefault(type.getRoomTypeId(), 0L),
                    type.getCapacity(), roomAmenities(type), type.getElectricityPrice(), type.getWaterPrice(), coordinates[0], coordinates[1]);
        }).toList();
    }

    /** Read only the approved registration, never a pending location change. */
    private BigDecimal[] publishedCoordinates(org.hlrcs.entity.Property property) {
        try {
            var registration = property.getRegistration();
            if (registration != null && registration.getRegistrationDetails() != null) {
                var profile = json.readValue(registration.getRegistrationDetails(), PropertyRegistrationRequest.class);
                var latitude = new BigDecimal(profile.latitude().trim());
                var longitude = new BigDecimal(profile.longitude().trim());
                if (latitude.abs().compareTo(BigDecimal.valueOf(90)) <= 0
                        && longitude.abs().compareTo(BigDecimal.valueOf(180)) <= 0)
                    return new BigDecimal[]{latitude, longitude};
            }
        } catch (tools.jackson.core.JacksonException | IllegalArgumentException | NullPointerException ignored) {
            // Legacy profiles remain public without an invented marker.
        }
        return new BigDecimal[]{null, null};
    }

    private String safeImageUrl(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            var uri = URI.create(value);
            return "https".equalsIgnoreCase(uri.getScheme()) && uri.getHost() != null && uri.getUserInfo() == null ? value : null;
        } catch (IllegalArgumentException ignored) { return null; }
    }

    public record PublicImage(byte[] bytes, String contentType) { }

    public PublicImage image(Integer propertyId, Integer roomTypeId, Integer imageId) {
        publicType(propertyId, roomTypeId);
        var image = images.findById(imageId).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ảnh."));
        if (!image.getRoomType().getRoomTypeId().equals(roomTypeId) || image.getFileContent() == null
                || !IMAGE_TYPES.contains(Objects.toString(image.getContentType(), ""))) {
            throw new ResourceNotFoundException("Không tìm thấy ảnh.");
        }
        return new PublicImage(image.getFileContent(), image.getContentType());
    }
}
