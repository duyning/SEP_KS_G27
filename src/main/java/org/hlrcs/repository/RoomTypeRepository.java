package org.hlrcs.repository;

import org.hlrcs.entity.RoomType;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface RoomTypeRepository extends JpaRepository<RoomType, Integer>, JpaSpecificationExecutor<RoomType> {
    @Override
    @EntityGraph(attributePaths = {"property", "property.registration"})
    Page<RoomType> findAll(Specification<RoomType> specification, Pageable pageable);
    List<RoomType> findByProperty_Owner_UserId(Integer ownerId);
    boolean existsByProperty_PropertyIdAndRoomTypeIgnoreCase(Integer propertyId, String roomType);
    boolean existsByProperty_PropertyIdAndRoomTypeIgnoreCaseAndRoomTypeIdNot(Integer propertyId, String roomType, Integer id);
}
