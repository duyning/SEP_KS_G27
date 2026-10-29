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
import java.net.URI;
import java.net.http.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class ServiceRegistrationTests {
    @Autowired Environment environment;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired PasswordEncoder encoder;
    @Autowired ServiceRegistrationRepository registrations;
    @Autowired ServiceCategoryRepository categories;
    @Autowired ServiceDocumentRepository documents;
    @Autowired UserCapabilityRepository capabilities;
    @Autowired CapabilityRepository capabilityTypes;
    @Autowired ServiceRepository listings;
    @Autowired ModerationLogRepository logs;
    private final HttpClient client = HttpClient.newHttpClient();

    private User account() {
        return account(UserRole.USER);
    }
    private User account(UserRole role) {
        return users.save(User.builder().email("service-" + UUID.randomUUID() + "@test.local")
                .fullName("Người đăng ký").passwordHash(encoder.encode("Test@123456"))
                .role(role).status(UserStatus.ACTIVE).build());
    }
    private URI uri(String path) { return URI.create("http://localhost:" + environment.getProperty("local.server.port") + path); }
    private String token(User user) throws Exception {
        var response = client.send(HttpRequest.newBuilder(uri("/api/auth/login")).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(Map.of("email", user.getEmail(), "password", "Test@123456")))).build(), HttpResponse.BodyHandlers.ofString());
        assertEquals(200, response.statusCode(), response.body());
        return json.readTree(response.body()).path("data").path("accessToken").asString();
    }
    private Map<String, Object> details() {
        return new HashMap<>(Map.of("applicantName", "Nguyễn Văn An", "categoryId", categories.findAll().get(0).getCategoryId(),
                "serviceName", "Dịch vụ chuyển trọ", "description", "Dịch vụ chuyển trọ sinh viên tại Hòa Lạc.",
                "pricingType", "FIXED", "price", 150000, "serviceArea", "Tân Xã, Thạch Hòa", "contactPhone", "0987654321", "contactEmail", "contact@example.com"));
    }
    private HttpResponse<String> get(String token, String path) throws Exception {
        var request = HttpRequest.newBuilder(uri("/api/service-registrations" + path));
        if (token != null) request.header("Authorization", "Bearer " + token);
        return client.send(request.GET().build(), HttpResponse.BodyHandlers.ofString());
    }
    private HttpResponse<String> submit(String token, Map<String, Object> data, String fileContent, int count) throws Exception {
        String boundary = "ServiceTestBoundary";
        var body = new StringBuilder("--" + boundary + "\r\nContent-Disposition: form-data; name=\"details\"\r\nContent-Type: application/json\r\n\r\n" + json.writeValueAsString(data) + "\r\n");
        for (int i = 0; i < count; i++) body.append("--").append(boundary).append("\r\nContent-Disposition: form-data; name=\"documents\"; filename=\"license.pdf\"\r\nContent-Type: application/pdf\r\n\r\n").append(fileContent).append("\r\n");
        body.append("--").append(boundary).append("--\r\n");
        var request = HttpRequest.newBuilder(uri("/api/service-registrations")).header("Content-Type", "multipart/form-data; boundary=" + boundary);
        if (token != null) request.header("Authorization", "Bearer " + token);
        return client.send(request.POST(HttpRequest.BodyPublishers.ofString(body.toString())).build(), HttpResponse.BodyHandlers.ofString());
    }
    private HttpResponse<String> api(String token, String method, String path, Object data) throws Exception {
        var builder = HttpRequest.newBuilder(uri(path));
        if (token != null) builder.header("Authorization", "Bearer " + token);
        if (data != null) builder.header("Content-Type", "application/json");
        return client.send(builder.method(method, data == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(data))).build(), HttpResponse.BodyHandlers.ofString());
    }
    private int application(User owner) throws Exception {
        return application(owner, details());
    }
    private int application(User owner, Map<String, Object> details) throws Exception {
        var result = submit(token(owner), details, "%PDF-1.4\nverification document", 1);
        assertEquals(201, result.statusCode(), result.body());
        return json.readTree(result.body()).path("data").path("registrationId").asInt();
    }
    private HttpResponse<String> review(String staff, int id, String cap, String listing, String reason) throws Exception {
        return api(staff, "POST", "/api/staff/service-applications/" + id + "/review", Map.of("capabilityDecision", cap, "listingDecision", listing, "reason", reason));
    }
    @Test void everyStaffAndAdminCanReadAndReviewWithoutAssignment() throws Exception {
        var owner = account(); int id = application(owner); String admin = token(account(UserRole.ADMIN));
        var staff = account(UserRole.STAFF); String staffToken = token(staff);
        String path = "/api/staff/service-applications/" + id;
        assertEquals(200, api(staffToken, "GET", path, null).statusCode());
        assertEquals(200, api(admin, "GET", path, null).statusCode());
        assertFalse(api(null, "GET", "/api/services", null).body().contains("registrationId"));
        var detail = json.readTree(api(staffToken, "GET", path, null).body()).path("data");
        assertTrue(detail.path("application").path("assignedStaffId").isNull());
        int fileId = detail.path("application").path("documents").get(0).path("documentId").asInt();
        var file = api(staffToken, "GET", path + "/files/" + fileId, null);
        assertEquals(200, file.statusCode()); assertTrue(file.body().startsWith("%PDF-"));
        assertEquals("private, no-store", file.headers().firstValue("Cache-Control").orElse(""));
        String otherStaff = token(account(UserRole.STAFF));
        assertEquals(200, api(otherStaff, "GET", path + "/files/" + fileId, null).statusCode());
        assertTrue(api(otherStaff, "GET", "/api/staff/service-applications", null).body().contains("\"registrationId\":" + id + ","));
        assertTrue(api(otherStaff, "GET", "/api/staff/dashboard", null).body().contains("SERVICE-" + id));
        assertEquals(403, api(token(owner), "GET", path, null).statusCode());
        var result = review(staffToken, id, "APPROVE", "APPROVE", "Thông tin và tài liệu đã được xác minh.");
        assertEquals(200, result.statusCode(), result.body());
        var reviewed = json.readTree(result.body()).path("data").path("application");
        assertEquals("APPROVED", reviewed.path("status").asString());
        assertFalse(reviewed.path("reviewedAt").isNull());
        assertEquals(1, capabilities.findByUser_UserIdAndStatus(owner.getUserId(), "ACTIVE").size());
        var published = listings.findAll().stream().filter(s -> s.getRegistration() != null && s.getRegistration().getRegistrationId().equals(id)).findFirst().orElseThrow();
        var publicResult = api(null, "GET", "/api/services/" + published.getServiceId(), null);
        assertEquals(200, publicResult.statusCode(), publicResult.body());
        assertTrue(publicResult.body().contains("Tân Xã")); assertFalse(publicResult.body().contains("documents"));
        assertEquals(409, review(staffToken, id, "APPROVE", "APPROVE", "Yêu cầu trùng không được ghi thêm.").statusCode());
        assertEquals(409, review(admin, id, "REJECT", "REJECT", "Admin không thể ghi đè hồ sơ đã duyệt.").statusCode());
        assertEquals(1, logs.findByTargetTypeAndTargetIdOrderByCreatedAtDesc("SERVICE_REGISTRATION", id).size());
        var cap = capabilities.findByUser_UserId(owner.getUserId()).get(0); cap.setStatus("INACTIVE"); capabilities.save(cap);
        assertEquals(404, api(null, "GET", "/api/services/" + published.getServiceId(), null).statusCode());
    }
    @Test void capabilityAndListingDecisionsAreIndependentAndRejectionsDoNotPublish() throws Exception {
        var staff = account(UserRole.STAFF); String staffToken = token(staff);
        var rejected = account(); int rejectedId = application(rejected);
        assertEquals(200, review(staffToken, rejectedId, "REJECT", "REJECT", "Tài liệu không xác minh được người đăng ký.").statusCode());
        assertTrue(capabilities.findByUser_UserId(rejected.getUserId()).isEmpty());
        assertFalse(listings.existsByRegistration_RegistrationId(rejectedId));
        var provider = account(); int providerId = application(provider);
        assertEquals(200, review(staffToken, providerId, "APPROVE", "REJECT", "Đủ điều kiện cung cấp dịch vụ, nội dung giá chưa phù hợp.").statusCode());
        assertEquals(1, capabilities.findByUser_UserIdAndStatus(provider.getUserId(), "ACTIVE").size());
        assertFalse(listings.existsByRegistration_RegistrationId(providerId));
        var current = json.readTree(get(token(provider), "/current").body()).path("data").path("registration");
        assertEquals("APPROVE", current.path("capabilityDecision").asString());
        assertEquals("REJECT", current.path("listingDecision").asString());
        assertTrue(current.path("capabilityActive").asBoolean());
        assertTrue(current.path("serviceId").isNull());
        assertFalse(current.path("publicEligible").asBoolean());
    }
    @Test void reviewRejectsUnauthorizedInvalidAndSelfReviewButAdminInheritsStaffReview() throws Exception {
        var owner = account(); int id = application(owner);
        String admin = token(account(UserRole.ADMIN)); var staff = account(UserRole.STAFF); String staffToken = token(staff);
        assertEquals(401, api(null, "GET", "/api/staff/service-applications", null).statusCode());
        assertEquals(403, review(token(owner), id, "APPROVE", "APPROVE", "Người dùng không có quyền xét duyệt.").statusCode());
        assertEquals(403, review(token(account(UserRole.ROOM_HOST)), id, "APPROVE", "APPROVE", "Role Host không có quyền xét duyệt.").statusCode());
        assertEquals(400, review(staffToken, id, "APPROVE", "APPROVE", " ").statusCode());
        assertEquals(400, review(staffToken, id, "REJECT", "APPROVE", "Không được công khai khi từ chối quyền.").statusCode());
        assertEquals(400, review(staffToken, id, "OTHER", "REJECT", "Quyết định không thuộc giá trị cho phép.").statusCode());
        assertTrue(capabilities.findByUser_UserId(owner.getUserId()).isEmpty());
        assertEquals(200, review(admin, id, "REJECT", "REJECT", "Admin được kế thừa quyền xét duyệt của Staff.").statusCode());
        int self = application(staff);
        assertEquals(403, review(staffToken, self, "APPROVE", "APPROVE", "Không thể duyệt hồ sơ của chính mình.").statusCode());
        assertEquals(200, review(admin, self, "REJECT", "REJECT", "Admin khác có thể duyệt hồ sơ nhân viên.").statusCode());
    }
    @Test void concurrentReviewsDoNotDuplicateCapabilityListingOrAudit() throws Exception {
        var owner = account(); int id = application(owner); var staff = account(UserRole.STAFF); String staffToken = token(staff);
        String admin = token(account(UserRole.ADMIN));
        java.util.function.Supplier<Integer> action = () -> {
            try { return review(staffToken, id, "APPROVE", "APPROVE", "Đã kiểm tra giấy tờ và nội dung dịch vụ.").statusCode(); }
            catch (Exception error) { throw new RuntimeException(error); }
        };
        var first = java.util.concurrent.CompletableFuture.supplyAsync(action);
        var second = java.util.concurrent.CompletableFuture.supplyAsync(() -> {
            try { return review(admin, id, "APPROVE", "APPROVE", "Admin duyệt đồng thời với nhân viên.").statusCode(); }
            catch (Exception error) { throw new RuntimeException(error); }
        });
        var codes = new ArrayList<>(List.of(first.get(), second.get())); codes.sort(Integer::compareTo);
        assertEquals(List.of(200, 409), codes);
        assertEquals(1, capabilities.findByUser_UserId(owner.getUserId()).size());
        assertTrue(listings.existsByRegistration_RegistrationId(id));
        assertEquals(1, logs.findByTargetTypeAndTargetIdOrderByCreatedAtDesc("SERVICE_REGISTRATION", id).size());
    }
    @Test void serviceOwnerCapabilityDoesNotReplaceAnyAccountRoleAndOwnerSeesPublicationResult() throws Exception {
        String admin = token(account(UserRole.ADMIN));
        for (var role : UserRole.values()) {
            var values = details();
            String pricingType = role == UserRole.STAFF ? "NEGOTIABLE" : role == UserRole.ROOM_HOST ? "FROM" : "FIXED";
            values.put("pricingType", pricingType); if (pricingType.equals("NEGOTIABLE")) values.remove("price");
            var owner = account(role); int applicationId = application(owner, values); String ownerToken = token(owner);
            var before = json.readTree(api(ownerToken, "GET", "/api/auth/me", null).body()).path("data");
            assertEquals(role.name(), before.path("role").asString());
            assertEquals(0, before.path("capabilities").size());
            var approved = review(admin, applicationId, "APPROVE", "APPROVE", "Hồ sơ đủ điều kiện cấp quyền Service Owner.");
            assertEquals(200, approved.statusCode(), approved.body());
            assertEquals(role, users.findById(owner.getUserId()).orElseThrow().getRole());
            var after = json.readTree(api(ownerToken, "GET", "/api/auth/me", null).body()).path("data");
            assertEquals(role.name(), after.path("role").asString());
            assertTrue(after.path("capabilities").toString().contains("MANAGE_SERVICE"));
            var receipt = json.readTree(get(ownerToken, "/current").body()).path("data").path("registration");
            assertEquals(owner.getUserId(), receipt.path("providerId").asInt());
            assertTrue(receipt.path("serviceId").asInt() > 0);
            assertTrue(receipt.path("capabilityActive").asBoolean());
            assertTrue(receipt.path("publicEligible").asBoolean());
            assertEquals("ACTIVE", receipt.path("serviceState").asString());
            assertEquals("APPROVE", receipt.path("listingDecision").asString());
            assertFalse(receipt.path("reviewedAt").isNull());
            var publicListing = json.readTree(api(null, "GET", "/api/services/" + receipt.path("serviceId").asInt(), null).body()).path("data");
            assertEquals(pricingType.equals("NEGOTIABLE") ? "Thỏa thuận" : pricingType.equals("FROM") ? "Từ 150.000 VNĐ" : "150.000 VNĐ", publicListing.path("pricingLabel").asString());
        }
    }
    @Test void publicCatalogueFiltersDatabaseCategoriesAndOmitsEveryIneligibleState() throws Exception {
        String reviewer = token(account(UserRole.STAFF));
        var categoryRows = json.readTree(api(null, "GET", "/api/services/categories", null).body()).path("data");
        assertTrue(categoryRows.size() >= 4);
        var category = categories.save(ServiceCategory.builder().name("Danh mục kiểm thử " + UUID.randomUUID()).build());
        assertEquals(0, json.readTree(api(null, "GET", "/api/services?categoryId=" + category.getCategoryId(), null).body()).path("data").size());
        var owner = account(); var values = details(); values.put("categoryId", category.getCategoryId()); values.put("pricingType", "FROM");
        var submitted = submit(token(owner), values, "%PDF-1.4\ntest document", 1);
        int id = json.readTree(submitted.body()).path("data").path("registrationId").asInt();
        assertEquals(200, review(reviewer, id, "APPROVE", "APPROVE", "Dịch vụ đã được xác minh trước khi công khai.").statusCode());
        var published = listings.findByRegistration_RegistrationId(id).orElseThrow(); int serviceId = published.getServiceId();
        var filtered = api(null, "GET", "/api/services?categoryId=" + category.getCategoryId(), null);
        assertEquals(200, filtered.statusCode(), filtered.body());
        var publicRow = json.readTree(filtered.body()).path("data").get(0);
        assertEquals(1, json.readTree(filtered.body()).path("data").size());
        assertEquals(serviceId, publicRow.path("serviceId").asInt());
        assertEquals(owner.getUserId(), publicRow.path("providerId").asInt());
        assertEquals("Từ 150.000 VNĐ", publicRow.path("pricingLabel").asString());
        assertEquals("0987654321", publicRow.path("contactPhone").asString());
        assertEquals("contact@example.com", publicRow.path("contactEmail").asString());
        assertTrue(publicRow.path("publicEligible").asBoolean());
        assertFalse(filtered.body().contains("documents"));
        for (String invalid : List.of("0", "-1", "abc", "2147483648")) assertEquals(400, api(null, "GET", "/api/services?categoryId=" + invalid, null).statusCode());
        assertEquals(400, api(null, "GET", "/api/services/invalid", null).statusCode());
        published.setStatus("INACTIVE"); listings.save(published);
        assertEquals(404, api(null, "GET", "/api/services/" + serviceId, null).statusCode());
        assertFalse(json.readTree(get(token(owner), "/current").body()).path("data").path("registration").path("publicEligible").asBoolean());
        published.setStatus("ACTIVE"); listings.save(published);
        owner.setStatus(UserStatus.INACTIVE); users.save(owner);
        assertEquals(404, api(null, "GET", "/api/services/" + serviceId, null).statusCode());
        owner.setStatus(UserStatus.ACTIVE); users.save(owner);
        var registration = registrations.findById(id).orElseThrow(); registration.setListingDecision("REJECT"); registrations.save(registration);
        assertEquals(404, api(null, "GET", "/api/services/" + serviceId, null).statusCode());
        assertEquals(0, json.readTree(api(null, "GET", "/api/services?categoryId=" + category.getCategoryId(), null).body()).path("data").size());
    }
    @Test void submissionPersistsFullProfileAndPrivateDocumentsWithoutGrantingCapability() throws Exception {
        var applicant = account(); String auth = token(applicant);
        assertTrue(json.readTree(get(auth, "/categories").body()).path("data").size() >= 4);
        assertTrue(json.readTree(get(auth, "/current").body()).path("data").path("canRegister").asBoolean());
        var response = submit(auth, details(), "%PDF-1.4\nverification document", 1);
        assertEquals(201, response.statusCode(), response.body());
        var data = json.readTree(response.body()).path("data");
        assertEquals(applicant.getUserId(), data.path("applicantId").asInt());
        assertEquals("PENDING", data.path("status").asString());
        assertEquals("FIXED", data.path("pricingType").asString());
        assertEquals(150000, data.path("price").asInt());
        assertEquals("Tân Xã, Thạch Hòa", data.path("serviceArea").asString());
        assertEquals("Nguyễn Văn An", data.path("applicantName").asString());
        assertEquals("0987654321", data.path("contactPhone").asString());
        assertNotNull(registrations.findById(data.path("registrationId").asInt()).orElseThrow().getCreatedAt());
        assertTrue(capabilities.findByUser_UserId(applicant.getUserId()).isEmpty());
        int fileId = data.path("documents").get(0).path("documentId").asInt();
        assertTrue(get(auth, "/documents/" + fileId).body().startsWith("%PDF-1.4"));
        assertEquals(404, get(token(account()), "/documents/" + fileId).statusCode());
        assertEquals(401, get(null, "/documents/" + fileId).statusCode());
        var current = json.readTree(get(auth, "/current").body()).path("data");
        assertFalse(current.path("canRegister").asBoolean());
        assertEquals("PENDING", current.path("registration").path("status").asString());
        assertEquals(409, submit(auth, details(), "%PDF-1.4\nfile", 1).statusCode());
    }
    @Test void invalidSubmissionsRollbackTheWholeProfile() throws Exception {
        var applicant = account(); String auth = token(applicant);
        assertEquals(401, submit(null, details(), "%PDF-1.4\nfile", 1).statusCode());
        assertEquals(400, submit(auth, details(), "fake pdf", 1).statusCode());
        assertEquals(400, submit(auth, details(), "%PDF-1.4\nfile", 6).statusCode());
        assertEquals(400, submit(auth, details(), "%PDF-1.4\nfile", 0).statusCode());
        for (var invalid : List.of(Map.entry("price", (Object)(-1)), Map.entry("price", (Object)0), Map.entry("pricingType", (Object)"INVALID"),
                Map.entry("categoryId", (Object)Integer.MAX_VALUE), Map.entry("contactPhone", (Object)"123"), Map.entry("description", (Object)"  "),
                Map.entry("serviceName", (Object)"  "), Map.entry("contactEmail", (Object)"invalid"))) {
            var value = details(); value.put(invalid.getKey(), invalid.getValue());
            assertEquals(400, submit(auth, value, "%PDF-1.4\nfile", 1).statusCode(), invalid.getKey());
        }
        assertTrue(registrations.findByUser_UserIdOrderByRegistrationIdDesc(applicant.getUserId()).isEmpty());
    }
    @Test void existingCapabilityAndSupplementBlockOnboardingButRejectedApplicantMayReapply() throws Exception {
        var applicant = account(); String auth = token(applicant);
        capabilities.save(UserCapability.builder().user(applicant).capability(capabilityTypes.findByCode("MANAGE_SERVICE").orElseThrow()).status("ACTIVE").build());
        assertEquals(409, submit(auth, details(), "%PDF-1.4\nfile", 1).statusCode());
        var other = account(); String otherAuth = token(other);
        var previous = registrations.save(ServiceRegistration.builder().user(other).category(categories.findAll().get(0))
                .serviceName("Hồ sơ trước").status(RegistrationStatus.NEEDS_SUPPLEMENT).build());
        assertEquals(409, submit(otherAuth, details(), "%PDF-1.4\nfile", 1).statusCode());
        previous.setStatus(RegistrationStatus.REJECTED); registrations.save(previous);
        var value = details(); value.put("pricingType", "NEGOTIABLE"); value.remove("price");
        assertEquals(201, submit(otherAuth, value, "%PDF-1.4\nfile", 1).statusCode());
    }
    @Test void concurrentRequestsCreateOnlyOnePendingProfile() throws Exception {
        var applicant = account(); String auth = token(applicant); var value = details();
        java.util.function.Supplier<Integer> action = () -> {
            try { return submit(auth, value, "%PDF-1.4\nfile", 1).statusCode(); }
            catch (Exception error) { throw new RuntimeException(error); }
        };
        var first = java.util.concurrent.CompletableFuture.supplyAsync(action);
        var second = java.util.concurrent.CompletableFuture.supplyAsync(action);
        var codes = new ArrayList<>(List.of(first.get(), second.get())); codes.sort(Integer::compareTo);
        assertEquals(List.of(201, 409), codes);
        assertEquals(1, registrations.findByUser_UserIdOrderByRegistrationIdDesc(applicant.getUserId()).size());
    }
}
