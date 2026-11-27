package org.hlrcs.service;

import org.hlrcs.dto.request.ServiceChangeRequest;
import org.hlrcs.dto.request.ServiceRegistrationRequest;
import org.hlrcs.entity.ModerationLog;
import org.hlrcs.entity.Service;
import org.hlrcs.entity.ServiceCategory;
import org.hlrcs.entity.ServiceDocument;
import org.hlrcs.entity.ServiceImage;
import org.hlrcs.entity.ServiceRegistration;
import org.hlrcs.entity.User;
import org.hlrcs.exception.AppException;
import org.hlrcs.repository.ModerationLogRepository;
import org.hlrcs.repository.ServiceCategoryRepository;
import org.hlrcs.repository.ServiceDocumentRepository;
import org.hlrcs.repository.ServiceRegistrationRepository;
import org.hlrcs.repository.ServiceRepository;
import org.hlrcs.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.MockedStatic;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Collections;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

import static org.hlrcs.entity.enums.RegistrationStatus.APPROVED;
import static org.hlrcs.entity.enums.RegistrationStatus.NEEDS_SUPPLEMENT;
import static org.hlrcs.entity.enums.RegistrationStatus.PENDING;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ServiceUpdateUnitTests {
    private static final int OWNER = 7;
    private static final int SERVICE = 20;
    private static final int ORIGINAL = 30;
    private static final int PROPOSAL = 31;
    private static final int REVISION = 4;
    private static final String NAME = "Updated cleaning";
    private static final String DESCRIPTION = "Cleaning and pickup for local residents.";
    private static final String NOTE = " 0123456789 ";
    private static final String AREA = "Tân Xã";
    private static final String MISSING = "Không tìm thấy dịch vụ của bạn.";
    private static final String STALE =
            "Dịch vụ đã thay đổi hoặc tài khoản không còn quyền quản lý. Vui lòng tải lại.";
    private static final byte[] JPEG = {(byte) 255, (byte) 216, (byte) 255, 1};
    private static final byte[] OLD_COVER = {5, 6};
    private static final byte[] OLD_EXTRA = {7, 8};

    private final AuthService auth = mock(AuthService.class);
    private final UserRepository users = mock(UserRepository.class);
    private final ServiceCategoryRepository categories = mock(ServiceCategoryRepository.class);
    private final ServiceRegistrationRepository registrations = mock(ServiceRegistrationRepository.class);
    private final ServiceDocumentRepository documents = mock(ServiceDocumentRepository.class);
    private final ServiceRepository listings = mock(ServiceRepository.class);
    private final ServicePublicationService publication = mock(ServicePublicationService.class);
    private final ModerationLogRepository logs = mock(ModerationLogRepository.class);
    private final ServiceRegistrationService service = spy(new ServiceRegistrationService(
            auth, users, categories, registrations, documents, listings, publication, logs, null));
    private final ServiceRegistrationService.RegistrationInfo response = mock(ServiceRegistrationService.RegistrationInfo.class);
    private final User owner = User.builder().userId(OWNER).build();
    private final ServiceCategory category = ServiceCategory.builder().categoryId(10).name("Cleaning").build();
    private final ServiceRegistration original = ServiceRegistration.builder().registrationId(ORIGINAL)
            .user(owner).category(category).status(APPROVED).applicantName("Old applicant")
            .imageContent(OLD_COVER).imageContentType("image/png").build();
    private final Service listing = Service.builder().serviceId(SERVICE).provider(owner).category(category)
            .registration(original).revision(REVISION).status("ACTIVE").serviceName("Original service")
            .description("Original public description").build();
    private MockedStatic<ServiceAreaPolicy> areas;

    @BeforeEach
    void stubDependencies() {
        original.getAdditionalImages().add(new ServiceImage(OLD_EXTRA, "image/webp"));
        when(auth.getCurrentUser()).thenReturn(owner);
        when(users.findForRegistrationUpdate(OWNER)).thenReturn(Optional.of(owner));
        when(listings.findById(SERVICE)).thenReturn(Optional.of(listing));
        when(publication.hasCapability(OWNER)).thenReturn(true);
        when(categories.findById(10)).thenReturn(Optional.of(category));
        when(registrations.save(any(ServiceRegistration.class))).thenAnswer(call -> {
            ServiceRegistration proposal = call.getArgument(0);
            proposal.setRegistrationId(PROPOSAL);
            return proposal;
        });
        doReturn(response).when(service).info(any(ServiceRegistration.class));
        areas = mockStatic(ServiceAreaPolicy.class);
        areas.when(() -> ServiceAreaPolicy.normalize(AREA, null, false)).thenReturn(new ServiceAreaPolicy.Areas(AREA, ""));
    }

    @AfterEach
    void closeAreaMock() {
        areas.close();
    }

    @Test
    void utc01SubmitsPendingProposalAndCopiesOriginalAttachments() throws IOException {
        var proof = ServiceDocument.builder().registration(original).documentName("proof.pdf")
                .contentType("application/pdf").fileContent(new byte[]{1, 2}).verificationStatus("APPROVED").build();
        when(documents.findByRegistration_RegistrationIdOrderByDocumentIdAsc(ORIGINAL)).thenReturn(List.of(proof));
        when(listings.findByProvider_UserIdOrderByServiceIdDesc(OWNER)).thenReturn(List.of(
                listing, other(21, "DELETED", NAME), other(22, "ACTIVE", "Different service")));

        var proposal = submit(details(10, "0355-550-141"), null);

        assertEquals(NAME, proposal.getServiceName());
        assertEquals("New applicant", proposal.getApplicantName());
        assertEquals(DESCRIPTION, proposal.getDescription());
        assertEquals("0355550141", proposal.getContactInfo());
        assertEquals("owner@example.com", proposal.getContactEmail());
        assertEquals("FIXED", proposal.getPricingType());
        assertEquals(new BigDecimal("50000"), proposal.getPrice());
        assertEquals("giờ", proposal.getPriceUnit());
        assertEquals(AREA, proposal.getServiceArea());
        assertSame(category, proposal.getCategory());
        assertArrayEquals(OLD_COVER, proposal.getImageContent());
        var extra = proposal.getAdditionalImages().get(0);
        assertNotSame(original.getAdditionalImages().get(0), extra);
        assertArrayEquals(OLD_EXTRA, extra.getContent());

        var copied = ArgumentCaptor.forClass(ServiceDocument.class);
        verify(documents).save(copied.capture());
        var document = copied.getValue();
        assertNotSame(proof, document);
        assertSame(proposal, document.getRegistration());
        assertEquals("proof.pdf", document.getDocumentName());
        assertEquals("application/pdf", document.getContentType());
        assertArrayEquals(proof.getFileContent(), document.getFileContent());
        assertEquals("PENDING", document.getVerificationStatus());
        assertEquals("APPROVED", proof.getVerificationStatus());
        areas.verify(() -> ServiceAreaPolicy.normalize(AREA, null, false), times(2));
    }

    @Test
    void utc02ReplacesImagesOnlyOnTheProposal() throws IOException {
        var proposal = submit(details(10, "0355-550-141"), List.of(jpeg()));

        assertEquals("image/jpeg", proposal.getImageContentType());
        assertArrayEquals(JPEG, proposal.getImageContent());
        assertTrue(proposal.getAdditionalImages().isEmpty());
        verify(documents, never()).save(any(ServiceDocument.class));
    }

    @Test
    void utc03StopsWhenTheOwnerCannotBeLocked() {
        when(users.findForRegistrationUpdate(OWNER)).thenReturn(Optional.empty());
        assertThrows(NoSuchElementException.class, () -> service.change(SERVICE, request(), null));
        verifyNoInteractions(listings, publication);
        assertNothingWritten();
    }

    @Test
    void utc04RejectsAMissingService() throws IOException {
        when(listings.findById(SERVICE)).thenReturn(Optional.empty());
        assertRejected(4, HttpStatus.NOT_FOUND, MISSING, request(), null);
    }

    @Test
    void utc05RejectsAServiceOwnedBySomeoneElse() throws IOException {
        listing.setProvider(User.builder().userId(99).build());
        assertRejected(5, HttpStatus.NOT_FOUND, MISSING, request(), null);
        verifyNoInteractions(publication);
    }

    @Test
    void utc06RejectsAnOwnerWithoutActiveCapability() throws IOException {
        when(publication.hasCapability(OWNER)).thenReturn(false);
        assertRejected(6, HttpStatus.CONFLICT, STALE, request(), null);
    }

    @Test
    void utc07RejectsADeletedListing() throws IOException {
        listing.setStatus("DELETED");
        assertRejected(7, HttpStatus.CONFLICT, STALE, request(), null);
    }

    @Test
    void utc08RejectsAStaleRevision() throws IOException {
        assertRejected(8, HttpStatus.CONFLICT, STALE,
                new ServiceChangeRequest("UPDATE", REVISION - 1, details(10, "0355-550-141"), NOTE), null);
    }

    @Test
    void utc09RejectsASecondOpenProposal() throws IOException {
        when(registrations.existsByTargetService_ServiceIdAndStatusIn(SERVICE, List.of(PENDING, NEEDS_SUPPLEMENT)))
                .thenReturn(true);
        assertRejected(9, HttpStatus.CONFLICT, "Dịch vụ đang có yêu cầu chờ xử lý. Hãy xem hồ sơ hiện tại.", request(), null);
    }

    @Test
    void utc10RejectsANineCharacterReasonAfterTrimming() throws IOException {
        assertRejected(10, HttpStatus.BAD_REQUEST, "Lý do thay đổi cần ít nhất 10 ký tự.",
                new ServiceChangeRequest("UPDATE", REVISION, details(10, "0355-550-141"), " 012345678 "), null);
    }

    @Test
    void utc11RejectsAListingWithoutAnOriginalProposal() throws IOException {
        listing.setRegistration(null);
        assertRejected(11, HttpStatus.CONFLICT, "Dịch vụ thiếu hồ sơ gốc.", request(), null);
    }

    @Test
    void utc12RejectsAnUpdateWithNoDetails() throws IOException {
        assertRejected(12, HttpStatus.BAD_REQUEST, "Thiếu thông tin cập nhật.",
                new ServiceChangeRequest("UPDATE", REVISION, null, NOTE), null);
    }

    @Test
    void utc13RejectsAnInvalidContactPhone() throws IOException {
        assertRejected(13, HttpStatus.BAD_REQUEST, "Số điện thoại Việt Nam không hợp lệ.",
                new ServiceChangeRequest("UPDATE", REVISION, details(10, "123"), NOTE), null);
    }

    @Test
    void utc14RejectsACaseInsensitiveNameConflictWithAnotherService() throws IOException {
        when(listings.findByProvider_UserIdOrderByServiceIdDesc(OWNER))
                .thenReturn(List.of(other(21, "ACTIVE", "UPDATED CLEANING")));
        assertRejected(14, HttpStatus.CONFLICT, "Bạn đã có dịch vụ khác trùng tên.", request(), null);
    }

    @Test
    void utc15RejectsAnUnknownCategory() throws IOException {
        assertRejected(15, HttpStatus.BAD_REQUEST, "Danh mục không hợp lệ.",
                new ServiceChangeRequest("UPDATE", REVISION, details(99, "0355-550-141"), NOTE), null);
    }

    @Test
    void utc16RejectsSixImagesBeforeWritingTheProposal() throws IOException {
        assertRejected(16, HttpStatus.BAD_REQUEST, "Chọn tối đa 5 ảnh dịch vụ.", request(), Collections.nCopies(6, jpeg()));
    }

    @Test
    void utc17RejectsAnImageWhoseContentDoesNotMatchItsMimeType() throws IOException {
        var corrupt = new MockMultipartFile("images", "bad.jpg", "image/jpeg", new byte[]{1, 2, 3, 4});
        assertRejected(17, HttpStatus.BAD_REQUEST, "Ảnh chỉ nhận JPG, PNG, WEBP đúng định dạng.", request(), List.of(corrupt));
    }

    @Test
    void utc18PropagatesAnAreaPolicyFailureWithoutWriting() {
        var failure = new IllegalStateException();
        areas.when(() -> ServiceAreaPolicy.normalize(AREA, null, false)).thenThrow(failure);

        assertSame(failure, assertThrows(IllegalStateException.class, () -> service.change(SERVICE, request(), null)));
        assertNothingWritten();
    }

    private ServiceRegistration submit(ServiceRegistrationRequest details, List<MultipartFile> images) throws IOException {
        assertSame(response, service.change(SERVICE, new ServiceChangeRequest("UPDATE", REVISION, details, NOTE), images));
        var row = ArgumentCaptor.forClass(ServiceRegistration.class);
        verify(registrations).save(row.capture());
        var proposal = row.getValue();
        assertEquals(PROPOSAL, proposal.getRegistrationId());
        assertEquals(PENDING, proposal.getStatus());
        assertEquals("UPDATE", proposal.getOperation());
        assertEquals(REVISION, proposal.getServiceRevision());
        assertEquals("0123456789", proposal.getResubmissionNote());
        assertSame(listing, proposal.getTargetService());
        assertSame(owner, proposal.getUser());
        verify(service).info(proposal);
        var entry = ArgumentCaptor.forClass(ModerationLog.class);
        verify(logs).save(entry.capture());
        assertEquals("SERVICE_REGISTRATION", entry.getValue().getTargetType());
        assertEquals(PROPOSAL, entry.getValue().getTargetId());
        assertEquals("CHANGE_REQUESTED", entry.getValue().getAction());
        assertEquals("UPDATE: 0123456789", entry.getValue().getNote());
        assertSame(owner, entry.getValue().getStaff());
        assertOriginalSnapshot();
        return proposal;
    }

    private void assertRejected(int utc, HttpStatus status, String message, ServiceChangeRequest input,
                                List<MultipartFile> images) throws IOException {
        var error = assertThrows(AppException.class, () -> service.change(SERVICE, input, images));
        assertEquals(status, error.getStatus());
        assertEquals(message, error.getMessage());
        assertNothingWritten();
        String evidence = System.getProperty("test.messageEvidenceDir");
        if (evidence != null) {
            Path out = Path.of(evidence, "service update");
            Files.createDirectories(out);
            Files.writeString(out.resolve("UTCID%02d.txt".formatted(utc)), error.getMessage());
        }
    }

    private void assertNothingWritten() {
        verify(registrations, never()).save(any(ServiceRegistration.class));
        verifyNoInteractions(documents, logs);
        verify(listings, never()).save(any(Service.class));
    }

    private void assertOriginalSnapshot() {
        assertSame(original, listing.getRegistration());
        assertEquals("Original service", listing.getServiceName());
        assertEquals("Original public description", listing.getDescription());
        assertEquals(REVISION, listing.getRevision());
        assertEquals("ACTIVE", listing.getStatus());
        assertEquals(APPROVED, original.getStatus());
        assertArrayEquals(OLD_COVER, original.getImageContent());
        assertEquals(1, original.getAdditionalImages().size());
        assertArrayEquals(OLD_EXTRA, original.getAdditionalImages().get(0).getContent());
        verify(listings, never()).save(any(Service.class));
    }

    private static ServiceChangeRequest request() {
        return new ServiceChangeRequest("UPDATE", REVISION, details(10, "0355-550-141"), NOTE);
    }

    private static ServiceRegistrationRequest details(int categoryId, String phone) {
        return new ServiceRegistrationRequest(" New applicant ", categoryId, " " + NAME + " ", " " + DESCRIPTION + " ",
                "FIXED", new BigDecimal("50000"), AREA, phone, "owner@example.com", null, false, " GIỜ ");
    }

    private static Service other(int id, String state, String name) {
        return Service.builder().serviceId(id).status(state).serviceName(name).build();
    }

    private static MockMultipartFile jpeg() {
        return new MockMultipartFile("images", "cover.jpg", "image/jpeg", JPEG);
    }
}
