package org.hlrcs;

import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.*;
import org.hlrcs.repository.*;
import org.hlrcs.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.test.context.ActiveProfiles;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.datasource.url=jdbc:h2:mem:hlrcs-favorites-isolated;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa", "spring.datasource.password=", "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop"})
@ActiveProfiles("test")
class AccommodationTests {
    @Autowired Environment environment;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired PropertyRepository properties;
    @Autowired PropertyRegistrationRepository registrations;
    @Autowired RoomTypeRepository types;
    @Autowired RoomRepository rooms;
    @Autowired RoomTypeImageRepository images;
    @Autowired FeedbackRepository feedbacks;
    @Autowired PropertyDocumentRepository documents;
    @Autowired JwtTokenProvider jwt;
    private final HttpClient client = HttpClient.newHttpClient();
    private String prefix;
    private User host;

    @BeforeEach void setup() {
        prefix = "public-" + UUID.randomUUID();
        host = users.save(User.builder().email(prefix + "@test.local").passwordHash("unused")
                .fullName("Public host").role(UserRole.ROOM_HOST).status(UserStatus.ACTIVE).build());
    }

    private Property property(String state, RegistrationStatus approval) {
        PropertyRegistration registration = approval == null ? null : registrations.save(PropertyRegistration.builder()
                .user(host).name(prefix).address("Tân Xã, Hòa Lạc").status(approval).build());
        return properties.save(Property.builder().owner(host).registration(registration).name(prefix)
                .address("Tân Xã, Hòa Lạc").status(state).build());
    }
    private RoomType type(Property property, int price) {
        return types.save(RoomType.builder().property(property).roomType("Studio khép kín " + prefix)
                .price(BigDecimal.valueOf(price)).areaSqm(25F).build());
    }
    private void room(RoomType type, String number, String status) {
        rooms.save(Room.builder().property(type.getProperty()).roomType(type).roomNumber(number).floor("1").status(status).build());
    }
    private HttpResponse<String> get(String path, String token) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + environment.getProperty("local.server.port") + path));
        if (token != null) request.header("Authorization", "Bearer " + token);
        return client.send(request.GET().build(), HttpResponse.BodyHandlers.ofString());
    }
    private String listUrl(String extra) {
        return "/api/properties/search?q=" + URLEncoder.encode(prefix, StandardCharsets.UTF_8) + extra;
    }
    private JsonNode list(String extra) throws Exception {
        var response = get(listUrl(extra), null);
        assertEquals(200, response.statusCode(), response.body());
        return json.readTree(response.body()).path("data");
    }
    private String detailUrl(RoomType type) {
        return "/api/properties/" + type.getProperty().getPropertyId() + "/room-types/" + type.getRoomTypeId();
    }

    @Test void mapCoordinatesComeFromApprovedProfileAndRemainOptionalForLegacyData() throws Exception {
        var property = property("ACTIVE", RegistrationStatus.APPROVED);
        var type = type(property, 2000000);
        var registration = property.getRegistration();
        for (var pair : List.of(new String[]{"21.018812", "105.521512"}, new String[]{"0", "0"}, new String[]{"-90", "180"})) {
            registration.setRegistrationDetails(json.writeValueAsString(Map.of("latitude", pair[0], "longitude", pair[1])));
            registrations.save(registration);
            var item = list("").path("items").get(0);
            assertEquals(Double.parseDouble(pair[0]), item.path("latitude").asDouble());
            assertEquals(Double.parseDouble(pair[1]), item.path("longitude").asDouble());
            var details = json.readTree(get(detailUrl(type) + "/details", null).body()).path("data").path("summary");
            assertEquals(item.path("latitude"), details.path("latitude"));
            assertEquals(item.path("longitude"), details.path("longitude"));
        }
        // A new unreviewed change must not replace the published location.
        registrations.save(PropertyRegistration.builder().user(host).name(prefix).targetPropertyId(property.getPropertyId())
                .status(RegistrationStatus.PENDING).registrationDetails("{\"latitude\":\"22\",\"longitude\":\"106\"}").build());
        assertEquals(-90, list("").path("items").get(0).path("latitude").asDouble());
        for (var legacy : List.of("{}", "{\"latitude\":\"21\"}", "{\"latitude\":\"91\",\"longitude\":\"105\"}",
                "{\"latitude\":\"NaN\",\"longitude\":\"105\"}", "malformed")) {
            registration.setRegistrationDetails(legacy); registrations.save(registration);
            var item = list("").path("items").get(0);
            assertTrue(item.path("latitude").isNull());
            assertTrue(item.path("longitude").isNull());
            assertEquals(200, get(detailUrl(type), null).statusCode());
        }
    }

    @Test void locationLookupKeepsHostAuthorizationAndValidatesPublicCoordinates() throws Exception {
        assertEquals(400,get("/api/properties/location/nearby?latitude=91&longitude=105",null).statusCode());
        String path="http://127.0.0.1:"+environment.getProperty("local.server.port")+"/api/host/property-registrations/location/resolve";
        var body=HttpRequest.BodyPublishers.ofString("{\"input\":\"https://evil.example/\"}");
        assertEquals(401,client.send(HttpRequest.newBuilder(URI.create(path)).header("Content-Type","application/json").POST(body).build(),HttpResponse.BodyHandlers.ofString()).statusCode());
        var member=users.save(User.builder().email(prefix+"-lookup@test.local").passwordHash("unused").role(UserRole.USER).status(UserStatus.ACTIVE).build());
        assertEquals(403,client.send(HttpRequest.newBuilder(URI.create(path)).header("Content-Type","application/json").header("Authorization","Bearer "+jwt.generateTokenFromUser(member)).POST(body).build(),HttpResponse.BodyHandlers.ofString()).statusCode());
        assertEquals(400,client.send(HttpRequest.newBuilder(URI.create(path)).header("Content-Type","application/json").header("Authorization","Bearer "+jwt.generateTokenFromUser(host)).POST(body).build(),HttpResponse.BodyHandlers.ofString()).statusCode());
    }

    @Test void onlyApprovedActiveCompleteAccommodationIsPublicEvenForMembers() throws Exception {
        var visible = type(property("ACTIVE", RegistrationStatus.APPROVED), 2000000);
        for (var status : List.of(RegistrationStatus.PENDING, RegistrationStatus.REJECTED, RegistrationStatus.NEEDS_SUPPLEMENT)) {
            var unpublished = type(property("ACTIVE", status), 2000000);
            assertEquals(404, get(detailUrl(unpublished), null).statusCode());
        }
        type(property("HIDDEN", RegistrationStatus.APPROVED), 2000000);
        type(property("INACTIVE", RegistrationStatus.APPROVED), 2000000);
        type(property("ACTIVE", null), 2000000);
        var incomplete = type(property("ACTIVE", RegistrationStatus.APPROVED), 2000000);
        incomplete.setAreaSqm(null); types.save(incomplete);
        type(property("ACTIVE", RegistrationStatus.APPROVED), 0);
        var data = list("");
        assertEquals(1, data.path("totalElements").asInt());
        var item = data.path("items").get(0);
        assertEquals(visible.getRoomTypeId().intValue(), item.path("roomTypeId").asInt());
        assertEquals(visible.getProperty().getPropertyId().intValue(), item.path("propertyId").asInt());
        assertEquals(prefix, item.path("propertyName").asString());
        assertEquals("Tân Xã, Hòa Lạc", item.path("address").asString());
        assertEquals("APPROVED", item.path("verificationStatus").asString());
        assertEquals(25, item.path("areaSqm").asInt());
        assertEquals(0, item.path("availableRooms").asInt());
        assertFalse(item.has("owner")); assertFalse(item.has("registrationDetails"));
        var member = users.save(User.builder().email(prefix + "-member@test.local").passwordHash("unused")
                .role(UserRole.USER).status(UserStatus.ACTIVE).build());
        var memberResult = get(listUrl(""), jwt.generateTokenFromUser(member));
        assertEquals(200, memberResult.statusCode());
        assertEquals(data, json.readTree(memberResult.body()).path("data"));
        host.setStatus(UserStatus.INACTIVE); users.save(host);
        assertEquals(0, list("").path("totalElements").asInt());
        assertEquals(404, get(detailUrl(visible), null).statusCode());
    }

    @Test void databasePaginationIsStableAndCountsVacanciesWithoutDuplicateRows() throws Exception {
        var property = property("ACTIVE", RegistrationStatus.APPROVED);
        var expected = new ArrayList<Integer>();
        RoomType first = null;
        for (int index = 0; index < 8; index++) {
            var type = type(property, 2000000);
            if (first == null) first = type;
            expected.add(type.getRoomTypeId());
        }
        room(first, "101", "VACANT"); room(first, "102", "VACANT"); room(first, "103", "OCCUPIED"); room(first, "104", "MAINTENANCE");
        for (int i = 0; i < 3; i++) images.save(RoomTypeImage.builder().roomType(first).imageUrl("")
                .contentType("image/png").fileContent(new byte[]{1,2,3}).build());
        var actual = new ArrayList<Integer>();
        for (int page = 0; page < 4; page++) {
            var result = list("&page=" + page + "&size=2&sort=price-asc");
            assertEquals(8, result.path("totalElements").asInt());
            assertEquals(4, result.path("totalPages").asInt());
            assertEquals(page, result.path("page").asInt());
            assertEquals(2, result.path("items").size());
            for (var item : result.path("items")) actual.add(item.path("roomTypeId").asInt());
            if (page == 0) assertEquals(2, result.path("items").get(0).path("availableRooms").asInt());
        }
        assertEquals(expected, actual);
        assertEquals(0, list("&page=99&size=2").path("items").size());
        assertEquals(8, list("&page=99&size=2").path("totalElements").asInt());
    }

    @Test void imagesAndSummaryRecheckVisibilityAndCannotReadAnotherTypesImage() throws Exception {
        var property = property("ACTIVE", RegistrationStatus.APPROVED);
        var type = type(property, 2100000);
        var image = images.save(RoomTypeImage.builder().roomType(type).imageUrl("").contentType("image/png")
                .fileContent(new byte[]{1,2,3}).build());
        String path = detailUrl(type) + "/images/" + image.getImageId();
        var result = get(path, null);
        assertEquals(200, result.statusCode());
        assertEquals("image/png", result.headers().firstValue("Content-Type").orElse(""));
        assertEquals("no-store", result.headers().firstValue("Cache-Control").orElse(""));
        assertEquals("nosniff", result.headers().firstValue("X-Content-Type-Options").orElse(""));
        assertEquals(path, list("").path("items").get(0).path("imageUrl").asString());
        var otherType = type(property, 2200000);
        assertEquals(404, get(detailUrl(otherType) + "/images/" + image.getImageId(), null).statusCode());
        property.setStatus("HIDDEN"); properties.save(property);
        assertEquals(404, get(path, null).statusCode());
        assertEquals(404, get(detailUrl(type), null).statusCode());
        assertEquals(0, list("").path("totalElements").asInt());
    }

    @Test void filtersAreAppliedBeforePaginationAndInvalidParametersReturn400() throws Exception {
        var property = property("ACTIVE", RegistrationStatus.APPROVED);
        type(property, 1500000); type(property, 2500000); type(property, 3000000);
        assertEquals(2, list("&price=15-25&location=tan-xa&type=khep-kin&size=1").path("totalElements").asInt());
        assertEquals(1, list("&price=25-35").path("totalElements").asInt());
        assertEquals(0, list("&location=binh-yen").path("totalElements").asInt());
        for (String invalid : List.of("page=-1", "page=abc", "page=999999999999999999", "size=0", "size=51", "sort=rating", "location=unknown", "price=unknown", "type=unknown")) {
            assertEquals(400, get(listUrl("&" + invalid), null).statusCode(), invalid);
        }
        assertEquals(400, get("/api/properties/search?q=" + "a".repeat(201), null).statusCode());
        var attic = type(property, 1800000);
        attic.setRoomType("Phòng xép"); types.save(attic);
        assertEquals(1, list("&type=gac-lung").path("totalElements").asInt());
        assertEquals(0, json.readTree(get("/api/properties/search?q=" + URLEncoder.encode(prefix + "%", StandardCharsets.UTF_8), null).body()).path("data").path("totalElements").asInt());
        var post = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + environment.getProperty("local.server.port") + "/api/properties/search"))
                .POST(HttpRequest.BodyPublishers.noBody()).build();
        assertEquals(401, client.send(post, HttpResponse.BodyHandlers.ofString()).statusCode());
    }

    @Test void searchFiltersRoomAndSharedAmenitiesBeforeCountingAndPagination() throws Exception {
        var property=property("ACTIVE",RegistrationStatus.APPROVED);
        var registration=registrations.findById(property.getRegistration().getRegistrationId()).orElseThrow();
        registration.setRegistrationDetails("{\"amenities\":[\"flexibleHours\",\"laundry\",\"camera\"]}");registrations.save(registration);
        for(int index=0;index<3;index++){
            var type=type(property,2200000+index);
            type.setAmenitiesJson("[\"airConditioner\",\"balcony\"]");type.setElectricityPrice(new BigDecimal("3500"));types.save(type);
            room(type,"R"+index,index==2?"OCCUPIED":"VACANT");
        }
        var noBalcony=type(property,1800000);noBalcony.setAmenitiesJson("[\"airConditioner\"]");types.save(noBalcony);room(noBalcony,"R4","VACANT");
        var result=list("&amenities=airConditioner,balcony,flexibleHours,washingMachine&availableOnly=true&size=1");
        assertEquals(2,result.path("totalElements").asInt());assertEquals(2,result.path("totalPages").asInt());
        assertEquals(1,result.path("items").size());assertEquals(1,result.path("items").get(0).path("availableRooms").asInt());
        assertEquals(3500,result.path("items").get(0).path("electricityPrice").asInt());
        assertEquals(2,result.path("items").get(0).path("amenities").size());
        assertEquals(0,list("&amenities=refrigerator").path("totalElements").asInt());
        assertEquals(400,get(listUrl("&amenities=unknown"),null).statusCode());
        assertEquals(400,get(listUrl("&availableOnly=invalid"),null).statusCode());
    }

    @Test void searchSortsByActualAreaAndPublicRatings() throws Exception {
        var small=type(property("ACTIVE",RegistrationStatus.APPROVED),2200000);
        var large=type(property("ACTIVE",RegistrationStatus.APPROVED),2500000);large.setAreaSqm(40F);types.save(large);
        var reviewer=users.save(User.builder().email(prefix+"-sort@test.local").passwordHash("unused").role(UserRole.USER).status(UserStatus.ACTIVE).build());
        feedbacks.save(Feedback.builder().property(small.getProperty()).user(reviewer).rating(5).content("Actual rating").build());
        feedbacks.save(Feedback.builder().property(large.getProperty()).user(reviewer).rating(3).content("Actual rating").build());
        assertEquals(large.getRoomTypeId().intValue(),list("&sort=area-desc").path("items").get(0).path("roomTypeId").asInt());
        var ranked=list("&sort=rating-desc&size=1");assertEquals(2,ranked.path("totalElements").asInt());
        assertEquals(small.getRoomTypeId().intValue(),ranked.path("items").get(0).path("roomTypeId").asInt());
        assertEquals(large.getRoomTypeId().intValue(),list("&sort=rating-desc&size=1&page=1").path("items").get(0).path("roomTypeId").asInt());
    }

    @Test void detailSeparatesPropertyPhotosAndListsOnlyPublicRoomTypesOfThisProperty() throws Exception {
        var property = property("ACTIVE", RegistrationStatus.APPROVED);
        var registration = registrations.findById(property.getRegistration().getRegistrationId()).orElseThrow();
        registration.setRegistrationDetails("{\"termsAccepted\":true}"); registrations.save(registration);
        var first = type(property, 2200000);
        var second = type(property, 2800000); room(second,"201","VACANT");
        type(property, 0);
        var other = type(property("ACTIVE", RegistrationStatus.APPROVED), 1800000);
        var photo = documents.save(PropertyDocument.builder().registration(registration).documentType("PHOTO_0")
                .fileName("building.png").contentType("image/png").fileContent(new byte[]{1,2,3}).build());
        documents.save(PropertyDocument.builder().registration(registration).documentType("OWNERSHIP")
                .fileName("private.png").contentType("image/png").fileContent(new byte[]{1,2,3}).build());
        documents.save(PropertyDocument.builder().registration(registration).documentType("PHOTO_1")
                .archivedAt(java.time.LocalDateTime.now()).contentType("image/png").fileContent(new byte[]{1}).build());
        var image = images.save(RoomTypeImage.builder().roomType(first).imageUrl("")
                .contentType("image/png").fileContent(new byte[]{1,2,3}).build());
        var response = get(detailUrl(first) + "/details", null);
        assertEquals(200,response.statusCode(),response.body());
        var data=json.readTree(response.body()).path("data");
        assertEquals(1,data.path("propertyGallery").size());
        var photoUrl="/api/public/properties/photos/"+photo.getDocumentId();
        assertEquals(photoUrl,data.path("propertyGallery").get(0).path("url").asString());
        assertEquals(200,get(photoUrl,null).statusCode());
        assertTrue(data.path("gallery").get(0).path("url").asString().endsWith("/images/"+image.getImageId()));
        assertEquals(2,data.path("roomTypes").size());
        assertEquals(first.getRoomTypeId().intValue(),data.path("roomTypes").get(0).path("roomTypeId").asInt());
        assertEquals(1,data.path("roomTypes").get(1).path("availableRooms").asInt());
        for(var choice:data.path("roomTypes")){
            assertEquals(property.getPropertyId().intValue(),choice.path("propertyId").asInt());
            assertNotEquals(other.getRoomTypeId().intValue(),choice.path("roomTypeId").asInt());
        }
        assertFalse(response.body().contains("private.png"));
    }

    @Test void fullDetailUsesActualFeesGalleryReviewsAndPublicRelatedRooms() throws Exception {
        host.setPhoneNumber("0981234567"); users.save(host);
        var property = property("ACTIVE", RegistrationStatus.APPROVED);
        var registration = registrations.findById(property.getRegistration().getRegistrationId()).orElseThrow();
        registration.setRegistrationDetails(json.writeValueAsString(Map.of(
                "description", "Public property description", "amenities", List.of("parking", "wifi"),
                "selectedRules", List.of("quietHours"), "rules", "Public living rules", "nearby", "Public nearby description",
                "managerName", "Người liên hệ công khai", "contactPhone", "0900 000 001", "zaloPhone", "+84 900 000 002")));
        registrations.save(registration);
        var type = type(property, 2200000);
        type.setCapacity(2); type.setDeposit(new BigDecimal("2200000")); type.setElectricityPrice(new BigDecimal("3500"));
        type.setWaterPrice(new BigDecimal("15000")); type.setInternetPrice(BigDecimal.ZERO); type.setServicePrice(new BigDecimal("50000"));
        type.setAmenitiesJson("[\"bed\",\"wifi\",\"privateBathroom\"]"); type.setDescription("Public room description"); types.save(type);
        for (int i = 0; i < 5; i++) images.save(RoomTypeImage.builder().roomType(type).imageUrl("")
                .contentType("image/png").fileContent(new byte[]{1,2,3}).fileName("photo" + i + ".png").build());
        images.save(RoomTypeImage.builder().roomType(type).imageUrl("javascript:alert(1)").build());
        var reviewer = users.save(User.builder().email(prefix + "-reviewer@test.local").fullName("Public reviewer")
                .passwordHash("unused").role(UserRole.USER).status(UserStatus.ACTIVE).build());
        for (int rating : List.of(5, 3)) feedbacks.save(Feedback.builder().property(property).user(reviewer).rating(rating).content("Actual review " + rating).build());
        var hiddenReviewer = users.save(User.builder().email(prefix + "-inactive@test.local").passwordHash("unused")
                .role(UserRole.USER).status(UserStatus.INACTIVE).build());
        feedbacks.save(Feedback.builder().property(property).user(hiddenReviewer).rating(1).content("Inactive feedback").build());
        var related = type(property("ACTIVE", RegistrationStatus.APPROVED), 2500000);
        var hidden = type(property("HIDDEN", RegistrationStatus.APPROVED), 1800000);
        var response = get(detailUrl(type) + "/details", null);
        assertEquals(200, response.statusCode(), response.body());
        var data = json.readTree(response.body()).path("data");
        assertEquals(type.getRoomTypeId().intValue(), data.path("summary").path("roomTypeId").asInt());
        assertEquals(5, data.path("gallery").size());
        assertTrue(data.path("gallery").get(0).path("url").asString().startsWith(detailUrl(type) + "/images/"));
        assertEquals(2, data.path("capacity").asInt());
        assertEquals(2200000, data.path("deposit").asInt());
        assertEquals(3500, data.path("electricityPrice").asInt());
        assertEquals(15000, data.path("waterPrice").asInt());
        assertEquals(0, data.path("internetPrice").asInt());
        assertEquals("Public room description", data.path("description").asString());
        assertEquals("Public property description", data.path("propertyDescription").asString());
        assertEquals("Public living rules", data.path("rules").asString());
        assertEquals("quietHours", data.path("selectedRules").get(0).asString());
        assertTrue(data.path("mapUrl").asString().startsWith("https://www.google.com/maps/search/?api=1&query="));
        assertEquals(2, data.path("reviews").path("totalReviews").asInt());
        assertEquals(4, data.path("reviews").path("averageRating").asInt());
        assertEquals(0, data.path("reviews").path("ratingCounts").get(0).asInt());
        assertEquals(2, data.path("reviews").path("latest").size());
        assertFalse(response.body().contains("0981234567"));
        assertEquals("0900000001", data.path("publicContact").path("phone").asString());
        assertEquals("+84900000002", data.path("publicContact").path("zaloPhone").asString());
        assertEquals("Người liên hệ công khai", data.path("publicContact").path("hostName").asString());
        assertFalse(response.body().contains("@test.local"));
        assertFalse(response.body().contains("javascript:"));
        assertFalse(data.has("registrationDetails"));
        assertTrue(data.path("similar").size() <= 3);
        boolean foundRelated = false;
        for (var similar : data.path("similar")) {
            assertNotEquals(property.getPropertyId().intValue(), similar.path("propertyId").asInt());
            assertNotEquals(hidden.getRoomTypeId().intValue(), similar.path("roomTypeId").asInt());
            if (similar.path("roomTypeId").asInt() == related.getRoomTypeId()) foundRelated = true;
        }
        assertTrue(foundRelated);
        property.setStatus("HIDDEN"); properties.save(property);
        assertEquals(404, get(detailUrl(type) + "/details", null).statusCode());
    }

    @Test void fullDetailLeavesMissingFieldsAndReviewsEmptyInsteadOfInventingFacts() throws Exception {
        var type = type(property("ACTIVE", RegistrationStatus.APPROVED), 1500000);
        var response = get(detailUrl(type) + "/details", null);
        assertEquals(200, response.statusCode(), response.body());
        var data = json.readTree(response.body()).path("data");
        assertTrue(data.path("deposit").isNull()); assertTrue(data.path("waterPrice").isNull());
        assertEquals(0, data.path("gallery").size());
        assertEquals(0, data.path("reviews").path("totalReviews").asInt());
        assertTrue(data.path("reviews").path("averageRating").isNull());
        assertEquals(5, data.path("reviews").path("ratingCounts").size());
        assertEquals(0, data.path("reviews").path("latest").size());
        assertTrue(data.path("publicContact").isNull());
    }

    @Test void invalidOrMissingRegistrationContactsNeverExposePrivateAccountPhone() throws Exception {
        host.setPhoneNumber("0981234567"); users.save(host);
        var property = property("ACTIVE", RegistrationStatus.APPROVED);
        var type = type(property, 1700000);
        var registration = registrations.findById(property.getRegistration().getRegistrationId()).orElseThrow();
        for (var fields : List.of(Map.of("contactPhone", "javascript:alert(1)", "zaloPhone", "https://example.com"),
                Map.of("contactPhone", "", "zaloPhone", ""))) {
            registration.setRegistrationDetails(json.writeValueAsString(fields)); registrations.save(registration);
            var response = get(detailUrl(type) + "/details", null);
            assertEquals(200, response.statusCode(), response.body());
            assertTrue(json.readTree(response.body()).path("data").path("publicContact").isNull());
            assertFalse(response.body().contains("0981234567"));
        }
        registration.setRegistrationDetails(json.writeValueAsString(Map.of("contactPhone", "", "zaloPhone", "0900000002")));
        registrations.save(registration);
        var data = json.readTree(get(detailUrl(type) + "/details", null).body()).path("data");
        assertTrue(data.path("publicContact").path("phone").isNull());
        assertEquals("0900000002", data.path("publicContact").path("zaloPhone").asString());
    }
}
