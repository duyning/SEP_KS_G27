package org.hlrcs;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.*;
import org.hlrcs.repository.*;
import tools.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.*;
import java.time.LocalDateTime;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class HostDashboardTests {
    @Autowired Environment environment;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired PropertyRepository properties;
    @Autowired PropertyRegistrationRepository registrations;
    @Autowired RoomTypeRepository roomTypes;
    @Autowired BookingRepository bookings;
    @Autowired PasswordEncoder encoder;
    @Autowired PropertyDocumentRepository documents;
    @Autowired ModerationLogRepository moderationLogs;
    @Autowired RoomTypeImageRepository typeImages;
    @Autowired WishlistRepository wishlists;
    @Autowired RoomRepository physicalRooms;
    @Autowired HostApplicationRepository hostApplications;
    private final HttpClient client = HttpClient.newHttpClient();

    private HttpResponse<String> propertyEdit(String token,int id) throws Exception {
        var request=HttpRequest.newBuilder(uri("/api/host/property-registrations/"+id+"/edit"));
        if(token!=null)request.header("Authorization","Bearer "+token);
        return client.send(request.GET().build(),HttpResponse.BodyHandlers.ofString());
    }
    private HttpResponse<String> resubmit(String token,int id,String version,Map<String,Object> fields,java.util.List<Integer> retained,String document,String content) throws Exception {
        String boundary="edit-"+System.nanoTime();var body=new java.io.ByteArrayOutputStream();
        body.writeBytes(("--"+boundary+"\r\nContent-Disposition: form-data; name=\"edit\"\r\nContent-Type: application/json\r\n\r\n").getBytes());
        body.writeBytes(json.writeValueAsBytes(Map.of("details",fields,"versionToken",version,"retainedPhotoIds",retained)));body.writeBytes("\r\n".getBytes());
        if(document!=null){body.writeBytes(("--"+boundary+"\r\nContent-Disposition: form-data; name=\""+document+"\"; filename=\"replacement.pdf\"\r\nContent-Type: application/pdf\r\n\r\n"+content+"\r\n").getBytes());}
        body.writeBytes(("--"+boundary+"--\r\n").getBytes());
        return client.send(HttpRequest.newBuilder(uri("/api/host/property-registrations/"+id+"/resubmit")).header("Authorization","Bearer "+token).header("Content-Type","multipart/form-data; boundary="+boundary).POST(HttpRequest.BodyPublishers.ofByteArray(body.toByteArray())).build(),HttpResponse.BodyHandlers.ofString());
    }
    private HttpResponse<String> scopedSupplement(String staff,int id,java.util.List<String> fields) throws Exception {
        return client.send(HttpRequest.newBuilder(uri("/api/staff/verifications/"+id+"/review")).header("Authorization","Bearer "+staff).header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofByteArray(json.writeValueAsBytes(Map.of("decision","REQUEST_SUPPLEMENT","note","Vui lòng cập nhật đúng các mục được yêu cầu.","requestedFields",fields)))).build(),HttpResponse.BodyHandlers.ofString());
    }
    private java.util.List<Integer> retainedPhotos(int id){return documents.findByRegistration_RegistrationIdOrderByDocumentIdAsc(id).stream().filter(d->d.getDocumentType().startsWith("PHOTO_")).map(PropertyDocumentRepository.Metadata::getDocumentId).toList();}

    @Test void supplementEditingIsScopedOwnedAndReentersPendingWithDocumentHistory() throws Exception {
        var owner=account(UserRole.ROOM_HOST);var host=token(owner);var staff=token(account(UserRole.STAFF));
        int id=json.readTree(submitRegistration(host,registrationDetails(),true,false).body()).path("data").path("registrationId").asInt();
        assertEquals(409,propertyEdit(host,id).statusCode());
        assertEquals(200,scopedSupplement(staff,id,java.util.List.of("description","ID_CARD")).statusCode());
        var response=propertyEdit(host,id);assertEquals(200,response.statusCode(),response.body());
        var snapshot=json.readTree(response.body()).path("data");var version=snapshot.path("versionToken").asString();
        assertFalse(snapshot.path("editableFields").toString().contains("name"));
        assertEquals(404,propertyEdit(token(account(UserRole.ROOM_HOST)),id).statusCode());assertEquals(401,propertyEdit(null,id).statusCode());
        var fields=registrationDetails();fields.put("name","Forbidden title");
        assertEquals(400,resubmit(host,id,version,fields,retainedPhotos(id),null,null).statusCode());
        fields=registrationDetails();
        assertEquals(400,resubmit(host,id,version,fields,retainedPhotos(id),null,null).statusCode());
        fields.put("description","Mô tả đã bổ sung đầy đủ theo yêu cầu staff, không thay đổi các mục đã khóa.");
        assertEquals(400,resubmit(host,id,version,fields,java.util.List.of(Integer.MAX_VALUE),null,null).statusCode());
        assertEquals(400,resubmit(host,id,version,fields,retainedPhotos(id),"idCard","invalid pdf").statusCode());
        assertEquals(RegistrationStatus.NEEDS_SUPPLEMENT,registrations.findById(id).orElseThrow().getStatus());
        assertEquals(3,documents.countByRegistration_RegistrationId(id));
        var result=resubmit(host,id,version,fields,retainedPhotos(id),"idCard","%PDF-1.7 replacement document");
        assertEquals(200,result.statusCode(),result.body());assertEquals("PENDING",json.readTree(result.body()).path("data").path("status").asString());
        assertEquals(4,documents.countByRegistration_RegistrationId(id));assertEquals(3,documents.findByRegistration_RegistrationIdOrderByDocumentIdAsc(id).size());
        assertEquals(409,propertyEdit(host,id).statusCode());assertEquals(409,resubmit(host,id,version,fields,retainedPhotos(id),null,null).statusCode());
        assertEquals(1,json.readTree(staffGet(staff,"/verifications/"+id).body()).path("data").path("submissionEvents").size());
        assertEquals(200,staffReview(staff,id,"APPROVE","").statusCode());
        assertTrue(properties.findByOwner_UserIdOrderByPropertyIdAsc(owner.getUserId()).get(0).getDescription().contains("Mô tả đã bổ sung"));
    }

    @Test void approvedChangesKeepPublicVersionAndRoomsUntilStaffApprovesSameProperty() throws Exception {
        var owner=account(UserRole.ROOM_HOST);var host=token(owner);var staff=token(account(UserRole.STAFF));
        int base=json.readTree(submitRegistration(host,registrationDetails(),true,false).body()).path("data").path("registrationId").asInt();
        assertEquals(200,staffReview(staff,base,"APPROVE","").statusCode());
        var property=properties.findByOwner_UserIdOrderByPropertyIdAsc(owner.getUserId()).get(0);var propertyId=property.getPropertyId();var oldName=property.getName();
        var type=roomTypes.save(RoomType.builder().property(property).roomType("Preserved studio").price(new BigDecimal("2000000")).build());
        var room=physicalRooms.save(Room.builder().property(property).roomType(type).roomNumber("Keep101").floor("Tầng 1").status("VACANT").build());
        var snapshot=json.readTree(propertyEdit(host,base).body()).path("data");var version=snapshot.path("versionToken").asString();
        var fields=registrationDetails();fields.put("name","Updated property title");
        var call=(java.util.function.Supplier<HttpResponse<String>>)()->{try{return resubmit(host,base,version,fields,retainedPhotos(base),null,null);}catch(Exception error){throw new RuntimeException(error);}};
        var first=java.util.concurrent.CompletableFuture.supplyAsync(call);var second=java.util.concurrent.CompletableFuture.supplyAsync(call);
        var a=first.get();var b=second.get();assertEquals(java.util.Set.of(200,409),java.util.Set.of(a.statusCode(),b.statusCode()));
        int revision=json.readTree((a.statusCode()==200?a:b).body()).path("data").path("registrationId").asInt();assertNotEquals(base,revision);
        assertEquals(oldName,properties.findById(propertyId).orElseThrow().getName());assertEquals(RegistrationStatus.APPROVED,registrations.findById(base).orElseThrow().getStatus());
        assertEquals(1,json.readTree(propertyDetail(host,"").body()).path("data").path("records").size());
        assertEquals(revision,json.readTree(propertyDetail(host,"").body()).path("data").path("records").get(0).path("changeRequest").path("registrationId").asInt());
        assertEquals(409,propertyEdit(host,base).statusCode());
        assertEquals(200,scopedSupplement(staff,revision,java.util.List.of("address")).statusCode());
        var edit=json.readTree(propertyEdit(host,revision).body()).path("data");fields.put("addressDetail","Số 20, thôn 2, Tân Xã");
        assertEquals(200,resubmit(host,revision,edit.path("versionToken").asString(),fields,retainedPhotos(revision),null,null).statusCode());
        assertEquals(200,staffReview(staff,revision,"REJECT","Cần kiểm tra lại thay đổi địa chỉ.").statusCode());
        assertEquals(oldName,properties.findById(propertyId).orElseThrow().getName());
        edit=json.readTree(propertyEdit(host,revision).body()).path("data");fields.put("description","Nội dung đã chỉnh sửa và gửi lại để staff đối chiếu hồ sơ nhà trọ.");
        assertEquals(200,resubmit(host,revision,edit.path("versionToken").asString(),fields,retainedPhotos(revision),null,null).statusCode());
        var approval=staffReview(staff,revision,"APPROVE","");assertEquals(200,approval.statusCode(),approval.body());
        assertEquals("Updated property title",properties.findById(propertyId).orElseThrow().getName());
        assertEquals(1,properties.findByOwner_UserIdOrderByPropertyIdAsc(owner.getUserId()).size());assertTrue(physicalRooms.existsById(room.getRoomId()));assertTrue(roomTypes.existsById(type.getRoomTypeId()));
        assertEquals(1,json.readTree(propertyDetail(host,"").body()).path("data").path("records").size());assertEquals(409,propertyEdit(host,base).statusCode());
        var published=client.send(HttpRequest.newBuilder(uri("/api/public/properties")).GET().build(),HttpResponse.BodyHandlers.ofString());assertTrue(published.body().contains("Updated property title"));
    }

    @Test void publicHomeOnlyExposesPublishedPropertiesAndListingPhotos() throws Exception {
        var owner=account(UserRole.ROOM_HOST);
        var registration=registrations.save(PropertyRegistration.builder().user(owner).name("Public approved test")
            .status(RegistrationStatus.APPROVED).registrationDetails(json.writeValueAsString(registrationDetails())).build());
        var property=properties.save(Property.builder().owner(owner).registration(registration).name("Public approved test").address("Tân Xã")
            .status("ACTIVE").description("Description for public listing").build());
        var type=roomTypes.save(RoomType.builder().property(property).roomType("Public studio").price(new BigDecimal("2400000")).amenitiesJson("[\"wifi\"]").build());
        physicalRooms.save(Room.builder().property(property).roomType(type).roomNumber("Public101").floor("Tầng 1").status("VACANT").customPrice(new BigDecimal("2100000")).build());
        physicalRooms.save(Room.builder().property(property).roomType(type).roomNumber("Public102").floor("Tầng 1").status("OCCUPIED").build());
        var photo=documents.save(PropertyDocument.builder().registration(registration).documentType("PHOTO_0").contentType("image/png").fileContent(new byte[]{1,2,3}).build());
        var privateDoc=documents.save(PropertyDocument.builder().registration(registration).documentType("ID_CARD").fileName("private-id.pdf").contentType("application/pdf").fileContent(new byte[]{4,5}).build());
        var pending=registrations.save(PropertyRegistration.builder().user(owner).name("Unapproved property").status(RegistrationStatus.PENDING).registrationDetails(json.writeValueAsString(registrationDetails())).build());
        var hidden=properties.save(Property.builder().owner(owner).registration(pending).name("Unapproved property").status("ACTIVE").build());
        var hiddenImage=documents.save(PropertyDocument.builder().registration(pending).documentType("PHOTO_0").contentType("image/png").fileContent(new byte[]{1}).build());
        var response=client.send(HttpRequest.newBuilder(uri("/api/public/properties")).GET().build(),HttpResponse.BodyHandlers.ofString());
        assertEquals(200,response.statusCode());
        var rows=json.readTree(response.body()).path("data");
        boolean found=false;
        for(var row:rows){
            assertNotEquals(hidden.getPropertyId().intValue(),row.path("propertyId").asInt());
            if(row.path("propertyId").asInt()==property.getPropertyId()){
                found=true;assertEquals(2,row.path("totalRooms").asInt());assertEquals(1,row.path("vacantRooms").asInt());
                assertEquals(2100000,row.path("minPrice").asInt());assertFalse(row.has("phone"));assertFalse(row.has("owner"));
                assertEquals(1,row.path("photos").size());assertFalse(row.toString().contains("private-id.pdf"));
            }
        }
        assertTrue(found);
        assertEquals(200,client.send(HttpRequest.newBuilder(uri("/api/public/properties/photos/"+photo.getDocumentId())).GET().build(),HttpResponse.BodyHandlers.ofByteArray()).statusCode());
        for(var id:java.util.List.of(privateDoc.getDocumentId(),hiddenImage.getDocumentId()))
            assertEquals(404,client.send(HttpRequest.newBuilder(uri("/api/public/properties/photos/"+id)).GET().build(),HttpResponse.BodyHandlers.ofByteArray()).statusCode());
        property.setStatus("INACTIVE");properties.saveAndFlush(property);
        assertEquals(404,client.send(HttpRequest.newBuilder(uri("/api/public/properties/photos/"+photo.getDocumentId())).GET().build(),HttpResponse.BodyHandlers.ofByteArray()).statusCode());
    }

    private User account(UserRole role) {
        return users.save(User.builder().email("dashboard-" + System.nanoTime() + "@hlrcs.test")
                .fullName("Dashboard test " + role).passwordHash(encoder.encode("Dashboard@123"))
                .role(role).status(UserStatus.ACTIVE).build());
    }
    private String token(User user) throws Exception {
        var request = HttpRequest.newBuilder(uri("/api/auth/login")).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(Map.of("email", user.getEmail(), "password", "Dashboard@123")))).build();
        var response = client.send(request, HttpResponse.BodyHandlers.ofString());
        assertEquals(200, response.statusCode());
        return json.readTree(response.body()).path("data").path("accessToken").asString();
    }
    private URI uri(String path) { return URI.create("http://localhost:" + environment.getProperty("local.server.port") + path); }
    private HttpResponse<String> staffGet(String token, String path) throws Exception {
        var request = HttpRequest.newBuilder(uri("/api/staff" + path));
        if (token != null) request.header("Authorization", "Bearer " + token);
        return client.send(request.GET().build(), HttpResponse.BodyHandlers.ofString());
    }
    private HttpResponse<String> staffReview(String token, int id, String decision, String note) throws Exception {
        return client.send(HttpRequest.newBuilder(uri("/api/staff/verifications/" + id + "/review"))
                .header("Authorization", "Bearer " + token).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(Map.of("decision", decision, "note", note)))).build(), HttpResponse.BodyHandlers.ofString());
    }
    @Test void staffDashboardAndDetailReadTheFullSubmittedRegistration() throws Exception {
        String hostToken = token(account(UserRole.ROOM_HOST));
        int id = json.readTree(submitRegistration(hostToken, registrationDetails(), true, false).body()).path("data").path("registrationId").asInt();
        String staffToken = token(account(UserRole.STAFF));
        var dashboard = staffGet(staffToken, "/dashboard");
        assertEquals(200, dashboard.statusCode(), dashboard.body());
        var dashboardData = json.readTree(dashboard.body()).path("data");
        assertTrue(dashboardData.path("pendingVerifications").asInt() > 0);
        assertTrue(dashboardData.path("pendingFeedback").isNull());
        assertTrue(dashboardData.path("slaPercent").isNull());
        assertTrue(dashboard.body().contains("/staff/verifications/detail?id=" + id));
        assertEquals(200, staffGet(staffToken, "/verifications").statusCode());
        var detail = staffGet(staffToken, "/verifications/" + id);
        assertEquals(200, detail.statusCode(), detail.body());
        var data = json.readTree(detail.body()).path("data");
        assertEquals("New registered property", data.path("submission").path("name").asString());
        assertEquals("21.0188", data.path("submission").path("latitude").asString());
        assertTrue(data.path("submission").path("termsAccepted").asBoolean());
        assertEquals(2, data.path("documents").size());
        assertTrue(data.path("summary").path("ownerId").asInt()>0);
        assertTrue(data.path("documents").get(0).path("fileSize").asLong()>0);
        assertFalse(data.path("documents").get(0).path("uploadedAt").isNull());
        assertEquals("application/pdf",data.path("documents").get(0).path("contentType").asString());
        assertFalse(detail.body().contains("fileContent"));
        int fileId = data.path("documents").get(0).path("documentId").asInt();
        String filePath = "/verifications/" + id + "/files/" + fileId;
        var file = staffGet(staffToken, filePath);
        assertEquals(200, file.statusCode());
        assertTrue(file.body().startsWith("%PDF-"));
        assertEquals("private, no-store", file.headers().firstValue("Cache-Control").orElse(""));
        assertEquals(404, staffGet(staffToken, "/verifications/2147483647/files/" + fileId).statusCode());
        assertEquals(403, staffGet(hostToken, filePath).statusCode());
        assertEquals(401, staffGet(null, "/dashboard").statusCode());
        assertEquals(403, staffGet(token(account(UserRole.USER)), "/verifications").statusCode());
        assertEquals(200, staffGet(token(account(UserRole.ADMIN)), "/dashboard").statusCode());
        assertEquals(404, staffGet(staffToken, "/verifications/2147483647").statusCode());
    }
    @Test void approvingRegistrationPublishesPropertyAndRecordsAuditOnce() throws Exception {
        var owner = account(UserRole.ROOM_HOST);
        String hostToken = token(owner);
        int id = json.readTree(submitRegistration(hostToken, registrationDetails(), true, false).body()).path("data").path("registrationId").asInt();
        String staffToken = token(account(UserRole.STAFF));
        var operation = (java.util.function.Supplier<Integer>) () -> {
            try { return staffReview(staffToken, id, "APPROVE", "Verified documents").statusCode(); }
            catch (Exception exception) { throw new RuntimeException(exception); }
        };
        var first = java.util.concurrent.CompletableFuture.supplyAsync(operation);
        var second = java.util.concurrent.CompletableFuture.supplyAsync(operation);
        var codes = new java.util.ArrayList<>(java.util.List.of(first.get(), second.get()));
        codes.sort(Integer::compareTo);
        assertEquals(java.util.List.of(200,409), codes);
        assertEquals(RegistrationStatus.APPROVED, registrations.findById(id).orElseThrow().getStatus());
        assertEquals(1, properties.findByOwner_UserIdOrderByPropertyIdAsc(owner.getUserId()).size());
        assertEquals("VISIBLE", json.readTree(propertyDetail(hostToken, "").body()).path("data").path("records").get(0).path("displayStatus").asString());
        assertEquals(1, moderationLogs.findByTargetTypeAndTargetIdOrderByCreatedAtDesc("PROPERTY_REGISTRATION", id).size());
        assertEquals(409, staffReview(staffToken, id, "REJECT", "Cannot process again").statusCode());
    }
    @Test void rejectionRequiresReasonAndDoesNotPublishProperty() throws Exception {
        var owner = account(UserRole.ROOM_HOST);
        String hostToken = token(owner);
        int id = json.readTree(submitRegistration(hostToken, registrationDetails(), true, false).body()).path("data").path("registrationId").asInt();
        String staffToken = token(account(UserRole.STAFF));
        assertEquals(403, staffReview(hostToken, id, "APPROVE", "").statusCode());
        assertEquals(400, staffReview(staffToken, id, "REJECT", "short").statusCode());
        assertEquals(400, staffReview(staffToken, id, "INVALID", "not allowed").statusCode());
        assertEquals(RegistrationStatus.PENDING, registrations.findById(id).orElseThrow().getStatus());
        var response = staffReview(staffToken, id, "REJECT", "The identity document is not legible.");
        assertEquals(200, response.statusCode(), response.body());
        assertEquals("REJECTED", json.readTree(response.body()).path("data").path("summary").path("status").asString());
        assertEquals(0, properties.findByOwner_UserIdOrderByPropertyIdAsc(owner.getUserId()).size());
        assertEquals("REJECTED", json.readTree(propertyDetail(hostToken, "").body()).path("data").path("records").get(0).path("displayStatus").asString());
    }
    @Test void supplementRequestIsValidatedPersistedAndVisibleOnlyToItsOwner() throws Exception {
        var owner = account(UserRole.ROOM_HOST);
        String hostToken = token(owner);
        int id = json.readTree(submitRegistration(hostToken, registrationDetails(), true, false).body()).path("data").path("registrationId").asInt();
        String staffToken = token(account(UserRole.STAFF));
        String note = "Please provide a clearer scan of the ownership document.";
        assertEquals(403, staffReview(hostToken, id, "REQUEST_SUPPLEMENT", note).statusCode());
        for (String invalid : java.util.List.of("", "         ", "short", "x".repeat(2001))) {
            assertEquals(400, staffReview(staffToken, id, "REQUEST_SUPPLEMENT", invalid).statusCode());
        }
        assertEquals(RegistrationStatus.PENDING, registrations.findById(id).orElseThrow().getStatus());
        var result = staffReview(staffToken, id, "REQUEST_SUPPLEMENT", "  " + note + "  ");
        assertEquals(200, result.statusCode(), result.body());
        var data = json.readTree(result.body()).path("data");
        assertEquals("NEEDS_SUPPLEMENT", data.path("summary").path("status").asString());
        assertEquals(note, data.path("reasonNote").asString());
        assertFalse(data.path("summary").path("reviewedAt").isNull());
        assertEquals("REQUESTED_SUPPLEMENT", data.path("history").get(0).path("action").asString());
        assertEquals(0, properties.findByOwner_UserIdOrderByPropertyIdAsc(owner.getUserId()).size());
        var hostData = json.readTree(propertyDetail(hostToken, "").body()).path("data").path("records").get(0);
        assertEquals("NEEDS_SUPPLEMENT", hostData.path("displayStatus").asString());
        assertEquals(note, hostData.path("reasonNote").asString());
        assertEquals(note, json.readTree(currentRegistration(hostToken).body()).path("data").path("reasonNote").asString());
        assertEquals(0, json.readTree(propertyDetail(token(account(UserRole.ROOM_HOST)), "").body()).path("data").path("records").size());
        assertEquals(409, staffReview(staffToken, id, "REQUEST_SUPPLEMENT", note).statusCode());
        assertEquals(409, submitRegistration(hostToken, registrationDetails(), true, false).statusCode());
        assertEquals(1, moderationLogs.findByTargetTypeAndTargetIdOrderByCreatedAtDesc("PROPERTY_REGISTRATION", id).size());
        assertEquals(200, staffReview(staffToken, id, "APPROVE", "Verified existing documents").statusCode());
        assertEquals(409, staffReview(staffToken, id, "REQUEST_SUPPLEMENT", note).statusCode());
    }
    private HttpResponse<String> propertyDetail(String token, String query) throws Exception {
        var request = HttpRequest.newBuilder(uri("/api/host/property" + query));
        if (token != null) request.header("Authorization", "Bearer " + token);
        return client.send(request.GET().build(), HttpResponse.BodyHandlers.ofString());
    }
    @Test void propertyDetailEmptyAndPermissionsAreReal() throws Exception {
        var hostToken = token(account(UserRole.ROOM_HOST));
        var response = propertyDetail(hostToken, "");
        assertEquals(200, response.statusCode(), response.body());
        assertEquals(0, json.readTree(response.body()).path("data").path("records").size());
        assertEquals(400, propertyDetail(hostToken, "?id=abc").statusCode());
        assertEquals(404, propertyDetail(hostToken, "?id=2147483647").statusCode());
        assertEquals(401, propertyDetail(null, "").statusCode());
        assertEquals(403, propertyDetail(token(account(UserRole.USER)), "").statusCode());
    }
    @Test void pendingPropertyRetainsFullInformationAndPhotosStayOwnerPrivate() throws Exception {
        var host = account(UserRole.ROOM_HOST);
        String hostToken = token(host);
        assertEquals(200, submitRegistration(hostToken, registrationDetails(), true, false).statusCode());
        var response = propertyDetail(hostToken, "");
        assertEquals(200, response.statusCode(), response.body());
        var record = json.readTree(response.body()).path("data").path("records").get(0);
        assertEquals("PENDING", record.path("displayStatus").asString());
        assertTrue(record.path("propertyId").isNull());
        assertEquals("Owner name", record.path("managerName").asString());
        assertEquals("wifi", record.path("amenities").get(0).asString());
        assertEquals(1, record.path("photos").size());
        assertEquals(2, record.path("documents").size());
        assertFalse(record.path("verified").asBoolean());
        assertTrue(record.path("totalRooms").isNull());
        assertFalse(response.body().contains("fileContent"));
        assertFalse(response.body().contains("termsAccepted"));
        String photoPath = "/api/host/property/photos/" + record.path("photos").get(0).path("documentId").asInt();
        var photo = client.send(HttpRequest.newBuilder(uri(photoPath)).header("Authorization", "Bearer " + hostToken).GET().build(), HttpResponse.BodyHandlers.ofByteArray());
        assertEquals(200, photo.statusCode());
        assertEquals("image/png", photo.headers().firstValue("Content-Type").orElse(""));
        assertEquals(137, photo.body()[0] & 255);
        var otherToken = token(account(UserRole.ROOM_HOST));
        var denied = client.send(HttpRequest.newBuilder(uri(photoPath)).header("Authorization", "Bearer " + otherToken).GET().build(), HttpResponse.BodyHandlers.ofString());
        assertEquals(404, denied.statusCode());
        int privateDocumentId = record.path("documents").get(0).path("documentId").asInt();
        var privateDocument = client.send(HttpRequest.newBuilder(uri("/api/host/property/photos/" + privateDocumentId)).header("Authorization", "Bearer " + hostToken).GET().build(), HttpResponse.BodyHandlers.ofString());
        assertEquals(404, privateDocument.statusCode());
        assertEquals(0, json.readTree(propertyDetail(otherToken, "?ownerId=" + host.getUserId()).body()).path("data").path("records").size());
    }
    @Test void activeApprovedPropertyIsVisibleButPendingAndInactiveAreNot() throws Exception {
        var host = account(UserRole.ROOM_HOST);
        String hostToken = token(host);
        var registration = registrations.save(PropertyRegistration.builder().user(host).name("Approved property")
                .status(RegistrationStatus.APPROVED).registrationDetails(json.writeValueAsString(registrationDetails())).build());
        var property = properties.save(Property.builder().owner(host).registration(registration).name("Approved property").status("ACTIVE").build());
        roomTypes.save(RoomType.builder().property(property).roomType("Actual type").price(new BigDecimal("2200000")).build());
        var record = json.readTree(propertyDetail(hostToken, "?id=" + property.getPropertyId()).body()).path("data").path("records").get(0);
        assertEquals("VISIBLE", record.path("displayStatus").asString());
        assertTrue(record.path("verified").asBoolean());
        assertEquals(1, record.path("roomTypeCount").asInt());
        assertEquals(404, propertyDetail(token(account(UserRole.ROOM_HOST)), "?id=" + property.getPropertyId()).statusCode());
        registration.setStatus(RegistrationStatus.PENDING);
        registrations.save(registration);
        var pending = json.readTree(propertyDetail(hostToken, "").body()).path("data").path("records").get(0);
        assertEquals("PENDING", pending.path("displayStatus").asString());
        assertFalse(pending.path("verified").asBoolean());
        registration.setStatus(RegistrationStatus.APPROVED);
        registrations.save(registration);
        property.setStatus("INACTIVE");
        properties.save(property);
        assertEquals("APPROVED", json.readTree(propertyDetail(hostToken, "").body()).path("data").path("records").get(0).path("displayStatus").asString());
    }
    private Map<String, Object> registrationDetails() {
        return new java.util.HashMap<>(Map.ofEntries(Map.entry("name", "New registered property"),
                Map.entry("propertyType", "Nhà trọ truyền thống / Phòng trọ sinh viên"),
                Map.entry("description", "A clean and secure property with shared parking and good ventilation."),
                Map.entry("managerName", "Owner name"), Map.entry("contactPhone", "0912345678"),
                Map.entry("commune", "Tân Xã"), Map.entry("addressDetail", "House 18, alley 4, village 2"),
                Map.entry("latitude", "21.0188"), Map.entry("longitude", "105.5215"),
                Map.entry("amenities", java.util.List.of("wifi")), Map.entry("selectedRules", java.util.List.of("quietHours")),
                Map.entry("termsAccepted", true)));
    }
    private HttpResponse<String> submitRegistration(String token, Map<String, Object> details, boolean includeDocuments, boolean invalidPhoto) throws Exception {
        String boundary = "hlrcs-" + System.nanoTime();
        var body = new java.io.ByteArrayOutputStream();
        body.writeBytes(("--" + boundary + "\r\nContent-Disposition: form-data; name=\"details\"\r\nContent-Type: application/json\r\n\r\n").getBytes(java.nio.charset.StandardCharsets.UTF_8));
        body.writeBytes(json.writeValueAsBytes(details));
        body.writeBytes("\r\n".getBytes());
        for (String part : includeDocuments ? java.util.List.of("photos", "ownership", "idCard") : java.util.List.of("photos")) {
            boolean photo = part.equals("photos");
            body.writeBytes(("--" + boundary + "\r\nContent-Disposition: form-data; name=\"" + part + "\"; filename=\"test." + (photo ? "png" : "pdf") + "\"\r\nContent-Type: " + (photo ? "image/png" : "application/pdf") + "\r\n\r\n").getBytes());
            body.writeBytes(photo ? (invalidPhoto ? "not a photo".getBytes() : java.util.Base64.getDecoder().decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jz2kAAAAASUVORK5CYII=")) : "%PDF-1.7\nTest-only document\n%%EOF".getBytes());
            body.writeBytes("\r\n".getBytes());
        }
        body.writeBytes(("--" + boundary + "--\r\n").getBytes());
        var request = HttpRequest.newBuilder(uri("/api/host/property-registrations")).header("Content-Type", "multipart/form-data; boundary=" + boundary);
        if (token != null) request.header("Authorization", "Bearer " + token);
        return client.send(request.POST(HttpRequest.BodyPublishers.ofByteArray(body.toByteArray())).build(), HttpResponse.BodyHandlers.ofString());
    }
    private HttpResponse<String> currentRegistration(String token) throws Exception {
        var request = HttpRequest.newBuilder(uri("/api/host/property-registrations/current"));
        if (token != null) request.header("Authorization", "Bearer " + token);
        return client.send(request.GET().build(), HttpResponse.BodyHandlers.ofString());
    }
    @Test void submittedRegistrationPersistsPendingAndPrivateAttachments() throws Exception {
        var host = account(UserRole.ROOM_HOST);
        String token = token(host);
        var response = submitRegistration(token, registrationDetails(), true, false);
        assertEquals(200, response.statusCode(), response.body());
        var data = json.readTree(response.body()).path("data");
        assertEquals("PENDING", data.path("status").asString());
        int id = data.path("registrationId").asInt();
        assertEquals(3, documents.countByRegistration_RegistrationId(id));
        assertTrue(registrations.findById(id).orElseThrow().getRegistrationDetails().contains("quietHours"));
        assertFalse(response.body().contains("fileContent"));
        assertEquals(id, json.readTree(currentRegistration(token).body()).path("data").path("registrationId").asInt());
        assertEquals(1, json.readTree(dashboard(token, "").body()).path("data").path("pendingRegistrationCount").asInt());
        assertEquals(0, properties.findByOwner_UserIdOrderByPropertyIdAsc(host.getUserId()).size());
        assertEquals(409, submitRegistration(token, registrationDetails(), true, false).statusCode());
        assertTrue(json.readTree(currentRegistration(token(account(UserRole.ROOM_HOST))).body()).path("data").isNull());
    }
    @Test void failedRegistrationDoesNotPersistAnything() throws Exception {
        var host = account(UserRole.ROOM_HOST);
        String token = token(host);
        var details = registrationDetails();
        details.put("termsAccepted", false);
        assertEquals(400, submitRegistration(token, details, true, false).statusCode());
        details.put("termsAccepted", true);
        details.put("latitude", "NaN");
        assertEquals(400, submitRegistration(token, details, true, false).statusCode());
        details.put("latitude", "21.0188");
        assertEquals(400, submitRegistration(token, details, false, false).statusCode());
        assertEquals(400, submitRegistration(token, details, true, true).statusCode());
        assertEquals(0, registrations.countByUser_UserIdAndStatus(host.getUserId(), RegistrationStatus.PENDING));
    }
    @Test void registrationPermissionsAreEnforcedAndExistingPropertyDoesNotBlockNewSubmission() throws Exception {
        assertEquals(401, submitRegistration(null, registrationDetails(), true, false).statusCode());
        assertEquals(403, submitRegistration(token(account(UserRole.USER)), registrationDetails(), true, false).statusCode());
        assertEquals(403, currentRegistration(token(account(UserRole.STAFF))).statusCode());
        var host = account(UserRole.ROOM_HOST);
        properties.save(Property.builder().owner(host).name("Already owned property").build());
        assertEquals(200, submitRegistration(token(host), registrationDetails(), true, false).statusCode());
        assertEquals(1, registrations.countByUser_UserIdAndStatus(host.getUserId(), RegistrationStatus.PENDING));
    }
    @Test void concurrentRegistrationRequestsCreateOnlyOnePendingRecord() throws Exception {
        var host = account(UserRole.ROOM_HOST);
        String token = token(host);
        var operation = (java.util.function.Supplier<Integer>) () -> {
            try { return submitRegistration(token, registrationDetails(), true, false).statusCode(); }
            catch (Exception exception) { throw new RuntimeException(exception); }
        };
        var first = java.util.concurrent.CompletableFuture.supplyAsync(operation);
        var second = java.util.concurrent.CompletableFuture.supplyAsync(operation);
        var statuses = new java.util.ArrayList<>(java.util.List.of(first.get(), second.get()));
        statuses.sort(Integer::compareTo);
        assertEquals(java.util.List.of(200, 409), statuses);
        assertEquals(1, registrations.countByUser_UserIdAndStatus(host.getUserId(), RegistrationStatus.PENDING));
    }
    private HttpResponse<String> dashboard(String token, String query) throws Exception {
        var request = HttpRequest.newBuilder(uri("/api/host/dashboard" + query));
        if (token != null) request.header("Authorization", "Bearer " + token);
        return client.send(request.GET().build(), HttpResponse.BodyHandlers.ofString());
    }
    @Test void newHostReceivesVerifiedEmptyData() throws Exception {
        var response = dashboard(token(account(UserRole.ROOM_HOST)), "");
        assertEquals(200, response.statusCode(), response.body());
        var data = json.readTree(response.body()).path("data");
        assertEquals(0, data.path("properties").size());
        assertEquals(0, data.path("roomTypeCount").asInt());
        assertEquals(0, data.path("recentViewings").size());
        assertEquals(0, data.path("pendingRegistrationCount").asInt());
    }
    @Test void pendingRegistrationIsNotTreatedAsNoRegistration() throws Exception {
        var host = account(UserRole.ROOM_HOST);
        registrations.save(PropertyRegistration.builder().user(host).name("Pending test property").status(RegistrationStatus.PENDING).build());
        var response = dashboard(token(host), "");
        assertEquals(200, response.statusCode());
        var data = json.readTree(response.body()).path("data");
        assertEquals(0, data.path("properties").size());
        assertEquals(1, data.path("pendingRegistrationCount").asInt());
    }
    @Test void dashboardIsScopedToAuthenticatedOwner() throws Exception {
        var hostA = account(UserRole.ROOM_HOST);
        var hostB = account(UserRole.ROOM_HOST);
        var renter = account(UserRole.USER);
        var property = properties.save(Property.builder().owner(hostA).name("Private property A").address("Owner A address").status("ACTIVE").build());
        var type = roomTypes.save(RoomType.builder().property(property).roomType("Private room type A").price(new BigDecimal("2500000")).build());
        bookings.save(Booking.builder().renter(renter).roomType(type).status(BookingStatus.PENDING).scheduledDate(LocalDateTime.now().plusDays(1)).build());
        var a = dashboard(token(hostA), "");
        assertEquals(200, a.statusCode(), a.body());
        var dataA = json.readTree(a.body()).path("data");
        assertEquals("Private property A", dataA.path("properties").get(0).path("name").asString());
        assertEquals(2500000, dataA.path("properties").get(0).path("minimumPrice").asInt());
        assertEquals(1, dataA.path("roomTypeCount").asInt());
        assertEquals(1, dataA.path("pendingViewingCount").asInt());
        assertEquals(1, dataA.path("recentViewings").size());
        var b = dashboard(token(hostB), "?ownerId=" + hostA.getUserId());
        assertEquals(200, b.statusCode());
        var dataB = json.readTree(b.body()).path("data");
        assertEquals(0, dataB.path("properties").size());
        assertEquals(0, dataB.path("recentViewings").size());
        assertEquals(0, dataB.path("roomTypeCount").asInt());
        assertEquals(0, dataB.path("pendingViewingCount").asInt());
        assertFalse(b.body().contains("Private property A"));
    }
    private HttpResponse<String> hostGet(String token, String path) throws Exception {
        return client.send(HttpRequest.newBuilder(uri("/api/host" + path)).header("Authorization", "Bearer " + token).GET().build(), HttpResponse.BodyHandlers.ofString());
    }
    private HttpResponse<String> createType(String token, Map<String,Object> value) throws Exception {
        var request = HttpRequest.newBuilder(uri("/api/host/room-types")).header("Content-Type", "application/json");
        if (token != null) request.header("Authorization", "Bearer " + token);
        return client.send(request.POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(value))).build(), HttpResponse.BodyHandlers.ofString());
    }
    private Map<String,Object> typeDetails(Integer propertyId) {
        return new java.util.HashMap<>(Map.ofEntries(Map.entry("propertyId",propertyId), Map.entry("roomType","Studio with balcony"),
                Map.entry("price",2200000), Map.entry("areaSqm",25.5), Map.entry("capacity",2), Map.entry("amenities",java.util.List.of("airConditioner","wifi")),
                Map.entry("description","Actual test description"), Map.entry("electricityPrice",3500), Map.entry("waterPrice",30000), Map.entry("internetPrice",100000), Map.entry("servicePrice",50000)));
    }
    @Test void ownerCanRegisterAndApproveMultiplePropertiesWithoutMixingTheirRooms() throws Exception {
        var host = account(UserRole.ROOM_HOST);
        String hostToken = token(host);
        assertTrue(json.readTree(hostGet(hostToken,"/property-registrations/eligibility").body()).path("data").path("canRegister").asBoolean());
        int id = json.readTree(submitRegistration(hostToken,registrationDetails(),true,false).body()).path("data").path("registrationId").asInt();
        var second=registrationDetails();second.put("name","Second registered property");second.put("addressDetail","House number 22, separate location");
        var secondResponse=submitRegistration(hostToken,second,true,false);assertEquals(200,secondResponse.statusCode(),secondResponse.body());
        int secondId=json.readTree(secondResponse.body()).path("data").path("registrationId").asInt();
        assertEquals(2,json.readTree(propertyDetail(hostToken,"").body()).path("data").path("records").size());
        var staffToken=token(account(UserRole.STAFF));
        assertEquals(200,staffReview(staffToken,id,"APPROVE","").statusCode());
        assertEquals(200,staffReview(staffToken,secondId,"APPROVE","").statusCode());
        assertEquals(409,staffReview(staffToken,secondId,"APPROVE","").statusCode());
        var eligibility = json.readTree(hostGet(hostToken,"/property-registrations/eligibility").body()).path("data");
        assertTrue(eligibility.path("canRegister").asBoolean());
        assertEquals("ELIGIBLE",eligibility.path("reason").asString());
        assertEquals(200,currentRegistration(hostToken).statusCode());
        assertEquals(409,submitRegistration(hostToken,registrationDetails(),true,false).statusCode());
        var owned=properties.findByOwner_UserIdOrderByPropertyIdAsc(host.getUserId());assertEquals(2,owned.size());
        for(var property:owned){
            var created=batchType(hostToken,typeDetails(property.getPropertyId()),java.util.List.of(Map.of("roomNumber","P.101","floor","Tầng 1")),java.util.List.of());
            assertEquals(200,created.statusCode(),created.body());
            assertEquals(property.getPropertyId(),json.readTree(created.body()).path("data").path("rooms").get(0).path("propertyId").asInt());
        }
        var firstTypes=json.readTree(roomTypeList(hostToken,"?propertyId="+owned.get(0).getPropertyId()).body()).path("data");assertEquals(1,firstTypes.path("roomTypes").size());
        var firstRooms=json.readTree(hostGet(hostToken,"/rooms?propertyId="+owned.get(0).getPropertyId()).body()).path("data").path("rooms");assertEquals(1,firstRooms.size());assertEquals(owned.get(0).getPropertyId(),firstRooms.get(0).path("propertyId").asInt());
        var third=registrationDetails();third.put("name","Third pending property");
        var thirdResponse=submitRegistration(hostToken,third,true,false);assertEquals(200,thirdResponse.statusCode());
        int thirdId=json.readTree(thirdResponse.body()).path("data").path("registrationId").asInt();
        assertEquals(200,staffReview(staffToken,thirdId,"REQUEST_SUPPLEMENT","Please add more ownership documents").statusCode());
        var fourth=registrationDetails();fourth.put("name","Fourth independent property");assertEquals(200,submitRegistration(hostToken,fourth,true,false).statusCode());
        var records=json.readTree(propertyDetail(hostToken,"").body()).path("data").path("records");assertEquals(4,records.size());
        assertEquals("NEEDS_SUPPLEMENT",records.get(3).path("displayStatus").asString());
        assertEquals(0,json.readTree(propertyDetail(token(account(UserRole.ROOM_HOST)),"").body()).path("data").path("records").size());
        assertTrue(json.readTree(hostGet(hostToken,"/property-registrations/eligibility").body()).path("data").path("canRegister").asBoolean());
    }
    @Test void roomTypeCreationPersistsEveryFieldAndUsesAuthenticatedOwner() throws Exception {
        var owner = account(UserRole.ROOM_HOST);
        var property = properties.save(Property.builder().owner(owner).name("Owned property").status("ACTIVE").build());
        String ownerToken = token(owner);
        var details = typeDetails(property.getPropertyId());
        details.put("imageUrl","https://example.test/real-image.jpg");
        var result = createType(ownerToken,details);
        assertEquals(200,result.statusCode(),result.body());
        var data = json.readTree(result.body()).path("data");
        assertEquals(2200000,data.path("deposit").asInt());
        assertEquals(2,data.path("capacity").asInt());
        assertEquals(3500,data.path("electricityPrice").asInt());
        assertEquals(30000,data.path("waterPrice").asInt());
        assertEquals(100000,data.path("internetPrice").asInt());
        assertEquals(50000,data.path("servicePrice").asInt());
        assertEquals(2,data.path("amenities").size());
        assertEquals("https://example.test/real-image.jpg",data.path("imageUrl").asString());
        assertEquals(0,data.path("totalRooms").asInt());
        assertEquals(data.path("roomTypeId").asInt(),json.readTree(roomTypeList(ownerToken,"").body()).path("data").path("roomTypes").get(0).path("roomTypeId").asInt());
        assertEquals(401,createType(null,details).statusCode());
        assertEquals(403,createType(token(account(UserRole.USER)),details).statusCode());
        assertEquals(404,createType(token(account(UserRole.ROOM_HOST)),details).statusCode());
        assertEquals(409,createType(ownerToken,details).statusCode());
        assertEquals(1,roomTypes.findByProperty_Owner_UserId(owner.getUserId()).size());
    }
    @Test void roomTypeValidationAndPendingPropertyCannotCreateData() throws Exception {
        var owner = account(UserRole.ROOM_HOST);
        var property = properties.save(Property.builder().owner(owner).name("Validation property").status("ACTIVE").build());
        String ownerToken = token(owner);
        for (var invalid : java.util.List.of(Map.entry("roomType",(Object)"  "), Map.entry("areaSqm",(Object)0), Map.entry("capacity",(Object)21),
                Map.entry("price",(Object)(-1)), Map.entry("deposit",(Object)(-1)), Map.entry("electricityPrice",(Object)"free"),
                Map.entry("imageUrl",(Object)"javascript:alert(1)"), Map.entry("imageUrl",(Object)"https://user:pass@example.test/a.jpg"),
                Map.entry("amenities",(Object)java.util.List.of("invalid")), Map.entry("description",(Object)"x".repeat(2001)))) {
            var data = typeDetails(property.getPropertyId()); data.put(invalid.getKey(),invalid.getValue());
            assertEquals(400,createType(ownerToken,data).statusCode(),invalid.getKey());
        }
        assertEquals(0,roomTypes.findByProperty_Owner_UserId(owner.getUserId()).size());
        property.setStatus("PENDING");properties.save(property);
        assertEquals(409,createType(ownerToken,typeDetails(property.getPropertyId())).statusCode());
        var fresh = account(UserRole.ROOM_HOST);
        assertEquals(404,createType(token(fresh),typeDetails(property.getPropertyId())).statusCode());
    }
    @Test void concurrentTypeRequestsCannotDuplicateTheSameName() throws Exception {
        var owner=account(UserRole.ROOM_HOST);
        var property=properties.save(Property.builder().owner(owner).name("Concurrent property").status("ACTIVE").build());
        String ownerToken=token(owner);
        var operation=(java.util.function.Supplier<Integer>)()->{try{return createType(ownerToken,typeDetails(property.getPropertyId())).statusCode();}catch(Exception error){throw new RuntimeException(error);}};
        var first=java.util.concurrent.CompletableFuture.supplyAsync(operation);
        var second=java.util.concurrent.CompletableFuture.supplyAsync(operation);
        var codes=new java.util.ArrayList<>(java.util.List.of(first.get(),second.get()));codes.sort(Integer::compareTo);
        assertEquals(java.util.List.of(200,409),codes);
        assertEquals(1,roomTypes.findByProperty_Owner_UserId(owner.getUserId()).size());
    }
    private record TestImage(String name,String mime,byte[] bytes) {}
    private TestImage testImage() {
        return new TestImage("room.png","image/png",java.util.Base64.getDecoder().decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jz2kAAAAASUVORK5CYII="));
    }
    private HttpResponse<String> typeMultipart(String token,Integer id,Map<String,Object> value,java.util.List<TestImage> files) throws Exception {
        String boundary="room-type-"+System.nanoTime();var body=new java.io.ByteArrayOutputStream();
        body.writeBytes(("--"+boundary+"\r\nContent-Disposition: form-data; name=\"details\"\r\nContent-Type: application/json\r\n\r\n").getBytes());
        body.writeBytes(json.writeValueAsBytes(value));body.writeBytes("\r\n".getBytes());
        for(var file:files){
            body.writeBytes(("--"+boundary+"\r\nContent-Disposition: form-data; name=\"photos\"; filename=\""+file.name()+"\"\r\nContent-Type: "+file.mime()+"\r\n\r\n").getBytes());
            body.writeBytes(file.bytes());body.writeBytes("\r\n".getBytes());
        }
        body.writeBytes(("--"+boundary+"--\r\n").getBytes());
        return client.send(HttpRequest.newBuilder(uri("/api/host/room-types"+(id==null?"":"/"+id))).header("Authorization","Bearer "+token).header("Content-Type","multipart/form-data; boundary="+boundary)
                .method(id==null?"POST":"PUT",HttpRequest.BodyPublishers.ofByteArray(body.toByteArray())).build(),HttpResponse.BodyHandlers.ofString());
    }
    private HttpResponse<String> deleteType(String token,int id) throws Exception {
        return client.send(HttpRequest.newBuilder(uri("/api/host/room-types/"+id)).header("Authorization","Bearer "+token).DELETE().build(),HttpResponse.BodyHandlers.ofString());
    }
    private HttpResponse<String> batchType(String auth,Map<String,Object> details,java.util.List<Map<String,String>> drafts,java.util.List<TestImage> photos) throws Exception {
        String boundary="batch-"+System.nanoTime();var body=new java.io.ByteArrayOutputStream();
        for(var part:Map.of("details",(Object)details,"layout",(Object)Map.of("rooms",drafts)).entrySet()){
            body.writeBytes(("--"+boundary+"\r\nContent-Disposition: form-data; name=\""+part.getKey()+"\"\r\nContent-Type: application/json\r\n\r\n").getBytes());
            body.writeBytes(json.writeValueAsBytes(part.getValue()));body.writeBytes("\r\n".getBytes());
        }
        for(var photo:photos){body.writeBytes(("--"+boundary+"\r\nContent-Disposition: form-data; name=\"photos\"; filename=\""+photo.name()+"\"\r\nContent-Type: "+photo.mime()+"\r\n\r\n").getBytes());body.writeBytes(photo.bytes());body.writeBytes("\r\n".getBytes());}
        body.writeBytes(("--"+boundary+"--\r\n").getBytes());
        return client.send(HttpRequest.newBuilder(uri("/api/host/room-types/with-rooms")).header("Authorization","Bearer "+auth).header("Content-Type","multipart/form-data; boundary="+boundary).POST(HttpRequest.BodyPublishers.ofByteArray(body.toByteArray())).build(),HttpResponse.BodyHandlers.ofString());
    }
    @Test void batchTypePersistsFinalPreviewAndRollsBackConflicts() throws Exception {
        var owner=account(UserRole.ROOM_HOST);var auth=token(owner);
        var property=properties.save(Property.builder().owner(owner).name("Batch owned property").status("ACTIVE").build());
        var drafts=java.util.List.of(Map.of("roomNumber"," p.301 ","floor"," Tầng 3 "),Map.of("roomNumber","P.302","floor","Tầng 3"));
        var result=batchType(auth,typeDetails(property.getPropertyId()),drafts,java.util.List.of(testImage()));
        assertEquals(200,result.statusCode(),result.body());var created=json.readTree(result.body()).path("data");
        assertEquals(2,created.path("totalRooms").asInt());assertEquals(2,created.path("vacantRooms").asInt());assertEquals(1,created.path("images").size());
        assertEquals("P.301",created.path("rooms").get(0).path("roomNumber").asString());
        for(var room:created.path("rooms")){assertEquals("VACANT",room.path("status").asString());assertEquals(2200000,room.path("price").asInt());assertEquals(created.path("roomTypeId").asInt(),room.path("roomTypeId").asInt());}
        var conflict=typeDetails(property.getPropertyId());conflict.put("roomType","Must rollback batch");
        long imagesBefore=typeImages.count();
        assertEquals(409,batchType(auth,conflict,drafts,java.util.List.of(testImage())).statusCode());
        assertEquals(1,roomTypes.findByProperty_Owner_UserId(owner.getUserId()).size());assertEquals(imagesBefore,typeImages.count());
        assertEquals(2,physicalRooms.findByProperty_Owner_UserIdOrderByRoomNumberAsc(owner.getUserId()).size());
        assertEquals(404,batchType(token(account(UserRole.ROOM_HOST)),conflict,drafts,java.util.List.of()).statusCode());
        assertEquals(403,batchType(token(account(UserRole.USER)),conflict,drafts,java.util.List.of()).statusCode());
    }
    @Test void invalidBatchCannotLeavePartialTypesOrRooms() throws Exception {
        var owner=account(UserRole.ROOM_HOST);var auth=token(owner);var property=properties.save(Property.builder().owner(owner).name("Invalid batch property").status("ACTIVE").build());
        var draft=Map.of("roomNumber","A.1","floor","Tầng 1");
        assertEquals(400,batchType(auth,typeDetails(property.getPropertyId()),java.util.List.of(),java.util.List.of()).statusCode());
        assertEquals(400,batchType(auth,typeDetails(property.getPropertyId()),java.util.List.of(draft,Map.of("roomNumber","a.1","floor","2")),java.util.List.of()).statusCode());
        assertEquals(400,batchType(auth,typeDetails(property.getPropertyId()),java.util.Collections.nCopies(201,draft),java.util.List.of()).statusCode());
        assertEquals(400,batchType(auth,typeDetails(property.getPropertyId()),java.util.List.of(draft),java.util.List.of(new TestImage("bad.jpg","image/jpeg","bad".getBytes()))).statusCode());
        assertEquals(0,roomTypes.findByProperty_Owner_UserId(owner.getUserId()).size());assertEquals(0,physicalRooms.findByProperty_Owner_UserIdOrderByRoomNumberAsc(owner.getUserId()).size());
    }
    @Test void multipleImagesArePrivateToTheirTypeAndEditsReplaceOnlyChosenImages() throws Exception {
        var owner=account(UserRole.ROOM_HOST);var property=properties.save(Property.builder().owner(owner).name("Image property").status("ACTIVE").build());String auth=token(owner);
        var result=typeMultipart(auth,null,typeDetails(property.getPropertyId()),java.util.List.of(testImage(),testImage()));
        assertEquals(200,result.statusCode(),result.body());var data=json.readTree(result.body()).path("data");
        int id=data.path("roomTypeId").asInt();int imageId=data.path("images").get(0).path("imageId").asInt();int removedId=data.path("images").get(1).path("imageId").asInt();
        assertEquals(2,data.path("images").size());assertFalse(result.body().contains("fileContent"));
        var binary=hostGet(auth,"/room-types/"+id+"/images/"+imageId);assertEquals(200,binary.statusCode());
        assertEquals("image/png",binary.headers().firstValue("Content-Type").orElse(""));
        assertEquals("private, no-store",binary.headers().firstValue("Cache-Control").orElse(""));
        assertEquals(404,hostGet(token(account(UserRole.ROOM_HOST)),"/room-types/"+id+"/images/"+imageId).statusCode());
        assertEquals(403,hostGet(token(account(UserRole.STAFF)),"/room-types/"+id).statusCode());
        var secondData=typeDetails(property.getPropertyId());secondData.put("roomType","Another type");
        int otherId=json.readTree(typeMultipart(auth,null,secondData,java.util.List.of(testImage())).body()).path("data").path("roomTypeId").asInt();
        assertEquals(404,hostGet(auth,"/room-types/"+otherId+"/images/"+imageId).statusCode());
        var edited=typeDetails(property.getPropertyId());edited.put("roomType","Edited studio");edited.put("retainedImageIds",java.util.List.of(imageId));edited.put("price",2600000);
        var changed=typeMultipart(auth,id,edited,java.util.List.of(testImage()));assertEquals(200,changed.statusCode(),changed.body());
        assertEquals(2,json.readTree(changed.body()).path("data").path("images").size());
        assertEquals(2600000,json.readTree(hostGet(auth,"/room-types/"+id).body()).path("data").path("price").asInt());
        assertEquals(404,hostGet(auth,"/room-types/"+id+"/images/"+removedId).statusCode());
        var duplicate=new java.util.HashMap<>(edited);duplicate.put("roomType","Another type");
        assertEquals(409,typeMultipart(auth,id,duplicate,java.util.List.of()).statusCode());
        assertEquals("Edited studio",roomTypes.findById(id).orElseThrow().getRoomType());
        edited.put("roomType","Different edited name");edited.put("retainedImageIds",java.util.List.of(imageId));assertEquals(400,typeMultipart(auth,otherId,edited,java.util.List.of()).statusCode());
        assertEquals(404,typeMultipart(token(account(UserRole.ROOM_HOST)),id,edited,java.util.List.of()).statusCode());
        var viewer=account(UserRole.USER);wishlists.save(Wishlist.builder().user(viewer).roomType(roomTypes.findById(id).orElseThrow()).build());
        assertEquals(404,deleteType(token(account(UserRole.ROOM_HOST)),id).statusCode());
        assertEquals(200,deleteType(auth,id).statusCode());assertFalse(roomTypes.existsById(id));assertFalse(typeImages.existsById(imageId));
        assertEquals(404,hostGet(auth,"/room-types/"+id).statusCode());
        assertEquals(1,typeImages.findByRoomType_RoomTypeIdOrderByImageIdAsc(otherId).size());
    }
    @Test void invalidImagesRollBackChangesAndDeletionPreservesBookingHistory() throws Exception {
        var owner=account(UserRole.ROOM_HOST);var property=properties.save(Property.builder().owner(owner).name("Validation images").status("ACTIVE").build());String auth=token(owner);
        var details=typeDetails(property.getPropertyId());
        assertEquals(400,typeMultipart(auth,null,details,java.util.Collections.nCopies(11,testImage())).statusCode());
        assertEquals(400,typeMultipart(auth,null,details,java.util.List.of(new TestImage("bad.jpg","image/jpeg","not an image".getBytes()))).statusCode());
        assertEquals(400,typeMultipart(auth,null,details,java.util.List.of(new TestImage("huge.png","image/png",new byte[5*1024*1024+1]))).statusCode());
        assertEquals(0,roomTypes.findByProperty_Owner_UserId(owner.getUserId()).size());
        int id=json.readTree(typeMultipart(auth,null,details,java.util.List.of(testImage())).body()).path("data").path("roomTypeId").asInt();
        var type=roomTypes.findById(id).orElseThrow();var renter=account(UserRole.USER);
        bookings.save(Booking.builder().renter(renter).roomType(type).status(BookingStatus.CANCELLED).scheduledDate(LocalDateTime.now().plusDays(1)).build());
        assertEquals(409,deleteType(auth,id).statusCode());assertTrue(roomTypes.existsById(id));assertEquals(1,typeImages.findByRoomType_RoomTypeIdOrderByImageIdAsc(id).size());
        details.put("roomType","Must rollback");assertEquals(400,typeMultipart(auth,id,details,java.util.List.of(new TestImage("bad.png","image/png","bad".getBytes()))).statusCode());
        assertEquals("Studio with balcony",roomTypes.findById(id).orElseThrow().getRoomType());
    }
    private Map<String,Object> roomDetails(int typeId,String number) {
        return new java.util.HashMap<>(Map.of("roomTypeId",typeId,"roomNumber",number,"floor","Tầng 1","status","VACANT"));
    }
    private HttpResponse<String> roomWrite(String auth,String method,Integer id,Map<String,Object> data) throws Exception {
        var request=HttpRequest.newBuilder(uri("/api/host/rooms"+(id==null?"":"/"+id))).header("Content-Type","application/json");
        if(auth!=null)request.header("Authorization","Bearer "+auth);
        return client.send(request.method(method,data==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(json.writeValueAsString(data))).build(),HttpResponse.BodyHandlers.ofString());
    }
    @Test void roomsUseExistingOwnedTypeAndInheritedValuesSurviveReload() throws Exception {
        var owner=account(UserRole.ROOM_HOST);var property=properties.save(Property.builder().owner(owner).name("Rooms property").status("ACTIVE").build());String auth=token(owner);
        int typeId=json.readTree(createType(auth,typeDetails(property.getPropertyId())).body()).path("data").path("roomTypeId").asInt();
        assertEquals(0,json.readTree(hostGet(auth,"/rooms").body()).path("data").path("rooms").size());
        var created=roomWrite(auth,"POST",null,roomDetails(typeId," p.101 "));assertEquals(200,created.statusCode(),created.body());
        var value=json.readTree(created.body()).path("data");int id=value.path("roomId").asInt();
        assertEquals("P.101",value.path("roomNumber").asString());assertEquals(typeId,value.path("roomTypeId").asInt());
        assertEquals(2200000,value.path("price").asInt());assertTrue(value.path("customPrice").isNull());assertEquals(25.5,value.path("areaSqm").asDouble());
        assertEquals(2,value.path("capacity").asInt());assertEquals(2,value.path("amenities").size());assertFalse(value.path("confirmedAt").isNull());
        var rows=json.readTree(hostGet(auth,"/rooms?propertyId="+property.getPropertyId()).body()).path("data").path("rooms");assertEquals(1,rows.size());assertEquals(id,rows.get(0).path("roomId").asInt());
        var type=roomTypes.findById(typeId).orElseThrow();type.setPrice(new BigDecimal("2600000"));roomTypes.save(type);
        assertEquals(2600000,json.readTree(hostGet(auth,"/rooms").body()).path("data").path("rooms").get(0).path("price").asInt());
        var typeData=json.readTree(hostGet(auth,"/room-types/"+typeId).body()).path("data");assertEquals(1,typeData.path("totalRooms").asInt());assertEquals(1,typeData.path("vacantRooms").asInt());assertEquals(id,typeData.path("rooms").get(0).path("roomId").asInt());
        var propertyData=json.readTree(propertyDetail(auth,"").body()).path("data").path("records").get(0);assertEquals(1,propertyData.path("totalRooms").asInt());assertEquals(1,propertyData.path("vacantRooms").asInt());
        assertEquals(1,json.readTree(dashboard(auth,"").body()).path("data").path("availableRoomCount").asInt());
        var custom=roomDetails(typeId,"P.102");custom.put("customPrice",2800000);custom.put("status","OCCUPIED");
        var second=roomWrite(auth,"POST",null,custom);assertEquals(200,second.statusCode());assertEquals(2800000,json.readTree(second.body()).path("data").path("price").asInt());
        assertEquals(2,physicalRooms.countByProperty_PropertyId(property.getPropertyId()));assertEquals(1,physicalRooms.countByProperty_PropertyIdAndStatus(property.getPropertyId(),"VACANT"));
    }
    @Test void roomsRejectMissingForeignTypesBadFieldsAndDuplicateNumbers() throws Exception {
        var owner=account(UserRole.ROOM_HOST);var property=properties.save(Property.builder().owner(owner).name("Room validation").status("ACTIVE").build());String auth=token(owner);
        int typeId=json.readTree(createType(auth,typeDetails(property.getPropertyId())).body()).path("data").path("roomTypeId").asInt();
        var details=roomDetails(typeId,"P.101");
        assertEquals(401,roomWrite(null,"POST",null,details).statusCode());assertEquals(403,roomWrite(token(account(UserRole.STAFF)),"POST",null,details).statusCode());
        assertEquals(404,roomWrite(token(account(UserRole.ROOM_HOST)),"POST",null,details).statusCode());
        for(var invalid:java.util.List.of(Map.entry("roomTypeId",(Object)2147483647),Map.entry("roomNumber",(Object)"<bad>"),Map.entry("roomNumber",(Object)" "),Map.entry("floor",(Object)" "),Map.entry("status",(Object)"PENDING"),Map.entry("customPrice",(Object)(-1)),Map.entry("customPrice",(Object)1.5))){
            var data=new java.util.HashMap<>(details);data.put(invalid.getKey(),invalid.getValue());assertEquals(invalid.getKey().equals("roomTypeId")?404:400,roomWrite(auth,"POST",null,data).statusCode());
        }
        assertEquals(0,physicalRooms.countByProperty_PropertyId(property.getPropertyId()));
        assertEquals(200,roomWrite(auth,"POST",null,details).statusCode());assertEquals(409,roomWrite(auth,"POST",null,roomDetails(typeId," p.101 ")).statusCode());
        assertEquals(404,hostGet(token(account(UserRole.ROOM_HOST)),"/rooms?roomTypeId="+typeId).statusCode());
        assertEquals(400,hostGet(auth,"/rooms?roomTypeId=abc").statusCode());
        property.setStatus("INACTIVE");properties.save(property);assertEquals(409,roomWrite(auth,"POST",null,roomDetails(typeId,"P.102")).statusCode());
    }
    @Test void simultaneousRoomCreationCannotDuplicateAndLinkedTypeCannotBeDeleted() throws Exception {
        var owner=account(UserRole.ROOM_HOST);var property=properties.save(Property.builder().owner(owner).name("Concurrent rooms").status("ACTIVE").build());String auth=token(owner);
        int typeId=json.readTree(createType(auth,typeDetails(property.getPropertyId())).body()).path("data").path("roomTypeId").asInt();
        var operation=(java.util.function.Supplier<Integer>)()->{try{return roomWrite(auth,"POST",null,roomDetails(typeId,"P.101")).statusCode();}catch(Exception error){throw new RuntimeException(error);}};
        var first=java.util.concurrent.CompletableFuture.supplyAsync(operation);var second=java.util.concurrent.CompletableFuture.supplyAsync(operation);
        var codes=new java.util.ArrayList<>(java.util.List.of(first.get(),second.get()));codes.sort(Integer::compareTo);assertEquals(java.util.List.of(200,409),codes);
        assertEquals(1,physicalRooms.countByProperty_PropertyId(property.getPropertyId()));assertEquals(409,deleteType(auth,typeId).statusCode());
    }
    @Test void roomUpdateStatusAndDeletionAreOwnerScopedAndDoNotTouchBookings() throws Exception {
        var owner=account(UserRole.ROOM_HOST);var property=properties.save(Property.builder().owner(owner).name("Room status").status("ACTIVE").build());String auth=token(owner);
        int typeId=json.readTree(createType(auth,typeDetails(property.getPropertyId())).body()).path("data").path("roomTypeId").asInt();
        int id=json.readTree(roomWrite(auth,"POST",null,roomDetails(typeId,"P.101")).body()).path("data").path("roomId").asInt();
        var values=roomDetails(typeId,"P.101");values.put("status","OCCUPIED");assertEquals(200,roomWrite(auth,"PUT",id,values).statusCode());
        assertEquals(409,roomWrite(auth,"DELETE",id,null).statusCode());
        var other=token(account(UserRole.ROOM_HOST));assertEquals(404,roomWrite(other,"PUT",id,values).statusCode());assertEquals(404,roomWrite(other,"DELETE",id,null).statusCode());
        bookings.save(Booking.builder().renter(account(UserRole.USER)).roomType(roomTypes.findById(typeId).orElseThrow()).status(BookingStatus.PENDING).scheduledDate(LocalDateTime.now().plusDays(1)).build());
        assertEquals("OCCUPIED",physicalRooms.findById(id).orElseThrow().getStatus());
        values.put("status","VACANT");assertEquals(200,roomWrite(auth,"PUT",id,values).statusCode());assertEquals(200,roomWrite(auth,"DELETE",id,null).statusCode());assertFalse(physicalRooms.existsById(id));
        assertEquals(0,json.readTree(hostGet(auth,"/room-types/"+typeId).body()).path("data").path("totalRooms").asInt());
    }
    private HttpResponse<String> roomTypeList(String token, String query) throws Exception {
        var request = HttpRequest.newBuilder(uri("/api/host/room-types" + query));
        if (token != null) request.header("Authorization", "Bearer " + token);
        return client.send(request.GET().build(), HttpResponse.BodyHandlers.ofString());
    }
    @Test void roomTypeListEmptyAndPermissionsAreReal() throws Exception {
        var response = roomTypeList(token(account(UserRole.ROOM_HOST)), "");
        assertEquals(200, response.statusCode(), response.body());
        var data = json.readTree(response.body()).path("data");
        assertEquals(0, data.path("properties").size());
        assertEquals(0, data.path("roomTypes").size());
        assertEquals(0, data.path("pendingRegistrationCount").asInt());
        assertEquals(401, roomTypeList(null, "").statusCode());
        assertEquals(403, roomTypeList(token(account(UserRole.USER)), "").statusCode());
        assertEquals(403, roomTypeList(token(account(UserRole.STAFF)), "").statusCode());
        assertEquals(200, roomTypeList(token(account(UserRole.ADMIN)), "").statusCode());
    }
    @Test void roomTypeListDoesNotExposeOtherOwnersOrInventRoomData() throws Exception {
        var hostA = account(UserRole.ROOM_HOST);
        var hostB = account(UserRole.ROOM_HOST);
        var property = properties.save(Property.builder().owner(hostA).name("Private room types property").status("ACTIVE").build());
        roomTypes.save(RoomType.builder().property(property).roomType("Database room type").price(new BigDecimal("2700000")).areaSqm(24f).description("Database description").build());
        var a = roomTypeList(token(hostA), "?propertyId=" + property.getPropertyId());
        assertEquals(200, a.statusCode(), a.body());
        var dataA = json.readTree(a.body()).path("data");
        assertEquals(1, dataA.path("properties").size());
        var type = dataA.path("roomTypes").get(0);
        assertEquals("Database room type", type.path("roomType").asString());
        assertEquals(2700000, type.path("price").asInt());
        assertEquals(24, type.path("areaSqm").asInt());
        assertTrue(type.path("servicePrice").isNull());
        String tokenB = token(hostB);
        var b = roomTypeList(tokenB, "?ownerId=" + hostA.getUserId());
        assertEquals(200, b.statusCode());
        assertEquals(0, json.readTree(b.body()).path("data").path("roomTypes").size());
        assertFalse(b.body().contains("Database room type"));
        assertEquals(404, roomTypeList(tokenB, "?propertyId=" + property.getPropertyId()).statusCode());
        assertEquals(400, roomTypeList(tokenB, "?propertyId=abc").statusCode());
        assertEquals(400, roomTypeList(tokenB, "?propertyId=0").statusCode());
    }
    @Test void missingRoomTypesAndPendingRegistrationAreDifferentStates() throws Exception {
        var existingHost = account(UserRole.ROOM_HOST);
        properties.save(Property.builder().owner(existingHost).name("Property without types").build());
        var existing = json.readTree(roomTypeList(token(existingHost), "").body()).path("data");
        assertEquals(1, existing.path("properties").size());
        assertEquals(0, existing.path("roomTypes").size());
        var pendingHost = account(UserRole.ROOM_HOST);
        registrations.save(PropertyRegistration.builder().user(pendingHost).name("Waiting property").status(RegistrationStatus.PENDING).build());
        var pending = json.readTree(roomTypeList(token(pendingHost), "").body()).path("data");
        assertEquals(0, pending.path("properties").size());
        assertEquals(1, pending.path("pendingRegistrationCount").asInt());
    }
    private HttpResponse<String> viewingList(String token, String query) throws Exception {
        var request = HttpRequest.newBuilder(uri("/api/host/viewings" + query));
        if (token != null) request.header("Authorization", "Bearer " + token);
        return client.send(request.GET().build(), HttpResponse.BodyHandlers.ofString());
    }
    @Test void viewingListEmptyAndAccessControl() throws Exception {
        var response = viewingList(token(account(UserRole.ROOM_HOST)), "");
        assertEquals(200, response.statusCode(), response.body());
        var data = json.readTree(response.body()).path("data");
        assertEquals(0, data.path("properties").size());
        assertEquals(0, data.path("viewings").size());
        assertEquals(0, data.path("pendingRegistrationCount").asInt());
        assertEquals(401, viewingList(null, "").statusCode());
        assertEquals(403, viewingList(token(account(UserRole.USER)), "").statusCode());
        assertEquals(403, viewingList(token(account(UserRole.STAFF)), "").statusCode());
        assertEquals(200, viewingList(token(account(UserRole.ADMIN)), "").statusCode());
    }
    @Test void viewingListIsCompleteAndScopedToAuthenticatedOwner() throws Exception {
        var hostA = account(UserRole.ROOM_HOST);
        var hostB = account(UserRole.ROOM_HOST);
        var renter = account(UserRole.USER);
        var property = properties.save(Property.builder().owner(hostA).name("Private viewing property").build());
        var type = roomTypes.save(RoomType.builder().property(property).roomType("Viewing room type").price(new BigDecimal("2400000")).build());
        for (int i = 0; i < 7; i++) bookings.save(Booking.builder().renter(renter).roomType(type)
                .scheduledDate(LocalDateTime.of(2027, 1, 10, 9, 0).plusDays(i)).status(BookingStatus.APPROVED).note("Database note").build());
        var response = viewingList(token(hostA), "");
        assertEquals(200, response.statusCode(), response.body());
        var rows = json.readTree(response.body()).path("data").path("viewings");
        assertEquals(7, rows.size());
        assertEquals("APPROVED", rows.get(0).path("status").asString());
        assertEquals("Database note", rows.get(0).path("note").asString());
        assertEquals(property.getPropertyId(), rows.get(0).path("propertyId").asInt());
        var other = viewingList(token(hostB), "?ownerId=" + hostA.getUserId());
        assertEquals(200, other.statusCode());
        assertEquals(0, json.readTree(other.body()).path("data").path("viewings").size());
        assertFalse(other.body().contains("Private viewing property"));
    }
    @Test void viewingListDistinguishesPendingRegistrationFromEmptyBookings() throws Exception {
        var host = account(UserRole.ROOM_HOST);
        registrations.save(PropertyRegistration.builder().user(host).name("Pending viewing property").status(RegistrationStatus.PENDING).build());
        var pending = json.readTree(viewingList(token(host), "").body()).path("data");
        assertEquals(1, pending.path("pendingRegistrationCount").asInt());
        assertEquals(0, pending.path("properties").size());
        properties.save(Property.builder().owner(host).name("Property without bookings").build());
        var owned = json.readTree(viewingList(token(host), "").body()).path("data");
        assertEquals(1, owned.path("properties").size());
        assertEquals(0, owned.path("viewings").size());
    }
    @Test void nonHostAccessIsRejectedByBackend() throws Exception {
        assertEquals(401, dashboard(null, "").statusCode());
        assertEquals(403, dashboard(token(account(UserRole.USER)), "").statusCode());
        assertEquals(403, dashboard(token(account(UserRole.STAFF)), "").statusCode());
        assertEquals(200, dashboard(token(account(UserRole.ADMIN)), "").statusCode());
    }

    private HttpResponse<String> profileUpdate(String token, Map<String,Object> fields) throws Exception {
        var request = HttpRequest.newBuilder(uri("/api/auth/profile")).header("Content-Type", "application/json");
        if (token != null) request.header("Authorization", "Bearer " + token);
        return client.send(request.PUT(HttpRequest.BodyPublishers.ofByteArray(json.writeValueAsBytes(fields))).build(), HttpResponse.BodyHandlers.ofString());
    }
    @Test void profileFieldsAndAvatarPersistOnlyForAuthenticatedUser() throws Exception {
        var owner = account(UserRole.USER);var other = account(UserRole.USER);var jwt = token(owner);
        String image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1WQAAAAASUVORK5CYII=";
        var response = profileUpdate(jwt, Map.of("fullName","Updated profile","phoneNumber","0981234098","organization"," FPT Campus ","preferredArea"," Tan Xa ","avatar",image));
        assertEquals(200,response.statusCode(),response.body());
        var body=json.readTree(response.body()).path("data");
        assertEquals("FPT Campus",body.path("organization").asString());
        assertEquals("Tan Xa",body.path("preferredArea").asString());
        assertEquals(image,body.path("avatar").asString());
        var reloaded=users.findById(owner.getUserId()).orElseThrow();
        assertEquals("FPT Campus",reloaded.getOrganization());assertEquals(image,reloaded.getAvatar());
        assertNull(users.findById(other.getUserId()).orElseThrow().getOrganization());
        var me=client.send(HttpRequest.newBuilder(uri("/api/auth/me")).header("Authorization","Bearer "+jwt).GET().build(),HttpResponse.BodyHandlers.ofString());
        assertEquals("Tan Xa",json.readTree(me.body()).path("data").path("preferredArea").asString());
        assertEquals(200,profileUpdate(jwt,Map.of("fullName","Legacy client update")).statusCode());
        assertEquals(image,users.findById(owner.getUserId()).orElseThrow().getAvatar());
    }
    @Test void profileRejectsUnsafeAvatarAndInvalidFieldsWithoutSaving() throws Exception {
        var owner=account(UserRole.USER);var jwt=token(owner);
        assertEquals(400,profileUpdate(jwt,Map.of("fullName","Changed","phoneNumber","not-a-phone")).statusCode());
        assertEquals(400,profileUpdate(jwt,Map.of("fullName","Changed","organization","a".repeat(256))).statusCode());
        assertEquals(400,profileUpdate(jwt,Map.of("fullName","Changed","avatar","data:image/svg+xml;base64,PHN2Zz4=" )).statusCode());
        assertEquals(400,profileUpdate(jwt,Map.of("fullName","Changed","avatar","data:image/png;base64,bm90LWFuLWltYWdl" )).statusCode());
        assertEquals(owner.getFullName(),users.findById(owner.getUserId()).orElseThrow().getFullName());
        assertEquals(401,profileUpdate(null,Map.of("fullName","Anonymous update")).statusCode());
    }

    private HttpResponse<String> hostApplicationPost(String token,String path,Map<String,Object> fields) throws Exception {
        var request=HttpRequest.newBuilder(uri("/api/host-applications"+path)).header("Content-Type","application/json");
        if(token!=null)request.header("Authorization","Bearer "+token);
        return client.send(request.POST(HttpRequest.BodyPublishers.ofByteArray(json.writeValueAsBytes(fields))).build(),HttpResponse.BodyHandlers.ofString());
    }
    private HttpResponse<String> hostApplicationGet(String token,String path) throws Exception {
        var request=HttpRequest.newBuilder(uri("/api/host-applications"+path));if(token!=null)request.header("Authorization","Bearer "+token);
        return client.send(request.GET().build(),HttpResponse.BodyHandlers.ofString());
    }
    private User applicant(){var user=account(UserRole.USER);user.setPhoneNumber(String.format("09%08d",Math.floorMod(System.nanoTime(),100000000)));return users.save(user);}
    private Map<String,Object> hostApplicationFields(){return new java.util.HashMap<>(Map.of("targetCommune","Tân Xã","expectedScale","5 - 15 phòng","introduction","Tôi muốn quản lý nhà trọ và cập nhật thông tin phòng cho sinh viên tại Hòa Lạc.","agreementAccepted",true));}
    @Test void hostApplicationIsOwnedPersistedValidatedAndNeverSelfGrantsRole() throws Exception {
        var owner=applicant();var jwt=token(owner);var other=token(applicant());
        assertEquals(401,hostApplicationGet(null,"/current").statusCode());
        assertTrue(json.readTree(hostApplicationGet(jwt,"/current").body()).path("data").isNull());
        var invalid=hostApplicationFields();invalid.put("agreementAccepted",false);assertEquals(400,hostApplicationPost(jwt,"",invalid).statusCode());
        invalid=hostApplicationFields();invalid.put("targetCommune","Invalid area");assertEquals(400,hostApplicationPost(jwt,"",invalid).statusCode());
        var response=hostApplicationPost(jwt,"",hostApplicationFields());assertEquals(200,response.statusCode(),response.body());
        assertEquals("PENDING_REVIEW",json.readTree(response.body()).path("data").path("status").asString());
        assertEquals(UserRole.USER,users.findById(owner.getUserId()).orElseThrow().getRole());
        assertEquals(409,hostApplicationPost(jwt,"",hostApplicationFields()).statusCode());
        assertEquals(403,hostApplicationGet(jwt,"").statusCode());
        assertTrue(json.readTree(hostApplicationGet(other,"/current?userId="+owner.getUserId()).body()).path("data").isNull());
        assertEquals("Tân Xã",hostApplications.findByUser_UserId(owner.getUserId()).orElseThrow().getTargetCommune());
        int id=json.readTree(response.body()).path("data").path("id").asInt();var staff=token(account(UserRole.STAFF));
        assertEquals(403,hostApplicationGet(other,"/"+id).statusCode());
        var detail=json.readTree(hostApplicationGet(staff,"/"+id).body()).path("data");assertEquals(owner.getUserId(),detail.path("application").path("userId").asInt());
        assertEquals(hostApplicationFields().get("introduction"),detail.path("application").path("introduction").asString());
        var queue=json.readTree(hostApplicationGet(staff,"?search=HREG-"+id+"&size=1&sort=NAME_ASC").body()).path("data");
        assertEquals(1,queue.path("totalElements").asInt());assertEquals(id,queue.path("content").get(0).path("id").asInt());assertTrue(queue.path("stats").path("pending").asLong()>=1);
        assertEquals(400,hostApplicationGet(staff,"?status=INVALID").statusCode());

    }
    @Test void hostApplicationSupplementAndRejectionEnforceVersionAndResubmissionRules() throws Exception {
        var owner=applicant();var jwt=token(owner);var reviewer=token(account(UserRole.STAFF));
        var first=json.readTree(hostApplicationPost(jwt,"",hostApplicationFields()).body()).path("data");int id=first.path("id").asInt();long version=first.path("version").asLong();
        assertEquals(403,hostApplicationPost(jwt,"/"+id+"/review",Map.of("decision","APPROVED","version",version)).statusCode());
        assertEquals(400,hostApplicationPost(reviewer,"/"+id+"/review",Map.of("decision","NEEDS_CHANGES","version",version)).statusCode());
        assertEquals(200,hostApplicationPost(reviewer,"/"+id+"/review",Map.of("decision","NEEDS_CHANGES","note","Vui lòng mô tả rõ kinh nghiệm quản lý.","version",version,"requestedFields",java.util.List.of("introduction"))).statusCode());
        var fields=hostApplicationFields();fields.put("version",version);assertEquals(409,hostApplicationPost(jwt,"",fields).statusCode());
        var current=json.readTree(hostApplicationGet(jwt,"/current").body()).path("data");fields.put("version",current.path("version").asLong());
        assertEquals("introduction",current.path("requestedFields").get(0).asString());
        var resubmitted=hostApplicationPost(jwt,"",fields);assertEquals(200,resubmitted.statusCode(),resubmitted.body());
        var pending=json.readTree(resubmitted.body()).path("data");assertEquals(id,pending.path("id").asInt());
        assertEquals(200,hostApplicationPost(reviewer,"/"+id+"/review",Map.of("decision","REJECTED","note","Thông tin không hợp lệ.","allowResubmit",false,"version",pending.path("version").asLong())).statusCode());
        fields.put("version",json.readTree(hostApplicationGet(jwt,"/current").body()).path("data").path("version").asLong());assertEquals(409,hostApplicationPost(jwt,"",fields).statusCode());
    }
    @Test void hostApplicationApprovalGrantsHostAccessOnlyAfterStaffReview() throws Exception {
        var owner=applicant();var jwt=token(owner);var reviewer=token(account(UserRole.STAFF));
        var application=json.readTree(hostApplicationPost(jwt,"",hostApplicationFields()).body()).path("data");int id=application.path("id").asInt();
        assertEquals(403,dashboard(jwt,"").statusCode());
        var fields=Map.<String,Object>of("decision","APPROVED","version",application.path("version").asLong());
        var result=hostApplicationPost(reviewer,"/"+id+"/review",fields);assertEquals(200,result.statusCode(),result.body());
        assertEquals(UserRole.ROOM_HOST,users.findById(owner.getUserId()).orElseThrow().getRole());
        assertEquals(200,dashboard(jwt,"").statusCode());
        assertEquals(409,hostApplicationPost(reviewer,"/"+id+"/review",fields).statusCode());
        assertEquals(403,hostApplicationPost(jwt,"",hostApplicationFields()).statusCode());
        assertEquals(200,hostApplicationGet(reviewer,"?status=PENDING_REVIEW").statusCode());
    }
}
