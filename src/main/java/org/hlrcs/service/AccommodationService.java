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
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.text.Normalizer;
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
    private static final Set<String> COMMON_AMENITIES = Set.of("elevator", "fingerprint", "camera",
            "flexibleHours", "fireSafety", "separateOwner");
    private static final int RECOMMENDATION_BATCH_SIZE = 100;

    public AccommodationPage list(int page, int size, String q, String location, String price, String sort, String type,
                                  String amenities, boolean availableOnly, SearchOrigin origin, Double radiusKm) {
        if (page < 0 || size < 1 || size > 50) throw new BadRequestException("Trang phải từ 0; kích thước trang từ 1 đến 50.");
        var filter = searchFilters(q, location, price, type, amenities, availableOnly);
        if (radiusKm != null) {
            // Coordinates live in the approved registration JSON. Calculate each public property once.
            var included = properties.findPublicProfiles().stream().filter(profile -> {
                var distance = distance(origin, publishedCoordinates(profile.getDetails()));
                return distance != null && distance <= radiusKm + 1e-9;
            }).map(PropertyRepository.PublicProfile::getPropertyId).toList();
            filter = filter.and((root, query, cb) -> included.isEmpty() ? cb.disjunction()
                    : root.get("property").get("propertyId").in(included));
        }
        if ("nearest".equals(sort)) {
            if (origin == null) throw new BadRequestException("Cần chọn điểm gốc để sắp xếp gần nhất.");
            var distances = new HashMap<Integer, Double>();
            var matches = roomTypes.findAll(filter, Pageable.unpaged()).getContent();
            var ordered = matches.stream().sorted(Comparator
                    .comparing((RoomType room) -> {
                        var property = room.getProperty();
                        return distances.computeIfAbsent(property.getPropertyId(), id -> Optional
                                .ofNullable(distance(origin, publishedCoordinates(property.getRegistration().getRegistrationDetails())))
                                .orElse(Double.POSITIVE_INFINITY));
                    }).thenComparing(RoomType::getRoomTypeId)).toList();
            int start = (int) Math.min((long) page * size, ordered.size());
            int end = start + Math.min(size, ordered.size() - start);
            int totalPages = (int) ((ordered.size() + (long) size - 1) / size);
            return new AccommodationPage(summaries(ordered.subList(start, end), origin), page, size, ordered.size(), totalPages);
        }
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
        return new AccommodationPage(summaries(result.getContent(), origin), result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages());
    }

    public List<AccommodationRecommendationService.Item> recommendationMatches(AccommodationRecommendationService.Criteria criteria) {
        var eligible = searchFilters("", "all", "all", "all", "", true);
        var page = PageRequest.of(0, RECOMMENDATION_BATCH_SIZE, Sort.by("roomTypeId"));
        var profiles = new HashMap<Integer, RecommendationProperty>();
        boolean needsProfile = criteria.hasLocation() || criteria.amenities().stream().anyMatch(AccommodationService::sharedAmenity);
        var now = java.time.Instant.now();
        var order = Comparator.comparingInt((RankedRoom room) -> room.match().matchedCriteria().size()).reversed()
                .thenComparing(room -> !"CURRENT".equals(AvailabilityFreshness.status(room.type().getAvailabilityConfirmedAt(), now)))
                .thenComparing(room -> room.type().getPrice()).thenComparing(room -> room.type().getRoomTypeId());
        var best = new ArrayList<RankedRoom>();
        int previousId = 0;
        while (true) {
            int cursor = previousId;
            var batch = roomTypes.findAll(eligible.and((root, query, cb) -> cb.gt(root.get("roomTypeId"), cursor)), page).getContent();
            for (var type : batch) {
                var property = type.getProperty();
                var profile = needsProfile ? profiles.computeIfAbsent(property.getPropertyId(), id -> {
                    var approved = publishedProfile(property.getRegistration().getRegistrationDetails());
                    var commune = approved == null ? null : approved.commune();
                    return new RecommendationProperty(
                            normalized(commune == null || commune.isBlank() ? property.getAddress() : commune),
                            approved == null || approved.amenities() == null ? List.of() : approved.amenities());
                }) : null;
                var match = recommendationMatch(type, criteria, profile);
                if (!match.matchedCriteria().isEmpty()) best.add(new RankedRoom(type, match));
            }
            best.sort(order);
            if (best.size() > AccommodationRecommendationService.MAX_RESULTS) {
                best.subList(AccommodationRecommendationService.MAX_RESULTS, best.size()).clear();
            }
            if (batch.size() < RECOMMENDATION_BATCH_SIZE) break;
            previousId = batch.get(batch.size() - 1).getRoomTypeId();
        }
        var matches = best.stream().collect(Collectors.toMap(room -> room.type().getRoomTypeId(), RankedRoom::match));
        return summaries(best.stream().map(RankedRoom::type).toList()).stream()
                .filter(room -> room.availableRooms() > 0)
                .map(room -> new AccommodationRecommendationService.Item(room, matches.get(room.roomTypeId()))).toList();
    }

    private record RankedRoom(RoomType type, AccommodationRecommendationService.Match match) {}
    private record RecommendationProperty(String area, List<String> amenities) {}

    private AccommodationRecommendationService.Match recommendationMatch(RoomType type,
            AccommodationRecommendationService.Criteria criteria, RecommendationProperty profile) {
        var checks = new LinkedHashMap<String, Boolean>();
        if (criteria.hasLocation()) checks.put("location", profile.area().contains(normalized(LOCATIONS.get(criteria.location()))));
        if (criteria.hasBudget()) checks.put("budget", (criteria.minBudget() == null || type.getPrice().compareTo(criteria.minBudget()) >= 0)
                && (criteria.maxBudget() == null || type.getPrice().compareTo(criteria.maxBudget()) <= 0));
        var roomAmenities = criteria.amenities().isEmpty() && !criteria.hasRoomType() ? List.<String>of() : roomAmenities(type);
        if (criteria.hasRoomType()) {
            var name = normalized(type.getRoomType());
            checks.put("roomType", switch (criteria.roomType()) {
                case "gac-lung" -> (" " + name + " ").contains(" gac ") || roomAmenities.contains("loft");
                case "chung-cu-mini" -> name.contains("chung cu mini") || name.contains("studio");
                default -> name.contains("khep kin") || roomAmenities.contains("privateBathroom");
            });
        }
        if (criteria.minCapacity() != null) checks.put("capacity", type.getCapacity() != null && type.getCapacity() >= criteria.minCapacity());
        if (criteria.minAreaSqm() != null) checks.put("area", Float.isFinite(type.getAreaSqm())
                && new BigDecimal(type.getAreaSqm().toString()).compareTo(criteria.minAreaSqm()) >= 0);
        for (String key : criteria.amenities()) {
            checks.put(key, roomAmenities.contains(key) || sharedAmenity(key)
                    && profile.amenities().contains("washingMachine".equals(key) ? "laundry" : key));
        }
        var matched = checks.keySet().stream().filter(checks::get).toList();
        var unmatched = checks.keySet().stream().filter(key -> !checks.get(key)).toList();
        var score = BigDecimal.valueOf(10L * matched.size()).divide(BigDecimal.valueOf(checks.size()), 1, RoundingMode.HALF_UP);
        return new AccommodationRecommendationService.Match(score, matched, unmatched);
    }

    private static String normalized(String value) {
        return Normalizer.normalize(Objects.toString(value, ""), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "").toLowerCase(Locale.ROOT).replace('đ', 'd');
    }

    private static boolean sharedAmenity(String key) {
        return COMMON_AMENITIES.contains(key) || "washingMachine".equals(key);
    }

    private PropertyRegistrationRequest publishedProfile(String details) {
        if (details == null) return null;
        try {
            return json.readValue(details, PropertyRegistrationRequest.class);
        } catch (tools.jackson.core.JacksonException ignored) {
            return null;
        }
    }

    private Specification<RoomType> searchFilters(String q, String location, String price, String type,
                                                   String amenities, boolean availableOnly) {
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
            vacant.select(cb.literal(1)).where(cb.equal(room.get("roomType"), root), cb.equal(room.get("property"), root.get("property")), cb.equal(room.get("status"), "VACANT"), cb.isTrue(room.get("publicVisible")));
            return cb.exists(vacant);
        });
        return filter;
    }

    private List<String> roomAmenities(RoomType type) {
        if (type.getAmenitiesJson() == null) return List.of();
        try {
            var amenities = json.readValue(type.getAmenitiesJson(), String[].class);
            return amenities == null ? List.of() : Arrays.asList(amenities);
        }
        catch (tools.jackson.core.JacksonException ignored) { return List.of(); }
    }

    private Specification<RoomType> amenityFilter(String value) {
        Set<String> roomKeys = Set.of("airConditioner","waterHeater","washingMachine","balcony","refrigerator","kitchen");
        var commonKeys = COMMON_AMENITIES;
        var keys = value.isBlank() ? List.<String>of() : Arrays.asList(value.split(",",-1));
        if(keys.size()>12 || keys.stream().anyMatch(key -> !roomKeys.contains(key) && !commonKeys.contains(key)))
            throw new BadRequestException("Tiện nghi tìm kiếm không hợp lệ.");
        var commonMatches = new HashMap<String,List<Integer>>();
        if(keys.stream().anyMatch(AccommodationService::sharedAmenity)) {
            for(var profile:properties.findPublicProfiles()) {
                var approved = publishedProfile(profile.getDetails());
                var declared = approved == null || approved.amenities() == null ? List.<String>of() : approved.amenities();
                for(var key:keys) if(declared.contains("washingMachine".equals(key)?"laundry":key))
                    commonMatches.computeIfAbsent(key,ignored -> new ArrayList<>()).add(profile.getPropertyId());
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

    public AccommodationSummary detail(Integer propertyId, Integer roomTypeId, SearchOrigin origin) {
        return summaries(List.of(publicType(propertyId, roomTypeId)), origin).get(0);
    }

    public AccommodationDetail fullDetail(Integer propertyId, Integer roomTypeId, SearchOrigin origin) {
        var type = publicType(propertyId, roomTypeId);
        var property = type.getProperty();
        var registration = property.getRegistration();
        PropertyRegistrationRequest profile = null;
        if (registration.getRegistrationDetails() != null) {
            try { profile = json.readValue(registration.getRegistrationDetails(), PropertyRegistrationRequest.class); }
            catch (tools.jackson.core.JacksonException ignored) { /* Legacy registrations may have no structured fields. */ }
        }
        var summary = summaries(List.of(type), origin).get(0);
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

    public List<AccommodationSummary> publicSummaries(Collection<Integer> ids) {
        if (ids.isEmpty()) return List.of();
        return summaries(roomTypes.findAll(PublicAccommodationPolicy.visible().and((root, query, cb) -> root.get("roomTypeId").in(ids))));
    }

    private List<AccommodationSummary> summaries(List<RoomType> types) {
        return summaries(types, null);
    }

    private List<AccommodationSummary> summaries(List<RoomType> types, SearchOrigin origin) {
        if (types.isEmpty()) return List.of();
        var ids = types.stream().map(RoomType::getRoomTypeId).toList();
        var vacancies = rooms.countPublicVacancies(ids).stream().collect(Collectors.toMap(
                RoomRepository.VacancyCount::getRoomTypeId, RoomRepository.VacancyCount::getAvailableRooms));
        var covers = coverImages(types);
        return types.stream().map(type -> {
            var property = type.getProperty();
            String imageUrl = covers.get(type.getRoomTypeId());
            var coordinates = publishedCoordinates(property.getRegistration().getRegistrationDetails());
            var freshness = AvailabilityFreshness.status(type.getAvailabilityConfirmedAt());
            return new AccommodationSummary(property.getPropertyId(), type.getRoomTypeId(), property.getName(), type.getRoomType(),
                    property.getAddress(), imageUrl, type.getPrice(), type.getAreaSqm(), "APPROVED", vacancies.getOrDefault(type.getRoomTypeId(), 0L),
                    type.getCapacity(), roomAmenities(type), type.getElectricityPrice(), type.getWaterPrice(), coordinates[0], coordinates[1],type.getAvailabilityConfirmedAt(),freshness,"STALE".equals(freshness),distance(origin,coordinates));
        }).toList();
    }

    /** Read only the approved registration, never a pending location change. */
    private BigDecimal[] publishedCoordinates(String details) {
        try {
            if (details != null) {
                var profile = json.readValue(details, PropertyRegistrationRequest.class);
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

    public Map<Integer, String> publicCoverImages(List<Integer> ids) {
        if (ids.isEmpty()) return Map.of();
        return coverImages(roomTypes.findAll(PublicAccommodationPolicy.visible().and(
                (root, query, cb) -> root.get("roomTypeId").in(ids))));
    }

    private Map<Integer, String> coverImages(List<RoomType> types) {
        if (types.isEmpty()) return Map.of();
        var ids = types.stream().map(RoomType::getRoomTypeId).toList();
        Map<Integer, Integer> coverIds = new HashMap<>();
        for (var image : images.findPublicImageMetadata(ids)) {
            if (IMAGE_TYPES.contains(Objects.toString(image.getContentType(), ""))) coverIds.putIfAbsent(image.getRoomTypeId(), image.getImageId());
        }
        Map<Integer, String> covers = new HashMap<>();
        for (var type : types) {
            int id = type.getRoomTypeId();
            var coverId = coverIds.get(id);
            String url = coverId == null ? safeImageUrl(type.getImageUrl())
                    : "/api/properties/" + type.getProperty().getPropertyId()
                            + "/room-types/" + id + "/images/" + coverId;
            if (url != null) covers.put(id, url);
        }
        return covers;
    }

    private static Double distance(SearchOrigin origin, BigDecimal[] coordinates) {
        return origin == null || coordinates[0] == null ? null
                : origin.distanceKm(coordinates[0].doubleValue(), coordinates[1].doubleValue());
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
