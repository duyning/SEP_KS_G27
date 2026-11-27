package org.hlrcs.service;

import org.hlrcs.entity.*;
import org.hlrcs.repository.*;
import org.hlrcs.exception.AppException;
import org.junit.jupiter.api.Test;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class ServiceOwnerRemovalTest {
    final AuthService auth = mock(AuthService.class);
    final UserRepository users = mock(UserRepository.class);
    final ServiceRepository listings = mock(ServiceRepository.class);
    final ServiceRegistrationRepository registrations = mock(ServiceRegistrationRepository.class);
    final ModerationLogRepository logs = mock(ModerationLogRepository.class);
    final ServicePublicationService publication = mock(ServicePublicationService.class);
    final ServiceRegistrationService service = spy(new ServiceRegistrationService(auth, users,
            mock(ServiceCategoryRepository.class), registrations, mock(ServiceDocumentRepository.class),
            listings, publication, logs, mock(tools.jackson.databind.ObjectMapper.class)));
    final User owner = User.builder().userId(42).build();
    final ServiceRegistration registration = ServiceRegistration.builder().registrationId(7).build();
    final org.hlrcs.entity.Service listing = org.hlrcs.entity.Service.builder().serviceId(9)
            .provider(owner).registration(registration).status("ACTIVE").revision(2).build();

    ServiceOwnerRemovalTest() {
        when(auth.getCurrentUser()).thenReturn(owner);
        when(users.findForRegistrationUpdate(42)).thenReturn(Optional.of(owner));
        when(listings.findById(9)).thenReturn(Optional.of(listing));
        doReturn(null).when(service).info(registration);
    }

    @Test void removesImmediatelyAndRetainsRegistrationWithAudit() {
        service.remove(9, 2);
        assertEquals("DELETED", listing.getStatus());
        assertEquals(3, listing.getRevision());
        assertSame(registration, listing.getRegistration());
        verify(listings).saveAndFlush(listing);
        verify(logs).save(argThat(log -> log.getStaff() == owner && log.getTargetId() == 9
                && "OWNER_REMOVED".equals(log.getAction()) && "ACTIVE -> DELETED".equals(log.getNote())));
        verify(registrations, never()).save(any());
        verify(listings, never()).delete(any());
        verifyNoInteractions(publication);
    }

    @Test void rejectsOtherOwnerAndStaleVersionWithoutWrites() {
        assertThrows(AppException.class, () -> service.remove(9, 1));
        listing.setProvider(User.builder().userId(99).build());
        assertThrows(AppException.class, () -> service.remove(9, 2));
        verify(listings, never()).saveAndFlush(any());
        verifyNoInteractions(logs);
    }

    @Test void rejectsRepeatedRemovalAndPendingChanges() {
        when(registrations.existsByTargetService_ServiceIdAndStatusIn(eq(9), anyList())).thenReturn(true);
        assertThrows(AppException.class, () -> service.remove(9, 2));
        listing.setStatus("DELETED");
        assertThrows(AppException.class, () -> service.remove(9, 2));
        verify(listings, never()).saveAndFlush(any());
    }
}
