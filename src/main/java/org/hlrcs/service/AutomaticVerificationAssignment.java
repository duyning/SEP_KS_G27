package org.hlrcs.service;

import lombok.extern.slf4j.Slf4j;
import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.*;
import org.hlrcs.repository.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import java.time.LocalDateTime;
import java.util.*;

@Service @Slf4j
public class AutomaticVerificationAssignment {
    public record Submitted(Integer registrationId) {}
    private final VerificationAssignmentQueueRepository queue;
    private final PropertyRegistrationRepository registrations;
    private final PropertyAssignmentEventRepository events;
    private final UserRepository users;
    private final PropertyVerificationAccess policy;
    private final jakarta.persistence.EntityManager em;
    private final TransactionTemplate transaction;
    private final boolean enabled;

    public AutomaticVerificationAssignment(VerificationAssignmentQueueRepository queue,
            PropertyRegistrationRepository registrations, PropertyAssignmentEventRepository events,
            UserRepository users, PropertyVerificationAccess policy, jakarta.persistence.EntityManager em,
            PlatformTransactionManager manager,
            @Value("${app.verification.auto-assignment.enabled:false}") boolean enabled) {
        this.queue=queue; this.registrations=registrations; this.events=events;
        this.users=users; this.policy=policy; this.em=em; this.enabled=enabled;
        transaction=new TransactionTemplate(manager);
        transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        transaction.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
        transaction.setTimeout(20);
    }

    public void initialize() {
        if (!enabled) return;
        try {
            transaction.executeWithoutResult(status -> {
                if (!queue.existsById(1)) queue.saveAndFlush(new VerificationAssignmentQueue(1));
            });
        } catch (org.springframework.dao.DataIntegrityViolationException concurrentStartup) {
            if (!queue.existsById(1)) throw concurrentStartup;
        }
    }

    /** Separate transaction: assignment failure must not undo a submitted application. */
    public boolean assign(Integer id) {
        if (!enabled) return false;
        return Boolean.TRUE.equals(transaction.execute(status -> {
            queue.lockQueue().orElseThrow(() -> new IllegalStateException("Assignment queue not initialized"));
            var row=registrations.findForReview(id).orElse(null);
            if (row==null) return false;
            em.refresh(row, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
            // Never replace an existing assignee, including supplement/resubmission flows.
            if (row.getAssignedStaff()!=null || row.getStatus()!=RegistrationStatus.PENDING) return false;
            var candidates=new ArrayList<>(users.findByRoleAndStatusOrderByUserIdAsc(UserRole.STAFF,UserStatus.ACTIVE));
            var loads=new HashMap<Integer,Long>();
            var lastAssigned=new HashMap<Integer,LocalDateTime>();
            for (var staff:candidates) {
                loads.put(staff.getUserId(), registrations.countByAssignedStaff_UserIdAndStatus(staff.getUserId(),RegistrationStatus.PENDING)
                    + registrations.countByAssignedStaff_UserIdAndStatus(staff.getUserId(),RegistrationStatus.NEEDS_SUPPLEMENT));
                lastAssigned.put(staff.getUserId(),events.lastAssignedAt(staff.getUserId()));
            }
            candidates.sort(Comparator.<User>comparingLong(s -> loads.get(s.getUserId()))
                .thenComparing(s -> lastAssigned.get(s.getUserId()),Comparator.nullsFirst(Comparator.naturalOrder()))
                .thenComparing(User::getUserId));
            for (var candidate:candidates) {
                if (policy.conflict(row,candidate.getUserId())) continue;
                var staff=users.findForRegistrationUpdate(candidate.getUserId()).orElse(null);
                if(staff==null) continue;
                em.refresh(staff,jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
                if(staff.getRole()!=UserRole.STAFF || staff.getStatus()!=UserStatus.ACTIVE || policy.conflict(row,staff.getUserId())) continue;
                row.setAssignedStaff(staff);
                row.setAssignmentVersion(row.getAssignmentVersion()+1);
                registrations.saveAndFlush(row);
                events.saveAndFlush(PropertyAssignmentEvent.builder().registration(row)
                    .assignmentVersion(row.getAssignmentVersion()).newStaffId(staff.getUserId())
                    .actor("SYSTEM:auto-assignment").action("ASSIGNED").build());
                return true;
            }
            return false;
        }));
    }

    public void tryAssign(Integer id) {
        try { assign(id); }
        catch (RuntimeException failure) {
            // Do not log documents, personal details, or full SQL in submission responses.
            log.warn("Automatic assignment deferred for registration {} ({})",id,failure.getClass().getSimpleName());
        }
    }

    public void retryWaiting() {
        if (!enabled) return;
        int afterId=0;
        while (true) {
            var batch=registrations.findWaitingAssignmentIds(afterId,org.springframework.data.domain.PageRequest.of(0,100));
            if (batch.isEmpty()) return;
            for (var id:batch) tryAssign(id);
            afterId=batch.get(batch.size()-1);
        }
    }
}
