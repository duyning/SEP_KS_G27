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
            var selected = query.subquery(Integer.class);
            var room = selected.from(org.hlrcs.entity.Room.class);
            selected.select(cb.literal(1)).where(cb.equal(room.get("roomType"), root),
                    cb.equal(room.get("property"), property), cb.isTrue(room.get("publicVisible")));
            return cb.and(cb.exists(selected),
                    cb.equal(property.get("status"), "ACTIVE"),
                    cb.isFalse(property.get("reverificationRequired")),
                    cb.equal(registration.get("status"), RegistrationStatus.APPROVED),
                    cb.equal(owner.get("status"), UserStatus.ACTIVE),
                    cb.greaterThan(root.get("price"), java.math.BigDecimal.ZERO),
                    cb.greaterThan(root.get("areaSqm"), 0F));
        };
    }
}
