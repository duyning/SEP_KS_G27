package org.hlrcs.repository;

import org.hlrcs.entity.RoomTenancy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface RoomTenancyRepository extends JpaRepository<RoomTenancy, Long> {
    Optional<RoomTenancy> findByActiveRoomIdAndOwnerId(Integer roomId, Integer ownerId);
    List<RoomTenancy> findByRoomIdAndOwnerIdOrderByIdDesc(Integer roomId, Integer ownerId);
    @EntityGraph(attributePaths = "occupants")
    List<RoomTenancy> findByOwnerIdAndRoomIdIn(Integer ownerId, Collection<Integer> roomIds);
}
