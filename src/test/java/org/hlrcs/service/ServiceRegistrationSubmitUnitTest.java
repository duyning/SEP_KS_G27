package org.hlrcs.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.hlrcs.dto.request.ServiceRegistrationRequest;
import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.*;
import org.hlrcs.exception.AppException;
import org.hlrcs.repository.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Direct service tests. No Spring context, MVC, database, or transaction proxy. */
class ServiceRegistrationSubmitUnitTest {
    record Scenario(String id, JsonNode data) { @Override public String toString() { return id; } }

    static Stream<Scenario> scenarios() throws IOException {
        try (var input = ServiceRegistrationSubmitUnitTest.class.getResourceAsStream("/service-registration-submit-cases.json")) {
            var rows = new ObjectMapper().readTree(Objects.requireNonNull(input));
            var result = new ArrayList<Scenario>();
            rows.forEach(row -> result.add(new Scenario(row.get("id").asText(), row)));
            return result.stream();
        }
    }

    static String text(JsonNode n, String key) { return n.path(key).isNull() ? null : n.path(key).asText(); }

    @ParameterizedTest(name = "{0}")
    @MethodSource("scenarios")
    void submit(Scenario scenario) throws Exception {
        JsonNode c = scenario.data(), in = c.get("input"), pre = c.get("pre"), expected = c.get("expected");
        var auth = mock(AuthService.class);
        var users = mock(UserRepository.class);
        var categories = mock(ServiceCategoryRepository.class);
        var registrations = mock(ServiceRegistrationRepository.class);
        var documents = mock(ServiceDocumentRepository.class);
        var listings = mock(ServiceRepository.class);
        var publication = mock(ServicePublicationService.class);
        var logs = mock(ModerationLogRepository.class);
        var service = new ServiceRegistrationService(auth, users, categories, registrations, documents,
                listings, publication, logs, mock(tools.jackson.databind.ObjectMapper.class));
        var user = User.builder().userId(42).fullName("Test Applicant").role(UserRole.USER).status(UserStatus.ACTIVE).build();
        var category = ServiceCategory.builder().categoryId(7).name("Cleaning").build();
        when(auth.getCurrentUser()).thenReturn(user);
        when(users.findForRegistrationUpdate(42)).thenReturn(pre.path("userExists").asBoolean() ? Optional.of(user) : Optional.empty());
        when(categories.findById(any())).thenReturn(pre.path("categoryExists").asBoolean() ? Optional.of(category) : Optional.empty());
        when(publication.hasCapability(42)).thenReturn(pre.path("capability").asBoolean());
        when(registrations.existsByUser_UserIdAndStatusIn(eq(42), eq(List.of(RegistrationStatus.APPROVED))))
                .thenReturn(pre.path("approved").asBoolean());
        when(registrations.existsByUser_UserIdAndStatusIn(eq(42), eq(List.of(RegistrationStatus.PENDING, RegistrationStatus.NEEDS_SUPPLEMENT))))
                .thenReturn(pre.path("inReview").asBoolean());
        when(listings.existsByProvider_UserIdAndServiceNameIgnoreCaseAndStatusNot(eq(42), anyString(), eq("DELETED")))
                .thenReturn(pre.path("duplicateListing").asBoolean());
        when(registrations.existsByUser_UserIdAndServiceNameIgnoreCaseAndStatusIn(eq(42), anyString(), anyList()))
                .thenReturn(pre.path("duplicateApplication").asBoolean());
        List<ServiceRegistration> saved = new ArrayList<>();
        List<ServiceDocument> savedDocs = new ArrayList<>();
        when(registrations.save(any())).thenAnswer(inv -> {
            ServiceRegistration row = inv.getArgument(0); row.setRegistrationId(101); saved.add(row); return row;
        });
        when(documents.save(any())).thenAnswer(inv -> {
            ServiceDocument row = inv.getArgument(0); row.setDocumentId(201 + savedDocs.size()); savedDocs.add(row); return row;
        });
        when(documents.findByRegistration_RegistrationIdOrderByDocumentIdAsc(101)).thenAnswer(inv -> savedDocs);
        when(listings.findByRegistration_RegistrationId(101)).thenReturn(Optional.empty());

        String fault = pre.path("fault").asText();
        var failure = new IllegalStateException("Injected dependency failure: " + fault);
        switch (fault) {
            case "auth" -> when(auth.getCurrentUser()).thenThrow(failure);
            case "category" -> when(categories.findById(any())).thenThrow(failure);
            case "userLock" -> when(users.findForRegistrationUpdate(42)).thenThrow(failure);
            case "capability" -> when(publication.hasCapability(42)).thenThrow(failure);
            case "approvedQuery" -> when(registrations.existsByUser_UserIdAndStatusIn(eq(42), eq(List.of(RegistrationStatus.APPROVED)))).thenThrow(failure);
            case "reviewQuery" -> when(registrations.existsByUser_UserIdAndStatusIn(eq(42), eq(List.of(RegistrationStatus.PENDING, RegistrationStatus.NEEDS_SUPPLEMENT)))).thenThrow(failure);
            case "listingDuplicate" -> when(listings.existsByProvider_UserIdAndServiceNameIgnoreCaseAndStatusNot(eq(42), anyString(), eq("DELETED"))).thenThrow(failure);
            case "applicationDuplicate" -> when(registrations.existsByUser_UserIdAndServiceNameIgnoreCaseAndStatusIn(eq(42), anyString(), anyList())).thenThrow(failure);
            case "registrationSave" -> doThrow(failure).when(registrations).save(any());
            case "documentSave" -> doThrow(failure).when(documents).save(any());
            case "listingRead" -> when(listings.findByRegistration_RegistrationId(101)).thenThrow(failure);
            case "documentRead" -> when(documents.findByRegistration_RegistrationIdOrderByDocumentIdAsc(101)).thenThrow(failure);
            default -> { }
        }
        ServiceRegistrationRequest request = in.path("nullRequest").asBoolean() ? null : new ServiceRegistrationRequest(
                text(in,"applicantName"), in.path("categoryId").isNull() ? null : in.path("categoryId").asInt(),
                text(in,"serviceName"), text(in,"description"), text(in,"pricingType"),
                in.path("price").isNull() ? null : new BigDecimal(in.path("price").asText()),
                text(in,"serviceArea"), text(in,"contactPhone"), text(in,"contactEmail"), text(in,"customServiceAreas"),
                in.path("otherAreasEnabled").isNull() ? null : in.path("otherAreasEnabled").asBoolean(), text(in,"priceUnit"));
        var files = uploads(in.get("files"));
        var images = uploads(in.get("images"));
        String actualMessage = null;
        if (!expected.path("exception").isNull()) {
            var error = assertThrows(Exception.class, () -> service.submit(request, files, images));
            actualMessage = error.getMessage();
            assertEquals(expected.path("exception").asText(), error.getClass().getSimpleName(), scenario.id());
            if (!expected.path("message").isNull()) assertEquals(expected.path("message").asText(), error.getMessage());
            if (error instanceof AppException app) assertEquals(expected.path("status").asInt(), app.getStatus().value());
            assertEquals(expected.path("saved").asInt(), saved.size(), "registration saves before failure");
            assertEquals(expected.path("savedDocs").asInt(), savedDocs.size(), "document saves before failure");
            if (!fault.isEmpty()) assertSame(failure, error, "dependency error must propagate unchanged");
        } else {
            var result = service.submit(request, files, images);
            assertEquals(1, saved.size());
            var row = saved.get(0);
            assertSame(user, row.getUser(), "ownership must come from authenticated user");
            assertSame(category, row.getCategory());
            assertEquals(101, result.registrationId());
            assertEquals(42, result.applicantId());
            assertEquals(42, result.providerId());
            assertEquals(RegistrationStatus.PENDING, result.status());
            assertEquals("CREATE", result.operation());
            assertEquals(0, result.revision());
            assertNull(result.serviceId()); assertFalse(result.publicEligible());
            assertEquals(pre.path("capability").asBoolean(), result.capabilityActive());
            assertEquals(text(expected,"applicantName"), result.applicantName());
            assertEquals(text(expected,"serviceName"), result.serviceName());
            assertEquals(text(expected,"description"), result.description());
            assertEquals(text(expected,"contactPhone"), result.contactPhone());
            assertEquals(text(expected,"contactEmail"), result.contactEmail());
            assertEquals(text(expected,"serviceArea"), result.serviceArea());
            assertEquals(text(expected,"customServiceAreas"), result.customServiceAreas());
            assertEquals(text(expected,"priceUnit"), result.priceUnit());
            assertEquals(request.pricingType(), result.pricingType());
            assertEquals(request.price(), result.price());
            assertEquals(files == null ? 0 : files.size(), result.documents().size());
            for (int i = 0; i < savedDocs.size(); i++) {
                var file = files.get(i); var doc = savedDocs.get(i);
                assertSame(row, doc.getRegistration()); assertEquals("PENDING", doc.getVerificationStatus());
                assertArrayEquals(file.getBytes(), doc.getFileContent());
                assertEquals(file.getContentType(), doc.getContentType());
                assertEquals(expected.get("documentNames").get(i).asText(), doc.getDocumentName());
                assertEquals(doc.getDocumentName(), result.documents().get(i).name());
            }
            int count = images == null ? 0 : images.size();
            assertEquals(count, result.imageCount()); assertEquals(count > 0, result.hasImage());
            for (int i = 0; i < count; i++) {
                assertArrayEquals(images.get(i).getBytes(), row.imageAt(i).getContent());
                assertEquals(images.get(i).getContentType(), row.imageAt(i).getContentType());
            }
            var order = inOrder(users, registrations);
            order.verify(users).findForRegistrationUpdate(42);
            order.verify(registrations).save(any());
            verify(listings).existsByProvider_UserIdAndServiceNameIgnoreCaseAndStatusNot(42, request.serviceName().trim(), "DELETED");
            verify(registrations).existsByUser_UserIdAndServiceNameIgnoreCaseAndStatusIn(42, request.serviceName().trim(), List.of(RegistrationStatus.PENDING, RegistrationStatus.NEEDS_SUPPLEMENT));
            if (pre.path("capability").asBoolean()) verify(registrations, never()).existsByUser_UserIdAndStatusIn(anyInt(), anyList());
        }
        verify(listings, never()).save(any());
        verify(users, never()).save(any());
        verifyNoInteractions(logs);
        // Only emit execution evidence after every assertion for this UTC has passed.
        var evidence = new LinkedHashMap<String, Object>();
        evidence.put("id", scenario.id()); evidence.put("result", "P");
        evidence.put("exceptionMessage", actualMessage);
        var directory = Path.of("target", "service-registration-submit-evidence");
        Files.createDirectories(directory);
        Files.writeString(directory.resolve(scenario.id() + ".json"), new ObjectMapper().writeValueAsString(evidence));
    }

    static List<MultipartFile> uploads(JsonNode specs) throws IOException {
        if (specs.isNull()) return null;
        var files = new ArrayList<MultipartFile>();
        for (var spec : specs) {
            if (spec.isNull()) { files.add(null); continue; }
            var file = mock(MultipartFile.class);
            byte[] bytes = HexFormat.of().parseHex(spec.path("hex").asText());
            when(file.isEmpty()).thenReturn(spec.path("empty").asBoolean());
            when(file.getSize()).thenReturn(spec.path("size").asLong(bytes.length));
            when(file.getContentType()).thenReturn(text(spec,"mime"));
            when(file.getOriginalFilename()).thenReturn(text(spec,"name"));
            if (spec.path("ioError").asBoolean()) when(file.getBytes()).thenThrow(new IOException("Injected upload read failure"));
            else when(file.getBytes()).thenReturn(bytes);
            files.add(file);
        }
        return files;
    }
}
