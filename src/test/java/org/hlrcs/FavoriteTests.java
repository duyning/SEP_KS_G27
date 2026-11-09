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
import java.net.http.*;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.datasource.url=jdbc:h2:mem:hlrcs-favorites-isolated;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa", "spring.datasource.password=", "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop"})
@ActiveProfiles("test")
class FavoriteTests {
    @Autowired Environment environment;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired PropertyRepository properties;
    @Autowired PropertyRegistrationRepository registrations;
    @Autowired RoomTypeRepository types;
    @Autowired RoomRepository rooms;
    @Autowired WishlistRepository favorites;
    @Autowired JwtTokenProvider jwt;
    private final HttpClient client = HttpClient.newHttpClient();
    private User member, other, host;
    private Property property;
    private RoomType type;

    private User user(UserRole role) {
        return users.save(User.builder().email(UUID.randomUUID()+"@favorites.test").passwordHash("unused")
                .fullName("Favorites test").role(role).status(UserStatus.ACTIVE).build());
    }
    @BeforeEach void setup() {
        member=user(UserRole.USER);other=user(UserRole.USER);host=user(UserRole.ROOM_HOST);
        var registration=registrations.save(PropertyRegistration.builder().user(host).name("Private profile name")
                .address("Private address").status(RegistrationStatus.APPROVED).build());
        property=properties.save(Property.builder().owner(host).registration(registration).name("Public favorite test")
                .address("Tân Xã").status("ACTIVE").build());
        type=type("Studio A");
        rooms.save(Room.builder().roomType(type).property(property).roomNumber("A01").floor("1").status("VACANT").build());
    }
    private RoomType type(String name) {
        return types.save(RoomType.builder().property(property).roomType(name).price(BigDecimal.valueOf(2100000)).areaSqm(25F).build());
    }
    private HttpRequest request(String method, String path, User user, String body) {
        var builder=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+environment.getProperty("local.server.port")+path));
        if(user!=null)builder.header("Authorization","Bearer "+jwt.generateTokenFromUser(user));
        if(body!=null)builder.header("Content-Type","application/json");
        return builder.method(method,body==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(body)).build();
    }
    private HttpResponse<String> call(String method,String path,User user,String body) throws Exception {
        return client.send(request(method,path,user,body),HttpResponse.BodyHandlers.ofString());
    }
    private JsonNode save(User user,RoomType roomType) throws Exception {
        var response=call("POST","/api/favorites",user,"{\"roomTypeId\":"+roomType.getRoomTypeId()+"}");
        assertEquals(200,response.statusCode(),response.body());
        assertEquals("private, no-store",response.headers().firstValue("Cache-Control").orElse(""));
        return json.readTree(response.body()).path("data");
    }

    @Test void persistsPerRoomTypeAndReloadsCurrentPublicSummary() throws Exception {
        var first=save(member,type);var second=save(member,type);
        assertEquals(first.path("favoriteId"),second.path("favoriteId"));
        assertEquals(first.path("createdAt"),second.path("createdAt"));
        assertFalse(first.path("createdAt").isNull());
        assertEquals(1,favorites.countByUser_UserId(member.getUserId()));
        var another=type("Studio B");save(member,another);save(host,type);
        type.setPrice(BigDecimal.valueOf(2600000));types.save(type);
        var response=call("GET","/api/favorites?page=0&size=1",member,null);
        var page=json.readTree(response.body()).path("data");
        assertEquals(2,page.path("totalElements").asInt());assertEquals(2,page.path("totalPages").asInt());
        assertEquals(1,page.path("items").size());
        assertEquals(another.getRoomTypeId().intValue(),page.path("items").get(0).path("roomTypeId").asInt());
        var detail=json.readTree(call("GET","/api/favorites/"+first.path("favoriteId").asInt(),member,null).body()).path("data");
        assertEquals(2600000,detail.path("accommodation").path("price").asInt());
        assertEquals(1,detail.path("accommodation").path("availableRooms").asInt());
        assertFalse(detail.path("accommodation").has("owner"));
        var states=json.readTree(call("GET","/api/favorites/state?roomTypeIds="+type.getRoomTypeId()+","+another.getRoomTypeId(),host,null).body()).path("data");
        assertEquals(1,states.path("items").size());assertEquals(1,states.path("total").asInt());
    }

    @Test void cannotReadOrRemoveAnotherMembersFavoriteAndRemovingDoesNotDeleteRooms() throws Exception {
        int id=save(member,type).path("favoriteId").asInt();
        assertEquals(404,call("GET","/api/favorites/"+id,other,null).statusCode());
        assertEquals(404,call("DELETE","/api/favorites/"+id,other,null).statusCode());
        assertTrue(favorites.existsById(id));
        assertEquals(0,json.readTree(call("GET","/api/favorites?userId="+member.getUserId(),other,null).body()).path("data").path("totalElements").asInt());
        assertEquals(200,call("DELETE","/api/favorites/"+id,member,null).statusCode());
        assertFalse(favorites.existsById(id));assertTrue(types.existsById(type.getRoomTypeId()));
        assertEquals(1,rooms.findAll().stream().filter(room->room.getRoomType().getRoomTypeId().equals(type.getRoomTypeId())).count());
        assertEquals(404,call("DELETE","/api/favorites/"+id,member,null).statusCode());
    }

    @Test void hiddenOrUnapprovedOrInactiveHostNeverLeaksPrivateContent() throws Exception {
        int id=save(member,type).path("favoriteId").asInt();
        property.setStatus("HIDDEN");properties.save(property);
        var response=call("GET","/api/favorites",member,null);
        var item=json.readTree(response.body()).path("data").path("items").get(0);
        assertFalse(item.path("available").asBoolean());assertTrue(item.path("accommodation").isNull());
        assertFalse(response.body().contains("Public favorite test"));assertFalse(response.body().contains("Private address"));
        assertEquals(404,call("POST","/api/favorites",other,"{\"roomTypeId\":"+type.getRoomTypeId()+"}").statusCode());
        property.setStatus("ACTIVE");properties.save(property);
        var registration=registrations.findById(property.getRegistration().getRegistrationId()).orElseThrow();
        registration.setStatus(RegistrationStatus.PENDING);registrations.save(registration);
        assertFalse(json.readTree(call("GET","/api/favorites/"+id,member,null).body()).path("data").path("available").asBoolean());
        registration.setStatus(RegistrationStatus.APPROVED);registrations.save(registration);
        host.setStatus(UserStatus.INACTIVE);users.save(host);
        assertFalse(json.readTree(call("GET","/api/favorites/"+id,member,null).body()).path("data").path("available").asBoolean());
        assertEquals(200,call("DELETE","/api/favorites/"+id,member,null).statusCode());
    }

    @Test void concurrentRepeatedSavesCreateExactlyOneRow() throws Exception {
        var futures=new ArrayList<CompletableFuture<HttpResponse<String>>>();
        for(int i=0;i<12;i++) futures.add(client.sendAsync(request("POST","/api/favorites",member,"{\"roomTypeId\":"+type.getRoomTypeId()+"}"),HttpResponse.BodyHandlers.ofString()));
        var ids=new HashSet<Integer>();
        for(var future:futures){var response=future.get(20,TimeUnit.SECONDS);assertEquals(200,response.statusCode(),response.body());ids.add(json.readTree(response.body()).path("data").path("favoriteId").asInt());}
        assertEquals(1,ids.size());assertEquals(1,favorites.countByUser_UserId(member.getUserId()));
    }

    @Test void databaseRejectsDuplicatesEvenWhenBypassingTheService() throws Exception {
        save(member,type);
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class, () ->
                favorites.saveAndFlush(Wishlist.builder().user(member).roomType(type).build()));
        assertEquals(1,favorites.countByUser_UserId(member.getUserId()));
    }

    @Test void requiresActiveMemberOrHostAndValidInputs() throws Exception {
        for(String method:List.of("GET","POST","DELETE"))assertEquals(401,call(method,method.equals("DELETE")?"/api/favorites/1":"/api/favorites",null,method.equals("POST")?"{\"roomTypeId\":1}":null).statusCode());
        assertEquals(403,call("GET","/api/favorites",user(UserRole.STAFF),null).statusCode());
        assertEquals(403,call("GET","/api/favorites",user(UserRole.ADMIN),null).statusCode());
        for(String body:List.of("{}","{\"roomTypeId\":0}","{\"roomTypeId\":-1}"))assertEquals(400,call("POST","/api/favorites",member,body).statusCode());
        for(String query:List.of("?page=-1","?size=0","?size=51","?page=bad","/state?roomTypeIds=-1","/state?roomTypeIds=bad"))assertEquals(400,call("GET","/api/favorites"+query,member,null).statusCode());
        assertEquals(404,call("POST","/api/favorites",member,"{\"roomTypeId\":2147483647}").statusCode());
        member.setStatus(UserStatus.INACTIVE);users.save(member);
        assertEquals(401,call("GET","/api/favorites",member,null).statusCode());
        assertEquals(401,call("POST","/api/favorites",member,"{\"roomTypeId\":"+type.getRoomTypeId()+"}").statusCode());
    }
}
