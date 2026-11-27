package org.hlrcs.service;

import jakarta.persistence.EntityManager;
import org.hlrcs.entity.Service;
import org.hlrcs.entity.ServiceComplaint;
import org.hlrcs.entity.ServiceImage;
import org.hlrcs.entity.ServiceRating;
import org.hlrcs.entity.User;
import org.hlrcs.exception.AppException;
import org.hlrcs.repository.ModerationLogRepository;
import org.hlrcs.repository.ServiceComplaintEventRepository;
import org.hlrcs.repository.ServiceComplaintRepository;
import org.hlrcs.repository.ServiceRatingRepository;
import org.hlrcs.repository.ServiceRepository;
import org.hlrcs.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ServiceFeedbackUnitTests {
    private static final int SERVICE_ID = 20;
    private static final int FEEDBACK_ID = 30;
    private static final int OWNER_ID = 7;
    private static final int CUSTOMER_ID = 8;
    private static final String CONTENT = "  Sample feedback  ";
    private static final String CLEAN_CONTENT = "Sample feedback";
    private static final String RATING_MISSING = "Không tìm thấy đánh giá hoặc dịch vụ công khai.";
    private static final String COMPLAINT_MISSING = "Không tìm thấy báo cáo dịch vụ.";
    private static final List<String> OPEN = List.of("PENDING", "NEEDS_EXPLANATION", "EXPLAINED");

    private final AuthService auth = mock(AuthService.class);
    private final UserRepository users = mock(UserRepository.class);
    private final ServiceRepository services = mock(ServiceRepository.class);
    private final ServiceRatingRepository ratings = mock(ServiceRatingRepository.class);
    private final ServiceComplaintRepository complaints = mock(ServiceComplaintRepository.class);
    private final ServicePublicationService publication = mock(ServicePublicationService.class);
    private final EntityManager entityManager = mock(EntityManager.class);
    private final ServiceRatingService ratingService =
            new ServiceRatingService(auth, ratings, services, users, publication, entityManager);
    private final ServiceComplaintService complaintService = spy(new ServiceComplaintService(auth, complaints,
            mock(ServiceComplaintEventRepository.class), services, users, mock(ModerationLogRepository.class),
            publication, entityManager));
    private final User owner = User.builder().userId(OWNER_ID).build();
    private final User customer = User.builder().userId(CUSTOMER_ID).fullName("Customer").build();
    private final Service listing = Service.builder().serviceId(SERVICE_ID).provider(owner).build();
    private final ServiceRating existingRating = new ServiceRating();
    private final List<MultipartFile> files = List.of(mock(MultipartFile.class));
    private final ServiceImage image = new ServiceImage(new byte[]{1}, "image/png");

    @BeforeEach
    void prepareFixtures() {
        when(auth.getCurrentUser()).thenReturn(customer);
        when(services.findById(SERVICE_ID)).thenReturn(Optional.of(listing));
        when(users.findForRegistrationUpdate(OWNER_ID)).thenReturn(Optional.of(owner));
        when(publication.isPublic(listing)).thenReturn(true);
        existingRating.setRatingId(FEEDBACK_ID);
        existingRating.setService(listing);
        existingRating.setAuthor(customer);
        existingRating.setStars(4);
        existingRating.setContent("Original rating");
        when(ratings.findForReply(FEEDBACK_ID)).thenReturn(Optional.of(existingRating));
        when(ratings.saveAndFlush(any(ServiceRating.class))).thenAnswer(call -> {
            ServiceRating saved = call.getArgument(0);
            saved.setRatingId(FEEDBACK_ID);
            return saved;
        });
    }

    @ParameterizedTest(name = "UTCID{0}")
    @CsvSource({"01, 0, false", "02, 5, true"})
    void submitsRatingAtStarBoundary(String id, int stars, boolean withImage) throws IOException {
        List<MultipartFile> input = withImage ? files : null;
        try (var images = mockStatic(ServiceFeedbackImages.class)) {
            images.when(() -> ServiceFeedbackImages.text(CONTENT, 1)).thenReturn(CLEAN_CONTENT);
            images.when(() -> ServiceFeedbackImages.read(input)).thenReturn(withImage ? List.of(image) : List.of());
            var result = ratingService.submit(SERVICE_ID, stars, CONTENT, input);
            verify(ratings).saveAndFlush(argThat(saved -> saved.getService() == listing && saved.getAuthor() == customer
                    && saved.getCreatedAt() != null && saved.getStars() == stars));
            verify(entityManager).refresh(listing);
            assertEquals(FEEDBACK_ID, result.ratingId());
            assertEquals(CUSTOMER_ID, result.authorId());
            assertEquals(stars, result.stars());
            assertEquals(CLEAN_CONTENT, result.content());
            assertEquals(withImage ? List.of("/api/services/20/ratings/30/images/0") : List.of(), result.imageUrls());
        }
    }

    @ParameterizedTest(name = "UTCID{0}")
    @CsvSource({
            "03, missing, 3, NOT_FOUND", "04, missing-provider, 3, NOT_FOUND", "05, private, 3, NOT_FOUND",
            "06, own, 3, FORBIDDEN", "07, star-limit, -1, BAD_REQUEST", "08, star-limit, 6, BAD_REQUEST",
            "09, duplicate, 3, CONFLICT"
    })
    void rejectsRating(String id, String scenario, int stars, HttpStatus status) throws IOException {
        prepareSubmissionScenario(scenario);
        if (scenario.equals("duplicate")) {
            when(ratings.existsByService_ServiceIdAndAuthor_UserId(SERVICE_ID, CUSTOMER_ID)).thenReturn(true);
        }
        var failure = assertThrows(AppException.class, () -> ratingService.submit(SERVICE_ID, stars, CONTENT, null));
        String expected = switch (scenario) {
            case "own" -> "Không thể tự đánh giá dịch vụ của mình.";
            case "star-limit" -> "Số sao phải từ 0 đến 5.";
            case "duplicate" -> "Bạn đã đánh giá dịch vụ này. Mỗi người chỉ được đánh giá một lần.";
            default -> RATING_MISSING;
        };
        verify(ratings, never()).saveAndFlush(any(ServiceRating.class));
        assertFailure(id, status, expected, failure);
    }

    @ParameterizedTest(name = "UTCID{0}")
    @ValueSource(strings = "10")
    void propagatesRatingImageReadFailure(String id) {
        var failure = new IOException();
        try (var images = mockStatic(ServiceFeedbackImages.class)) {
            images.when(() -> ServiceFeedbackImages.text(CONTENT, 1)).thenReturn(CLEAN_CONTENT);
            images.when(() -> ServiceFeedbackImages.read(files)).thenThrow(failure);
            assertSame(failure, assertThrows(IOException.class,
                    () -> ratingService.submit(SERVICE_ID, 3, CONTENT, files)));
            verify(ratings, never()).saveAndFlush(any(ServiceRating.class));
        }
    }

    @ParameterizedTest(name = "UTCID{0}")
    @ValueSource(strings = "11")
    void savesOwnersReply(String id) {
        when(auth.getCurrentUser()).thenReturn(owner);
        try (var images = mockStatic(ServiceFeedbackImages.class)) {
            images.when(() -> ServiceFeedbackImages.text(CONTENT, 1)).thenReturn(CLEAN_CONTENT);
            var result = ratingService.reply(FEEDBACK_ID, CONTENT);
            verify(ratings).saveAndFlush(existingRating);
            assertEquals(CLEAN_CONTENT, existingRating.getReply());
            assertEquals(CLEAN_CONTENT, result.reply());
            assertNotNull(result.repliedAt());
            assertEquals("Original rating", result.content());
        }
    }

    @ParameterizedTest(name = "UTCID{0}")
    @CsvSource({"12, missing, NOT_FOUND", "13, other-user, FORBIDDEN", "14, already-replied, CONFLICT"})
    void rejectsReply(String id, String scenario, HttpStatus status) throws IOException {
        String expected = switch (scenario) {
            case "missing" -> {
                when(ratings.findForReply(FEEDBACK_ID)).thenReturn(Optional.empty());
                yield RATING_MISSING;
            }
            case "other-user" -> "Chỉ chủ dịch vụ được phản hồi đánh giá.";
            case "already-replied" -> {
                when(auth.getCurrentUser()).thenReturn(owner);
                existingRating.setReply("Previous reply");
                yield "Đánh giá này đã được phản hồi.";
            }
            default -> throw new AssertionError(scenario);
        };
        String original = existingRating.getReply();
        var failure = assertThrows(AppException.class, () -> ratingService.reply(FEEDBACK_ID, CONTENT));
        assertEquals(original, existingRating.getReply());
        verify(ratings, never()).saveAndFlush(any(ServiceRating.class));
        assertFailure(id, status, expected, failure);
    }

    @ParameterizedTest(name = "UTCID{0}")
    @ValueSource(strings = "15")
    void submitsComplaint(String id) throws IOException {
        when(complaints.saveAndFlush(any(ServiceComplaint.class))).thenAnswer(call -> {
            ServiceComplaint saved = call.getArgument(0);
            saved.setComplaintId(FEEDBACK_ID);
            return saved;
        });
        var response = mock(ServiceComplaintService.Detail.class);
        doReturn(response).when(complaintService).detail(FEEDBACK_ID);
        try (var images = mockStatic(ServiceFeedbackImages.class)) {
            images.when(() -> ServiceFeedbackImages.text(CONTENT, 10)).thenReturn(CLEAN_CONTENT);
            images.when(() -> ServiceFeedbackImages.read(files)).thenReturn(List.of(image));
            assertSame(response, complaintService.submit(SERVICE_ID, CONTENT, files));
            verify(complaints).saveAndFlush(argThat(saved -> saved.getReporter() == customer
                    && saved.getService() == listing && "PENDING".equals(saved.getStatus())
                    && CLEAN_CONTENT.equals(saved.getContent()) && saved.getCreatedAt() != null
                    && saved.getImages().equals(List.of(image))));
            verify(complaintService).detail(FEEDBACK_ID);
        }
    }

    @ParameterizedTest(name = "UTCID{0}")
    @CsvSource({
            "16, missing, NOT_FOUND", "17, missing-provider, NOT_FOUND", "18, private, CONFLICT",
            "19, own, FORBIDDEN", "20, duplicate, CONFLICT"
    })
    void rejectsComplaint(String id, String scenario, HttpStatus status) throws IOException {
        prepareSubmissionScenario(scenario);
        if (scenario.equals("duplicate")) {
            when(complaints.existsByService_ServiceIdAndReporter_UserIdAndStatusIn(SERVICE_ID, CUSTOMER_ID, OPEN))
                    .thenReturn(true);
        }
        var failure = assertThrows(AppException.class, () -> complaintService.submit(SERVICE_ID, CONTENT, files));
        String expected = switch (scenario) {
            case "private" -> "Dịch vụ không còn công khai.";
            case "own" -> "Không thể báo cáo dịch vụ của chính mình.";
            case "duplicate" -> "Bạn đã có báo cáo đang chờ xử lý cho dịch vụ này.";
            default -> COMPLAINT_MISSING;
        };
        verify(complaints, never()).saveAndFlush(any(ServiceComplaint.class));
        assertFailure(id, status, expected, failure);
    }

    @ParameterizedTest(name = "UTCID{0}")
    @ValueSource(strings = "21")
    void propagatesComplaintImageReadFailure(String id) {
        var failure = new IOException();
        try (var images = mockStatic(ServiceFeedbackImages.class)) {
            images.when(() -> ServiceFeedbackImages.text(CONTENT, 10)).thenReturn(CLEAN_CONTENT);
            images.when(() -> ServiceFeedbackImages.read(files)).thenThrow(failure);
            assertSame(failure, assertThrows(IOException.class,
                    () -> complaintService.submit(SERVICE_ID, CONTENT, files)));
            verify(complaints, never()).saveAndFlush(any(ServiceComplaint.class));
        }
    }

    private void prepareSubmissionScenario(String scenario) {
        switch (scenario) {
            case "missing" -> when(services.findById(SERVICE_ID)).thenReturn(Optional.empty());
            case "missing-provider" -> when(users.findForRegistrationUpdate(OWNER_ID)).thenReturn(Optional.empty());
            case "private" -> when(publication.isPublic(listing)).thenReturn(false);
            case "own" -> when(auth.getCurrentUser()).thenReturn(owner);
            default -> { }
        }
    }

    private static void assertFailure(String id, HttpStatus status, String expected, AppException failure)
            throws IOException {
        assertEquals(status, failure.getStatus());
        assertEquals(expected, failure.getMessage());
        String evidence = System.getProperty("test.messageEvidenceDir");
        if (evidence != null) {
            Path folder = Files.createDirectories(Path.of(evidence, "service feedback"));
            Files.writeString(folder.resolve("UTCID" + id + ".txt"), failure.getMessage());
        }
    }
}
