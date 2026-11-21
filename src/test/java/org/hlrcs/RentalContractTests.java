package org.hlrcs;

import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.*;
import org.hlrcs.repository.*;
import org.hlrcs.security.JwtTokenProvider;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import tools.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.*;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={"app.maps.vietmap.enabled=false","rental.contract.scan.key="})
@ActiveProfiles("test") @TestPropertySource("classpath:application-test.properties")
class RentalContractTests {
    @Autowired UserRepository users;@Autowired PropertyRepository properties;@Autowired RoomTypeRepository types;
    @Autowired RoomRepository rooms;@Autowired RentalContractRepository contracts;@Autowired JwtTokenProvider tokens;
    @Autowired ObjectMapper json;@Autowired Environment env;
    final HttpClient http=HttpClient.newHttpClient();
    User user(UserRole role){return users.save(User.builder().email("contract-"+UUID.randomUUID()+"@test.invalid").fullName("Contract fixture").passwordHash("unused-test-only").role(role).status(UserStatus.ACTIVE).build());}
    record Fixture(User owner,Property property,List<Room> rooms,String token){}
    Fixture fixture(){var u=user(UserRole.ROOM_HOST);var p=properties.save(Property.builder().owner(u).name("Nhà trọ kiểm thử").address("Hòa Lạc").status("ACTIVE").build());var t=types.save(RoomType.builder().property(p).roomType("Studio").price(new BigDecimal("2200000")).build());var rows=List.of("101","102").stream().map(n->rooms.save(Room.builder().property(p).roomType(t).roomNumber(n).floor("Tầng 1").status("VACANT").build())).toList();return new Fixture(u,p,rows,tokens.generateTokenFromUser(u));}
    HttpResponse<String> call(String token,String method,String path,Object body)throws Exception{
        var req=HttpRequest.newBuilder(URI.create("http://localhost:"+env.getProperty("local.server.port")+path));if(token!=null)req.header("Authorization","Bearer "+token);
        if(body!=null)req.header("Content-Type","application/json");
        return http.send(req.method(method,body==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body))).build(),HttpResponse.BodyHandlers.ofString());
    }
    Map<String,Object> draft(Room r,String name){var d=new HashMap<String,Object>();d.putAll(Map.of("roomId",r.getRoomId(),"template","BASIC","landlordName","Chủ nhà","landlordPhone","0901234567","tenantName",name,"tenantPhone","0912345678","tenantIdentity","012345678901","tenantAddress","Hà Nội","rent",2200000,"deposit",2200000));d.putAll(Map.of("paymentDay",5,"terms","Nội dung thỏa thuận đã được hai bên kiểm tra.","reviewed",true));return d;}
    Map<String,Object> payload(Fixture f){var p=new HashMap<String,Object>();p.putAll(Map.of("propertyId",f.property.getPropertyId(),"roomIds",f.rooms.stream().map(Room::getRoomId).toList(),"status","OCCUPIED","leaseStartDate","2026-11-18","leaseEndDate","2027-11-18"));return p;}
    @Test void savesSeparateContractsWithStatusAndKeepsHistoryAfterVacancy()throws Exception{
        var f=fixture();var p=payload(f);p.put("contracts",List.of(draft(f.rooms.get(0),"Người thuê A"),draft(f.rooms.get(1),"Người thuê B")));
        var saved=call(f.token,"PATCH","/api/host/rooms/status",p);assertEquals(200,saved.statusCode(),saved.body());
        var id=f.rooms.get(0).getRoomId();var list=call(f.token,"GET","/api/host/rental-contracts/rooms/"+id,null);
        var first=json.readTree(list.body()).path("data").path(0);assertEquals("Người thuê A",first.path("details").path("tenantName").asText());assertEquals("2026-11-18",first.path("startDate").asText());assertEquals("ACTIVE",first.path("status").asText());
        var changed=new HashMap<>(p);changed.remove("contracts");changed.put("leaseEndDate","2028-11-18");assertEquals(409,call(f.token,"PATCH","/api/host/rooms/status",changed).statusCode());
        assertEquals(409,call(f.token,"PATCH","/api/host/rooms/status",p).statusCode());assertEquals(1,contracts.findByRoomIdAndOwnerIdOrderByCreatedAtDescIdDesc(id,f.owner.getUserId()).size());
        changed.put("status","VACANT");assertEquals(200,call(f.token,"PATCH","/api/host/rooms/status",changed).statusCode());
        var archived=contracts.findByRoomIdAndOwnerIdOrderByCreatedAtDescIdDesc(id,f.owner.getUserId()).get(0);assertEquals("CLOSED",archived.getStatus());assertNotNull(archived.getClosedAt());assertNull(rooms.findById(id).orElseThrow().getLeaseStartDate());
        p.put("leaseStartDate","2028-01-01");p.put("leaseEndDate","2029-01-01");assertEquals(200,call(f.token,"PATCH","/api/host/rooms/status",p).statusCode());
        var history=json.readTree(call(f.token,"GET","/api/host/rental-contracts/rooms/"+id,null).body()).path("data");assertEquals(2,history.size());assertEquals("2028-01-01",history.path(0).path("startDate").asText());assertEquals("CLOSED",history.path(1).path("status").asText());
    }
    @Test void invalidMissingDuplicateOrMismatchedContractRollsBackEveryRoom()throws Exception{
        var f=fixture();var p=payload(f);var a=draft(f.rooms.get(0),"A");var b=draft(f.rooms.get(1),"B");
        for(var invalid:List.of(List.of(a),List.of(a,a))){p.put("contracts",invalid);assertEquals(400,call(f.token,"PATCH","/api/host/rooms/status",p).statusCode());}
        b.put("reviewed",false);p.put("contracts",List.of(a,b));assertEquals(400,call(f.token,"PATCH","/api/host/rooms/status",p).statusCode());
        b.put("reviewed",true);b.put("roomId",Integer.MAX_VALUE);assertEquals(400,call(f.token,"PATCH","/api/host/rooms/status",p).statusCode());
        b.put("roomId",f.rooms.get(1).getRoomId());b.put("rent",-1);assertEquals(400,call(f.token,"PATCH","/api/host/rooms/status",p).statusCode());
        for(var r:f.rooms){assertEquals("VACANT",rooms.findById(r.getRoomId()).orElseThrow().getStatus());assertTrue(contracts.findByRoomIdAndOwnerIdOrderByCreatedAtDescIdDesc(r.getRoomId(),f.owner.getUserId()).isEmpty());}
    }
    @Test void privacyUsesAuthenticatedOwnerAndContractCanBeAddedToExistingOccupiedRoom()throws Exception{
        var f=fixture();int id=f.rooms.get(0).getRoomId();String path="/api/host/rental-contracts/rooms/"+id;
        assertEquals(401,call(null,"GET",path,null).statusCode());
        for(var role:List.of(UserRole.USER,UserRole.STAFF))assertEquals(403,call(tokens.generateTokenFromUser(user(role)),"GET",path,null).statusCode());
        assertEquals(404,call(tokens.generateTokenFromUser(user(UserRole.ROOM_HOST)),"GET",path,null).statusCode());
        assertEquals(404,call(tokens.generateTokenFromUser(user(UserRole.ADMIN)),"GET",path,null).statusCode());
        assertEquals(400,call(f.token,"POST",path,draft(f.rooms.get(0),"Người thuê A")).statusCode());
        assertEquals(200,call(f.token,"PATCH","/api/host/rooms/status",payload(f)).statusCode());
        assertEquals(200,call(f.token,"POST",path,draft(f.rooms.get(0),"Người thuê A")).statusCode());
        assertEquals(409,call(f.token,"POST",path,draft(f.rooms.get(0),"Duplicate")).statusCode());
        String publicRooms=call(null,"GET","/api/public/properties",null).body();assertFalse(publicRooms.contains("Người thuê A"));assertFalse(publicRooms.contains("012345678901"));
        var templates=call(f.token,"GET","/api/host/rental-contracts/templates",null);assertEquals(3,json.readTree(templates.body()).path("data").path("templates").size());assertFalse(json.readTree(templates.body()).path("data").path("scanAvailable").asBoolean());
    }

    @Test void houseRentalTemplateCanBeSelectedAndSavedWithItsOwnFields() throws Exception {
        var f=fixture();
        var room=f.rooms().get(0);
        var response=call(f.token(),"GET","/api/host/rental-contracts/templates",null);
        assertEquals(200,response.statusCode());
        var template=json.readTree(response.body()).path("data").path("templates").path(1);
        assertEquals("HOUSE_RENTAL",template.path("id").asText());
        var terms=template.path("terms").asText();
        for(int article=1;article<=4;article++)assertTrue(terms.contains("ĐIỀU "+article+":"));
        assertTrue(terms.contains("1.2 Mục đích thuê nhà\nBên thuê nhà thuê nhà để ở."));
        assertTrue(terms.contains("1.4 Thời hạn cho thuê\nTrong trường hợp gia hạn"));
        assertFalse(terms.contains("Hai bên thống nhất bên chịu các khoản điện"));
        var draft=draft(room,"Người thuê mẫu 2");
        draft.put("template","HOUSE_RENTAL");
        draft.put("terms",terms);
        draft.put("rentalScope","Phòng 25 m²");
        draft.put("occupantCount",2);
        draft.put("firstPaymentDate","2026-11-20");
        draft.put("contractDate","2000-01-01");
        var payload=payload(f);
        payload.put("roomIds",List.of(room.getRoomId()));
        payload.put("contracts",List.of(draft));
        var saved=call(f.token(),"PATCH","/api/host/rooms/status",payload);
        assertEquals(200,saved.statusCode(),saved.body());
        var history=call(f.token(),"GET","/api/host/rental-contracts/rooms/"+room.getRoomId(),null);
        var stored=json.readTree(history.body()).path("data").path(0).path("details");
        assertEquals("HOUSE_RENTAL",stored.path("template").asText());
        assertEquals("Phòng 25 m²",stored.path("rentalScope").asText());
        assertEquals(2,stored.path("occupantCount").asInt());
        assertEquals("2026-11-20",stored.path("firstPaymentDate").asText());
        assertEquals(LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).toString(),stored.path("contractDate").asText());
    }
    @Test void lateConflictRollsBackContractAlreadyFlushedForEarlierRoom()throws Exception{
        var f=fixture();var a=f.rooms.get(0);var b=f.rooms.get(1);var second=payload(f);
        second.put("roomIds",List.of(b.getRoomId()));second.put("contracts",List.of(draft(b,"Existing tenant")));
        assertEquals(200,call(f.token,"PATCH","/api/host/rooms/status",second).statusCode());
        var both=payload(f);both.put("contracts",List.of(draft(a,"Should roll back"),draft(b,"Conflict")));
        assertEquals(409,call(f.token,"PATCH","/api/host/rooms/status",both).statusCode());
        assertEquals("VACANT",rooms.findById(a.getRoomId()).orElseThrow().getStatus());
        assertTrue(contracts.findByRoomIdAndOwnerIdOrderByCreatedAtDescIdDesc(a.getRoomId(),f.owner.getUserId()).isEmpty());
        assertEquals(1,contracts.findByRoomIdAndOwnerIdOrderByCreatedAtDescIdDesc(b.getRoomId(),f.owner.getUserId()).size());
    }
    @Test void scanEndpointVerifiesOwnershipWithoutLazyInitializationError()throws Exception{
        var f=fixture();int id=f.rooms.get(0).getRoomId();
        var img=new java.awt.image.BufferedImage(16,16,java.awt.image.BufferedImage.TYPE_INT_RGB);
        var pngOut=new java.io.ByteArrayOutputStream();
        javax.imageio.ImageIO.write(img,"png",pngOut);
        String boundary="----NestHubBoundary7MA4YWxkTrZu0gW";
        var bodyOut=new java.io.ByteArrayOutputStream();
        bodyOut.write(("--"+boundary+"\r\nContent-Disposition: form-data; name=\"roomId\"\r\n\r\n"+id+"\r\n"
            +"--"+boundary+"\r\nContent-Disposition: form-data; name=\"consent\"\r\n\r\ntrue\r\n"
            +"--"+boundary+"\r\nContent-Disposition: form-data; name=\"files\"; filename=\"trang-1.png\"\r\nContent-Type: image/png\r\n\r\n").getBytes(java.nio.charset.StandardCharsets.UTF_8));
        bodyOut.write(pngOut.toByteArray());
        bodyOut.write(("\r\n--"+boundary+"--\r\n").getBytes(java.nio.charset.StandardCharsets.UTF_8));
        byte[] bodyBytes=bodyOut.toByteArray();

        var ownerReq=HttpRequest.newBuilder(URI.create("http://localhost:"+env.getProperty("local.server.port")+"/api/host/rental-contracts/scan"))
            .header("Authorization","Bearer "+f.token)
            .header("Content-Type","multipart/form-data; boundary="+boundary)
            .POST(HttpRequest.BodyPublishers.ofByteArray(bodyBytes)).build();
        var ownerRes=http.send(ownerReq,HttpResponse.BodyHandlers.ofString());
        assertEquals(503,ownerRes.statusCode(),ownerRes.body());
        assertFalse(ownerRes.body().contains("Could not initialize proxy"),ownerRes.body());

        String otherToken=tokens.generateTokenFromUser(user(UserRole.ROOM_HOST));
        var otherReq=HttpRequest.newBuilder(URI.create("http://localhost:"+env.getProperty("local.server.port")+"/api/host/rental-contracts/scan"))
            .header("Authorization","Bearer "+otherToken)
            .header("Content-Type","multipart/form-data; boundary="+boundary)
            .POST(HttpRequest.BodyPublishers.ofByteArray(bodyBytes)).build();
        var otherRes=http.send(otherReq,HttpResponse.BodyHandlers.ofString());
        assertEquals(404,otherRes.statusCode(),otherRes.body());
    }
    @Test void savedScannedTranscriptPreservesExactCharactersAfterSaveAndReload()throws Exception{
        var f=fixture();var room=f.rooms.get(0);
        String exactTranscript=String.join("\n",
            "ĐIỀU KHOẢN THUÊ PHÒNG P.102 — Mã hồ sơ 0008.",
            "Ngày hiệu lực: 01/12/2026.",
            "Giá thuê: 2.200.000 đ/tháng | Tiền cọc: 2,200,000 đ.",
            "Bảng dịch vụ: Điện | 3.800 đ/kWh | Nước | 100.000 đ/người.",
            "Bên B giữ gìn vệ sinh và bàn giao đúng hiện trạng.");
        var d=draft(room,"Lê Minh C");
        d.put("template","OWNER_SCAN");
        d.put("sourceName","hop-dong-goc.pdf");
        d.put("terms",exactTranscript);
        d.put("fullScannedTranscript",exactTranscript+"\n\nTrang 2 — Phụ lục giữ nguyên.");
        var p=payload(f);p.put("roomIds",List.of(room.getRoomId()));p.put("contracts",List.of(d));
        var saved=call(f.token,"PATCH","/api/host/rooms/status",p);
        assertEquals(200,saved.statusCode(),saved.body());
        var list=call(f.token,"GET","/api/host/rental-contracts/rooms/"+room.getRoomId(),null);
        var details=json.readTree(list.body()).path("data").path(0).path("details");
        assertEquals(exactTranscript,details.path("terms").asText());
        assertEquals(exactTranscript+"\n\nTrang 2 — Phụ lục giữ nguyên.",details.path("fullScannedTranscript").asText());
    }
    @Test void savesOfficialVietnameseTemplateFieldsAndReturnsStandardTemplates()throws Exception{
        var f=fixture();var room=f.rooms.get(0);
        var d=draft(room,"Trần Thị B");
        d.put("contractDate","2026-11-18");
        d.put("landlordBirthDate","1980-05-12");
        d.put("landlordAddress","Thôn 3, Thạch Hòa, Thạch Thất, Hà Nội");
        d.put("landlordIdentity","001080012345");
        d.put("landlordIdentityDate","2021-06-15");
        d.put("landlordIdentityPlace","Cục CSQLHC về TTXH");
        d.put("tenantBirthDate","2004-08-20");
        d.put("tenantIdentityDate","2022-09-10");
        d.put("tenantIdentityPlace","Cục CSQLHC về TTXH");
        d.put("paymentMethod","Chuyển khoản hoặc tiền mặt trước ngày 05 hằng tháng");
        d.put("electricityPrice",3800);
        d.put("waterPrice",100000);
        d.put("waterUnit","người");
        d.put("internetPrice",100000);
        d.put("servicePrice",50000);
        var p=payload(f);p.put("roomIds",List.of(room.getRoomId()));p.put("contracts",List.of(d));
        var saved=call(f.token,"PATCH","/api/host/rooms/status",p);
        assertEquals(200,saved.statusCode(),saved.body());
        var list=call(f.token,"GET","/api/host/rental-contracts/rooms/"+room.getRoomId(),null);
        var details=json.readTree(list.body()).path("data").path(0).path("details");
        assertEquals("2026-11-18",details.path("contractDate").asText());
        assertEquals("001080012345",details.path("landlordIdentity").asText());
        assertEquals("2004-08-20",details.path("tenantBirthDate").asText());
        assertEquals("Chuyển khoản hoặc tiền mặt trước ngày 05 hằng tháng",details.path("paymentMethod").asText());
        assertEquals(3800,details.path("electricityPrice").asInt());
        assertEquals(100000,details.path("waterPrice").asInt());
        assertEquals("người",details.path("waterUnit").asText());

        var templates=call(f.token,"GET","/api/host/rental-contracts/templates",null);
        var basicTerms=json.readTree(templates.body()).path("data").path("templates").path(0).path("terms").asText();
        assertTrue(basicTerms.contains("1. Trách nhiệm của bên A"));
        assertTrue(basicTerms.contains("2. Trách nhiệm của bên B"));
        assertTrue(basicTerms.contains("3. Trách nhiệm chung"));
    }
}
