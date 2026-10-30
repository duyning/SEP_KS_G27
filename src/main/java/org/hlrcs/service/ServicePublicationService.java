package org.hlrcs.service;

import lombok.RequiredArgsConstructor;
import org.hlrcs.entity.enums.RegistrationStatus;
import org.hlrcs.entity.enums.UserStatus;
import org.hlrcs.repository.UserCapabilityRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The same eligibility rule is used for public listings and the applicant's result. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ServicePublicationService {
    private final UserCapabilityRepository capabilities;

    public boolean hasCapability(Integer providerId) {
        return capabilities.existsByUser_UserIdAndCapability_CodeAndStatus(providerId, "MANAGE_SERVICE", "ACTIVE");
    }
    public boolean isPublic(org.hlrcs.entity.Service row) {
        var registration = row.getRegistration();
        return "ACTIVE".equals(row.getStatus()) && row.getProvider().getStatus() == UserStatus.ACTIVE
                && registration != null && registration.getStatus() == RegistrationStatus.APPROVED
                && "APPROVE".equals(registration.getCapabilityDecision()) && "APPROVE".equals(registration.getListingDecision())
                && hasCapability(row.getProvider().getUserId());
    }
}
