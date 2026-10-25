package org.hlrcs.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;
import java.util.Objects;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomTypeAmenityId implements Serializable {

    @Column(name = "room_type_id")
    private Integer roomTypeId;

    @Column(name = "amenity_id")
    private Integer amenityId;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        RoomTypeAmenityId that = (RoomTypeAmenityId) o;
        return Objects.equals(roomTypeId, that.roomTypeId) &&
               Objects.equals(amenityId, that.amenityId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(roomTypeId, amenityId);
    }
}
