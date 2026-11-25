package org.hlrcs.service;

import org.hlrcs.entity.Service;
import org.hlrcs.entity.ServiceRegistration;
import org.hlrcs.entity.User;
import org.hlrcs.entity.enums.RegistrationStatus;
import org.hlrcs.entity.enums.UserStatus;
import org.hlrcs.repository.UserCapabilityRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Pure service unit tests: no Spring context, network or database. */
@ExtendWith(MockitoExtension.class)
class ServicePublicationIsPublicUnitTest {
    @Mock private UserCapabilityRepository capabilities;
    private ServicePublicationService service;
    private Service row;

    @BeforeEach
    void setUp() {
        service = new ServicePublicationService(capabilities);
        row = Service.builder().status("ACTIVE").moderationHidden(false)
                .provider(User.builder().userId(42).status(UserStatus.ACTIVE).build())
                .registration(ServiceRegistration.builder().status(RegistrationStatus.APPROVED)
                        .capabilityDecision("APPROVE").listingDecision("APPROVE").build())
                .build();
    }

    @Test
    void UTCID01_isPublic_AllEligible() {
        when(capabilities.existsByUser_UserIdAndCapability_CodeAndStatus(42, "MANAGE_SERVICE", "ACTIVE"))
                .thenReturn(true);
        assertTrue(service.isPublic(row));
        verify(capabilities).existsByUser_UserIdAndCapability_CodeAndStatus(42, "MANAGE_SERVICE", "ACTIVE");
        verifyNoMoreInteractions(capabilities);
    }

    @Test
    void UTCID02_isPublic_ModerationHidden() {
        row.setModerationHidden(true);
        assertFalse(service.isPublic(row));
        verifyNoInteractions(capabilities);
    }

    @Test
    void UTCID03_isPublic_InactiveService() {
        row.setStatus("INACTIVE");
        assertFalse(service.isPublic(row));
        verifyNoInteractions(capabilities);
    }

    @Test
    void UTCID04_isPublic_InactiveProvider() {
        row.getProvider().setStatus(UserStatus.INACTIVE);
        assertFalse(service.isPublic(row));
        verifyNoInteractions(capabilities);
    }

    @Test
    void UTCID05_isPublic_MissingRegistration() {
        row.setRegistration(null);
        assertFalse(service.isPublic(row));
        verifyNoInteractions(capabilities);
    }

    @Test
    void UTCID06_isPublic_PendingRegistration() {
        row.getRegistration().setStatus(RegistrationStatus.PENDING);
        assertFalse(service.isPublic(row));
        verifyNoInteractions(capabilities);
    }

    @Test
    void UTCID07_isPublic_CapabilityRejected() {
        row.getRegistration().setCapabilityDecision("REJECT");
        assertFalse(service.isPublic(row));
        verifyNoInteractions(capabilities);
    }

    @Test
    void UTCID08_isPublic_ListingRejected() {
        row.getRegistration().setListingDecision("REJECT");
        assertFalse(service.isPublic(row));
        verifyNoInteractions(capabilities);
    }

    @Test
    void UTCID09_isPublic_MissingCapability() {
        when(capabilities.existsByUser_UserIdAndCapability_CodeAndStatus(42, "MANAGE_SERVICE", "ACTIVE"))
                .thenReturn(false);
        assertFalse(service.isPublic(row));
        verify(capabilities).existsByUser_UserIdAndCapability_CodeAndStatus(42, "MANAGE_SERVICE", "ACTIVE");
        verifyNoMoreInteractions(capabilities);
    }

    @Test
    void UTCID10_isPublic_NullServiceStatus() {
        row.setStatus(null);
        assertFalse(service.isPublic(row));
        verifyNoInteractions(capabilities);
    }

    @Test
    void UTCID11_isPublic_NullProviderStatus() {
        row.getProvider().setStatus(null);
        assertFalse(service.isPublic(row));
        verifyNoInteractions(capabilities);
    }

    @Test
    void UTCID12_isPublic_NullRegistrationStatus() {
        row.getRegistration().setStatus(null);
        assertFalse(service.isPublic(row));
        verifyNoInteractions(capabilities);
    }

    @Test
    void UTCID13_isPublic_NullCapabilityDecision() {
        row.getRegistration().setCapabilityDecision(null);
        assertFalse(service.isPublic(row));
        verifyNoInteractions(capabilities);
    }

    @Test
    void UTCID14_isPublic_NullListingDecision() {
        row.getRegistration().setListingDecision(null);
        assertFalse(service.isPublic(row));
        verifyNoInteractions(capabilities);
    }

    @Test
    void UTCID15_isPublic_NullService() {
        row = null;
        assertThrows(NullPointerException.class, () -> service.isPublic(row));
        verifyNoInteractions(capabilities);
    }

    @Test
    void UTCID16_isPublic_NullProvider() {
        row.setProvider(null);
        assertThrows(NullPointerException.class, () -> service.isPublic(row));
        verifyNoInteractions(capabilities);
    }

    @Test
    void UTCID17_isPublic_RepositoryFailure() {
        var failure = new IllegalStateException("repository unavailable");
        when(capabilities.existsByUser_UserIdAndCapability_CodeAndStatus(42, "MANAGE_SERVICE", "ACTIVE"))
                .thenThrow(failure);
        assertSame(failure, assertThrows(IllegalStateException.class, () -> service.isPublic(row)));
        verify(capabilities).existsByUser_UserIdAndCapability_CodeAndStatus(42, "MANAGE_SERVICE", "ACTIVE");
        verifyNoMoreInteractions(capabilities);
    }

    @Test
    void UTCID18_isPublic_EmptyServiceStatus() {
        row.setStatus("");
        assertFalse(service.isPublic(row));
        verifyNoInteractions(capabilities);
    }

    @Test
    void UTCID19_isPublic_RejectedRegistration() {
        row.getRegistration().setStatus(RegistrationStatus.REJECTED);
        assertFalse(service.isPublic(row));
        verifyNoInteractions(capabilities);
    }

    @Test
    void UTCID20_isPublic_CancelledRegistration() {
        row.getRegistration().setStatus(RegistrationStatus.CANCELLED);
        assertFalse(service.isPublic(row));
        verifyNoInteractions(capabilities);
    }

    @Test
    void UTCID21_isPublic_SupplementRegistration() {
        row.getRegistration().setStatus(RegistrationStatus.NEEDS_SUPPLEMENT);
        assertFalse(service.isPublic(row));
        verifyNoInteractions(capabilities);
    }

    @Test
    void UTCID22_isPublic_HiddenNullProvider() {
        row.setModerationHidden(true); row.setProvider(null);
        assertFalse(service.isPublic(row));
        verifyNoInteractions(capabilities);
    }
}
