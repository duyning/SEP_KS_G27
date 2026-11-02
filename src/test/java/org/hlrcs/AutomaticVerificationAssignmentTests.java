package org.hlrcs;

import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.*;
import org.hlrcs.repository.*;
import org.hlrcs.service.AutomaticVerificationAssignment;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties={"app.verification.auto-assignment.enabled=true",
    "app.verification.auto-assignment.initial-delay-ms=3600000",
    "spring.datasource.url=jdbc:h2:mem:automatic-assignment;MODE=MySQL;DB_CLOSE_DELAY=-1"})
@ActiveProfiles("test") @DirtiesContext
class AutomaticVerificationAssignmentTests {
    @Autowired AutomaticVerificationAssignment assignment;
    @Autowired UserRepository users;
    @Autowired PropertyRegistrationRepository registrations;
    @Autowired PropertyAssignmentEventRepository events;
    @Autowired PropertyRepository properties;
    @Autowired ApplicationEventPublisher publisher;
    @Autowired PlatformTransactionManager manager;
    private User owner;
    private TransactionTemplate tx;

    @BeforeEach void setup() {
        events.deleteAll(); properties.deleteAll(); registrations.deleteAll();
        for(var staff:users.findByRoleAndStatusOrderByUserIdAsc(UserRole.STAFF,UserStatus.ACTIVE)) {
            staff.setStatus(UserStatus.INACTIVE);users.saveAndFlush(staff);
        }
        owner=user(UserRole.ROOM_HOST,UserStatus.ACTIVE);
        tx=new TransactionTemplate(manager);
    }
    private User user(UserRole role,UserStatus status) {
        return users.saveAndFlush(User.builder().email(UUID.randomUUID()+"@test.local")
            .fullName("Assignment test").passwordHash("test-only").role(role).status(status).build());
    }
    private PropertyRegistration row(User applicant, RegistrationStatus status,User staff) {
        return registrations.saveAndFlush(PropertyRegistration.builder().user(applicant).name("Test property")
            .status(status).assignedStaff(staff).build());
    }
    private Integer assignedId(Integer id) {
        return tx.execute(s -> { var staff=registrations.findById(id).orElseThrow().getAssignedStaff();return staff==null?null:staff.getUserId(); });
    }

    @Test void leastWorkloadIncludesSupplementButExcludesCompletedAndWritesAuditOnce() {
        var busy=user(UserRole.STAFF,UserStatus.ACTIVE);var free=user(UserRole.STAFF,UserStatus.ACTIVE);
        row(owner,RegistrationStatus.NEEDS_SUPPLEMENT,busy);
        row(owner,RegistrationStatus.APPROVED,free);row(owner,RegistrationStatus.REJECTED,free);
        var pending=row(owner,RegistrationStatus.PENDING,null);
        assertTrue(assignment.assign(pending.getRegistrationId()));
        assertEquals(free.getUserId(),assignedId(pending.getRegistrationId()));
        assertFalse(assignment.assign(pending.getRegistrationId()));
        var audit=events.findByRegistration_RegistrationIdOrderByAssignmentVersionAsc(pending.getRegistrationId());
        assertEquals(1,audit.size());assertEquals("SYSTEM:auto-assignment",audit.get(0).getActor());
        assertEquals(1,audit.get(0).getAssignmentVersion());assertEquals(free.getUserId(),audit.get(0).getNewStaffId());
    }

    @Test void equalWorkloadPrioritizesStaffWhoHasNeverBeenAssigned() {
        var previous=user(UserRole.STAFF,UserStatus.ACTIVE);var never=user(UserRole.STAFF,UserStatus.ACTIVE);
        var closed=row(owner,RegistrationStatus.APPROVED,previous);
        events.saveAndFlush(PropertyAssignmentEvent.builder().registration(closed).assignmentVersion(1)
            .newStaffId(previous.getUserId()).actor("SYSTEM:test").action("ASSIGNED").build());
        var pending=row(owner,RegistrationStatus.PENDING,null);assignment.assign(pending.getRegistrationId());
        assertEquals(never.getUserId(),assignedId(pending.getRegistrationId()));
    }

    @Test void noEligibleStaffStaysWaitingAndRetryPicksUpWhenStaffBecomesAvailable() {
        user(UserRole.ADMIN,UserStatus.ACTIVE);user(UserRole.USER,UserStatus.ACTIVE);
        var inactive=user(UserRole.STAFF,UserStatus.INACTIVE);
        var pending=row(owner,RegistrationStatus.PENDING,null);
        assertFalse(assignment.assign(pending.getRegistrationId()));assertNull(assignedId(pending.getRegistrationId()));
        assertEquals(0,events.count());
        inactive.setStatus(UserStatus.ACTIVE);users.saveAndFlush(inactive);assignment.retryWaiting();
        assertEquals(inactive.getUserId(),assignedId(pending.getRegistrationId()));
    }

