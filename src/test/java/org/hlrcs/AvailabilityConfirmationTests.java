package org.hlrcs;

import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.*;
import org.hlrcs.repository.*;
import org.hlrcs.security.JwtTokenProvider;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.test.context.ActiveProfiles;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.*;
import java.time.Instant;
import java.time.Duration;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT, properties={
    "spring.datasource.url=jdbc:h2:mem:availability-isolated;MODE=MySQL;DB_CLOSE_DELAY=-1",
    "spring.jpa.hibernate.ddl-auto=create-drop"})
@ActiveProfiles("test")
class AvailabilityConfirmationTests {
    @Autowired UserRepository users;
    @Autowired PropertyRepository properties;
    @Autowired PropertyRegistrationRepository registrations;
    @Autowired RoomTypeRepository types;
    @Autowired RoomRepository rooms;
    @Autowired JwtTokenProvider jwt;
    @Autowired ObjectMapper json;
    @Autowired Environment environment;
    final HttpClient client=HttpClient.newHttpClient();
    User owner; RoomType type; Room vacant; Room occupied;
    @BeforeEach void setup() {
        owner=user(UserRole.ROOM_HOST);
        var registration=registrations.save(PropertyRegistration.builder().user(owner).name("Availability test").status(RegistrationStatus.APPROVED).build());
        var property=properties.save(Property.builder().owner(owner).registration(registration).name("Availability test").address("Tân Xã").status("ACTIVE").build());
        type=types.save(RoomType.builder().property(property).roomType("Studio").price(BigDecimal.valueOf(2000000)).areaSqm(25F).build());
        vacant=rooms.save(Room.builder().property(property).roomType(type).roomNumber("101").floor("1").status("VACANT").build());
        occupied=rooms.save(Room.builder().property(property).roomType(type).roomNumber("102").floor("1").status("OCCUPIED").build());
    }
    User user(UserRole role) { return users.save(User.builder().email(UUID.randomUUID()+"@test.local").passwordHash("unused").role(role).status(UserStatus.ACTIVE).build()); }
    HttpResponse<String> call(String method,String path,User actor,String body) throws Exception {
        var request=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+environment.getProperty("local.server.port")+path));
        if(actor!=null)request.header("Authorization","Bearer "+jwt.generateTokenFromUser(actor));
        if(body!=null)request.header("Content-Type","application/json");
        return client.send(request.method(method,body==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(body)).build(),HttpResponse.BodyHandlers.ofString());
    }
    String confirmation(){return "/api/host/room-types/"+type.getRoomTypeId()+"/availability-confirmation";}
    JsonNode publicDetail() throws Exception {
        var response=call("GET","/api/properties/"+type.getProperty().getPropertyId()+"/room-types/"+type.getRoomTypeId()+"/details",null,null);
        assertEquals(200,response.statusCode(),response.body());return json.readTree(response.body()).path("data").path("summary");
    }
    @Test void confirmsWholeTypeWithoutChangingInventoryAndPersistsActor() throws Exception {
        vacant.setConfirmedAt(java.time.LocalDateTime.of(2026,10,25,22,39));rooms.save(vacant);
        occupied.setConfirmedAt(java.time.LocalDateTime.of(2026,10,25,22,40));rooms.save(occupied);
        var untouchedType=types.save(RoomType.builder().property(type.getProperty()).roomType("Other type").price(BigDecimal.valueOf(2200000)).areaSqm(25F).build());
        var untouched=rooms.save(Room.builder().property(type.getProperty()).roomType(untouchedType).roomNumber("301").floor("3").status("VACANT").confirmedAt(java.time.LocalDateTime.of(2026,10,25,22,41)).build());
        assertEquals("UNCONFIRMED",publicDetail().path("availabilityConfirmationStatus").asString());
        var response=call("POST",confirmation(),owner,null);assertEquals(200,response.statusCode(),response.body());
        var value=json.readTree(response.body()).path("data");
        assertEquals(1,value.path("vacantRooms").asInt());assertEquals(2,value.path("totalRooms").asInt());
        assertEquals("CURRENT",value.path("availabilityConfirmationStatus").asString());assertFalse(value.path("availabilityStale").asBoolean());
        var saved=types.findById(type.getRoomTypeId()).orElseThrow();
        assertNotNull(saved.getAvailabilityConfirmedAt());assertEquals(owner.getUserId(),saved.getAvailabilityConfirmedBy().getUserId());
        var expected=java.time.LocalDateTime.ofInstant(saved.getAvailabilityConfirmedAt(),java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
        assertEquals(expected,rooms.findById(vacant.getRoomId()).orElseThrow().getConfirmedAt());
        assertEquals(expected,rooms.findById(occupied.getRoomId()).orElseThrow().getConfirmedAt());
        assertEquals(untouched.getConfirmedAt(),rooms.findById(untouched.getRoomId()).orElseThrow().getConfirmedAt());
        for(var room:value.path("rooms"))assertEquals("CURRENT",room.path("confirmationStatus").asString());
        var roomList=call("GET","/api/host/rooms",owner,null);assertEquals(200,roomList.statusCode());
        for(var room:json.readTree(roomList.body()).path("data").path("rooms"))
            if(room.path("roomTypeId").asInt()==type.getRoomTypeId())assertEquals("CURRENT",room.path("confirmationStatus").asString());
        assertEquals("VACANT",rooms.findById(vacant.getRoomId()).orElseThrow().getStatus());
        assertEquals("OCCUPIED",rooms.findById(occupied.getRoomId()).orElseThrow().getStatus());
        assertEquals("CURRENT",publicDetail().path("availabilityConfirmationStatus").asString());
        var again=call("GET","/api/host/room-types/"+type.getRoomTypeId(),owner,null);
        assertEquals(value.path("availabilityConfirmedAt").asString(),json.readTree(again.body()).path("data").path("availabilityConfirmedAt").asString());
    }
    @Test void enforcesOwnershipRoleActivePropertyAndNonemptyInventory() throws Exception {
        assertTrue(call("POST",confirmation(),null,null).statusCode()>=400);
        assertEquals(403,call("POST",confirmation(),user(UserRole.USER),null).statusCode());
        assertEquals(404,call("POST",confirmation(),user(UserRole.ROOM_HOST),null).statusCode());
        var property=type.getProperty();property.setStatus("INACTIVE");properties.save(property);
        assertEquals(409,call("POST",confirmation(),owner,null).statusCode());
        property.setStatus("ACTIVE");properties.save(property);rooms.delete(vacant);rooms.delete(occupied);
        assertEquals(400,call("POST",confirmation(),owner,null).statusCode());
    }
    @Test void publicReadersFlagOldDataEvenWhenNoRoomsAreVacantAndRenewalClearsWarning() throws Exception {
        occupied.setStatus("VACANT");rooms.save(occupied);
        type.setAvailabilityConfirmedAt(Instant.now().minus(Duration.ofDays(8)));type.setAvailabilityConfirmedBy(owner);types.save(type);
        var old=publicDetail();assertEquals("STALE",old.path("availabilityConfirmationStatus").asString());assertTrue(old.path("availabilityStale").asBoolean());assertEquals(2,old.path("availableRooms").asInt());
        vacant.setStatus("OCCUPIED");occupied.setStatus("OCCUPIED");rooms.save(vacant);rooms.save(occupied);
        assertEquals(0,publicDetail().path("availableRooms").asInt());assertTrue(publicDetail().path("availabilityStale").asBoolean());
        assertEquals(200,call("POST",confirmation(),owner,null).statusCode());
        var renewed=publicDetail();assertEquals("CURRENT",renewed.path("availabilityConfirmationStatus").asString());assertEquals(0,renewed.path("availableRooms").asInt());
        assertFalse(renewed.has("availabilityConfirmedBy"));
    }
    @Test void roomPriceEditsPreserveConfirmationButStatusChangesInvalidateIt() throws Exception {
        assertEquals(200,call("POST",confirmation(),owner,null).statusCode());
        var stamp=types.findById(type.getRoomTypeId()).orElseThrow().getAvailabilityConfirmedAt();
        String body="{\"roomTypeId\":"+type.getRoomTypeId()+",\"roomNumber\":\"101\",\"floor\":\"1\",\"status\":\"VACANT\",\"customPrice\":2100000}";
        assertEquals(200,call("PUT","/api/host/rooms/"+vacant.getRoomId(),owner,body).statusCode());
        assertEquals(stamp,types.findById(type.getRoomTypeId()).orElseThrow().getAvailabilityConfirmedAt());
        assertEquals(200,call("PUT","/api/host/rooms/"+vacant.getRoomId(),owner,body.replace("VACANT","OCCUPIED")).statusCode());
        assertEquals("UNCONFIRMED",publicDetail().path("availabilityConfirmationStatus").asString());
        assertNull(types.findById(type.getRoomTypeId()).orElseThrow().getAvailabilityConfirmedAt());
        assertNotNull(rooms.findById(vacant.getRoomId()).orElseThrow().getConfirmedAt());
    }
    @Test void movingAndDeletingRoomsInvalidatesAffectedTypes() throws Exception {
        var other=types.save(RoomType.builder().property(type.getProperty()).roomType("Other studio").price(BigDecimal.valueOf(2500000)).areaSqm(30F).build());
        rooms.save(Room.builder().property(type.getProperty()).roomType(other).roomNumber("201").floor("2").status("VACANT").build());
        assertEquals(200,call("POST",confirmation(),owner,null).statusCode());
        assertEquals(200,call("POST","/api/host/room-types/"+other.getRoomTypeId()+"/availability-confirmation",owner,null).statusCode());
        String body="{\"roomTypeId\":"+other.getRoomTypeId()+",\"roomNumber\":\"101\",\"floor\":\"1\",\"status\":\"VACANT\"}";
        assertEquals(200,call("PUT","/api/host/rooms/"+vacant.getRoomId(),owner,body).statusCode());
        assertNull(types.findById(type.getRoomTypeId()).orElseThrow().getAvailabilityConfirmedAt());
        assertNull(types.findById(other.getRoomTypeId()).orElseThrow().getAvailabilityConfirmedAt());
        assertEquals(200,call("POST","/api/host/room-types/"+other.getRoomTypeId()+"/availability-confirmation",owner,null).statusCode());
        assertEquals(200,call("DELETE","/api/host/rooms/"+vacant.getRoomId(),owner,null).statusCode());
        assertNull(types.findById(other.getRoomTypeId()).orElseThrow().getAvailabilityConfirmedAt());
    }
    @Test void legacyPublicListingAndSearchExposeSameFreshnessWithoutReviewerIdentity() throws Exception {
        var registration=registrations.findById(type.getProperty().getRegistration().getRegistrationId()).orElseThrow();
        registration.setRegistrationDetails("{\"termsAccepted\":true}");registrations.save(registration);
        type.setAvailabilityConfirmedAt(Instant.now().minus(Duration.ofDays(8)));type.setAvailabilityConfirmedBy(owner);types.save(type);
        var response=call("GET","/api/public/properties",null,null);assertEquals(200,response.statusCode(),response.body());
        JsonNode listing=null;
        for(var row:json.readTree(response.body()).path("data"))if(row.path("propertyId").asInt()==type.getProperty().getPropertyId())listing=row;
        assertNotNull(listing);
        var value=listing.path("roomTypes").get(0);
        assertEquals("STALE",value.path("availabilityConfirmationStatus").asString());assertEquals(1,value.path("vacantRooms").asInt());
        assertFalse(value.has("availabilityConfirmedBy"));
        response=call("GET","/api/properties/search",null,null);assertEquals(200,response.statusCode(),response.body());
        JsonNode summary=null;
        for(var row:json.readTree(response.body()).path("data").path("items"))if(row.path("roomTypeId").asInt()==type.getRoomTypeId())summary=row;
        assertNotNull(summary);assertEquals("STALE",summary.path("availabilityConfirmationStatus").asString());assertEquals(1,summary.path("availableRooms").asInt());
    }
}
