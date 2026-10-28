package org.hlrcs.service;

import org.hlrcs.entity.RoomType;
import org.hlrcs.entity.enums.RegistrationStatus;
import org.hlrcs.entity.enums.UserStatus;
import org.springframework.data.jpa.domain.Specification;

/** Shared, fail-closed visibility rule for public list, summary and image access. */
public final class PublicAccommodationPolicy {
    private PublicAccommodationPolicy() { }

    public static Specification<RoomType> visible() {
        return (root, query, cb) -> {
            var property = root.join("property");
            var registration = property.join("registration");
            var owner = property.join("owner");
            return cb.and(
                    cb.equal(property.get("status"), "ACTIVE"),
                    cb.equal(registration.get("status"), RegistrationStatus.APPROVED),
                    cb.equal(owner.get("status"), UserStatus.ACTIVE),
                    cb.greaterThan(root.get("price"), java.math.BigDecimal.ZERO),
                    cb.greaterThan(root.get("areaSqm"), 0F));
        };
    }
}