    @Test void applicantCannotReceiveTheirOwnApplication() {
        var applicant=user(UserRole.STAFF,UserStatus.ACTIVE);
        var pending=row(applicant,RegistrationStatus.PENDING,null);
        assertFalse(assignment.assign(pending.getRegistrationId()));
        var other=user(UserRole.STAFF,UserStatus.ACTIVE);assignment.assign(pending.getRegistrationId());
        assertEquals(other.getUserId(),assignedId(pending.getRegistrationId()));
    }

    @Test void resubmissionsKeepExistingStaffAndCompletedApplicationsAreNotAssigned() {
        var staff=user(UserRole.STAFF,UserStatus.ACTIVE);user(UserRole.STAFF,UserStatus.ACTIVE);
        var supplement=row(owner,RegistrationStatus.NEEDS_SUPPLEMENT,staff);
        assertFalse(assignment.assign(supplement.getRegistrationId()));
        supplement.setStatus(RegistrationStatus.PENDING);registrations.saveAndFlush(supplement);
        assertFalse(assignment.assign(supplement.getRegistrationId()));
        assertEquals(staff.getUserId(),assignedId(supplement.getRegistrationId()));
        for(var status:List.of(RegistrationStatus.APPROVED,RegistrationStatus.REJECTED,RegistrationStatus.NEEDS_SUPPLEMENT))
            assertFalse(assignment.assign(row(owner,status,null).getRegistrationId()));
        assertEquals(0,events.count());
    }

    @Test void linkedPropertyOwnerCannotBeAssignedEvenWhenAnotherAccountSubmitted() {
        var propertyOwner=user(UserRole.STAFF,UserStatus.ACTIVE);
        var property=properties.saveAndFlush(Property.builder().name("Owned property").owner(propertyOwner).build());
        var pending=row(owner,RegistrationStatus.PENDING,null);
        pending.setTargetPropertyId(property.getPropertyId());registrations.saveAndFlush(pending);
        assertFalse(assignment.assign(pending.getRegistrationId()));
        var eligible=user(UserRole.STAFF,UserStatus.ACTIVE);assignment.assign(pending.getRegistrationId());
        assertEquals(eligible.getUserId(),assignedId(pending.getRegistrationId()));
    }

    @Test void failedAuditRollsBackAssignmentAndLeavesApplicationWaiting() {
        var staff=user(UserRole.STAFF,UserStatus.ACTIVE);
        var pending=row(owner,RegistrationStatus.PENDING,null);
        events.saveAndFlush(PropertyAssignmentEvent.builder().registration(pending).assignmentVersion(1)
            .newStaffId(staff.getUserId()).actor("SYSTEM:test").action("ASSIGNED").build());
        assertThrows(RuntimeException.class,() -> assignment.assign(pending.getRegistrationId()));
        assertNull(assignedId(pending.getRegistrationId()));
        assertEquals(0,registrations.findById(pending.getRegistrationId()).orElseThrow().getAssignmentVersion());
        assertEquals(1,events.count());
    }

    @Test void submissionListenerRunsOnlyAfterSuccessfulCommit() {
        var staff=user(UserRole.STAFF,UserStatus.ACTIVE);
        var committed=tx.execute(s -> {
            var application=row(owner,RegistrationStatus.PENDING,null);
            publisher.publishEvent(new AutomaticVerificationAssignment.Submitted(application.getRegistrationId()));
            assertNull(application.getAssignedStaff());return application.getRegistrationId();
        });
        assertEquals(staff.getUserId(),assignedId(committed));
        var before=events.count();
        tx.executeWithoutResult(s -> {
            var application=row(owner,RegistrationStatus.PENDING,null);
            publisher.publishEvent(new AutomaticVerificationAssignment.Submitted(application.getRegistrationId()));s.setRollbackOnly();
        });
        assertEquals(before,events.count());assertEquals(1,registrations.count());
    }

    @Test void concurrentWorkersBalanceAssignmentsAndNeverDuplicateAssignmentEvents() throws Exception {
        var a=user(UserRole.STAFF,UserStatus.ACTIVE);var b=user(UserRole.STAFF,UserStatus.ACTIVE);
        var ids=new ArrayList<Integer>();for(int i=0;i<8;i++) ids.add(row(owner,RegistrationStatus.PENDING,null).getRegistrationId());
        var pool=Executors.newFixedThreadPool(4);
        try {
            var tasks=new ArrayList<Callable<Boolean>>();
            for(var id:ids) {tasks.add(() -> assignment.assign(id));tasks.add(() -> assignment.assign(id));}
            for(var result:pool.invokeAll(tasks)) result.get(30,TimeUnit.SECONDS);
        } finally { pool.shutdownNow(); }
        assertEquals(4,registrations.countByAssignedStaff_UserIdAndStatus(a.getUserId(),RegistrationStatus.PENDING));
        assertEquals(4,registrations.countByAssignedStaff_UserIdAndStatus(b.getUserId(),RegistrationStatus.PENDING));
        assertEquals(8,events.count());
    }
}
