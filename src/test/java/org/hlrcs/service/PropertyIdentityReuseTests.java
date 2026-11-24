package org.hlrcs.service;

import org.hlrcs.dto.request.PropertyRegistrationRequest;
import org.hlrcs.entity.*;
import org.hlrcs.exception.BadRequestException;
import org.hlrcs.repository.*;
import org.junit.jupiter.api.*;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.mock.web.MockMultipartFile;
import tools.jackson.databind.ObjectMapper;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PropertyIdentityReuseTests {
    AuthService auth=mock(AuthService.class);
    UserRepository users=mock(UserRepository.class);
    PropertyRegistrationRepository registrations=mock(PropertyRegistrationRepository.class);
    PropertyDocumentRepository documents=mock(PropertyDocumentRepository.class);
    HostApplicationRepository applications=mock(HostApplicationRepository.class);
    HostApplicationIdentityRepository identities=mock(HostApplicationIdentityRepository.class);
    PropertyRegistrationService service=new PropertyRegistrationService(auth,users,registrations,documents,
            new ObjectMapper(),mock(ApplicationEventPublisher.class),applications,identities);
    User owner=new User(); HostApplication application=new HostApplication(); HostApplicationIdentity identity=new HostApplicationIdentity();
    byte[] png={(byte)137,80,78,71,13,10,26,10,1};
    @BeforeEach void setup(){
        owner.setUserId(10);when(auth.getCurrentUser()).thenReturn(owner);
        when(users.findForRegistrationUpdate(10)).thenReturn(Optional.of(owner));
        when(registrations.findByUser_UserIdOrderByCreatedAtDesc(10)).thenReturn(List.of());
        when(registrations.save(any())).thenAnswer(call->{PropertyRegistration row=call.getArgument(0);row.setRegistrationId(25);return row;});
        application.setId(99);application.setUser(owner);application.setStatus("APPROVED");
        when(applications.findByUser_UserId(10)).thenReturn(Optional.of(application));
        identity.setApplication(application);identity.setContentType("image/png");identity.setContent(png);
        when(identities.existsById(99)).thenReturn(true);when(identities.findById(99)).thenReturn(Optional.of(identity));
    }
    PropertyRegistrationRequest request(){return new PropertyRegistrationRequest("Nhà trọ mới","Chung cư mini",
            "Thông tin nhà trọ đầy đủ cho việc xét duyệt hồ sơ.","Chủ trọ","0912345678","","Hạ Bằng",
            "Mục Uyên, Xã Hạ Bằng, Hà Nội","","21.0196169","105.5517238",List.of(),List.of(),"",true);}
    MockMultipartFile pdf(){return new MockMultipartFile("document","document.pdf","application/pdf","%PDF-test".getBytes());}
    MockMultipartFile photo(){return new MockMultipartFile("photos","room.png","image/png",png);}

    @Test void copiesOnlyAuthenticatedOwnersApprovedIdentityAsPrivateRegistrationSnapshot() throws Exception {
        assertEquals(99,service.eligibility().identityApplicationId());
        service.submit(request(),List.of(photo()),pdf(),null,pdf());
        var capture=ArgumentCaptor.forClass(PropertyDocument.class);verify(documents,times(4)).save(capture.capture());
        var copy=capture.getAllValues().stream().filter(row->row.getDocumentType().equals("ID_CARD")).findFirst().orElseThrow();
        assertEquals(25,copy.getRegistration().getRegistrationId());assertEquals(10,copy.getRegistration().getUser().getUserId());
        assertEquals("PENDING",copy.getVerificationStatus());assertEquals("image/png",copy.getContentType());
        assertArrayEquals(png,copy.getFileContent());assertNotSame(png,copy.getFileContent());assertNull(copy.getDocumentUrl());
        png[8]=2;assertEquals(1,copy.getFileContent()[8]);
        verify(applications,atLeastOnce()).findByUser_UserId(10);verify(identities).findById(99);
    }
    @Test void unapprovedOrMissingIdentityStillRequiresAnUpload(){
        application.setStatus("REJECTED");assertNull(service.eligibility().identityApplicationId());
        assertThrows(BadRequestException.class,()->service.submit(request(),List.of(photo()),pdf(),null,pdf()));
        application.setStatus("APPROVED");when(identities.existsById(99)).thenReturn(false);
        assertThrows(BadRequestException.class,()->service.submit(request(),List.of(photo()),pdf(),null,pdf()));
        verify(registrations,never()).save(any());verify(documents,never()).save(any());verify(identities,never()).findById(any());
    }
    @Test void manuallyUploadedIdentityTakesPrecedence() throws Exception {
        service.submit(request(),List.of(photo()),pdf(),pdf(),pdf());
        var capture=ArgumentCaptor.forClass(PropertyDocument.class);verify(documents,times(4)).save(capture.capture());
        var copy=capture.getAllValues().stream().filter(row->row.getDocumentType().equals("ID_CARD")).findFirst().orElseThrow();
        assertEquals("document.pdf",copy.getFileName());assertEquals("application/pdf",copy.getContentType());
        verifyNoInteractions(applications,identities);
    }
    @Test void copiesTheBackSideAsWellWhenItWasSubmitted()throws Exception{
        identity.setBackContentType("image/png");identity.setBackContent(png.clone());
        service.submit(request(),List.of(photo()),pdf(),null,pdf());
        var capture=ArgumentCaptor.forClass(PropertyDocument.class);verify(documents,times(5)).save(capture.capture());
        var back=capture.getAllValues().stream().filter(row->row.getDocumentType().equals("ID_CARD_BACK")).findFirst().orElseThrow();
        assertArrayEquals(png,back.getFileContent());assertNotSame(identity.getBackContent(),back.getFileContent());assertNull(back.getDocumentUrl());
    }
}
