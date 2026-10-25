package org.hlrcs.repository;
import org.hlrcs.entity.Wishlist;
import org.springframework.data.jpa.repository.JpaRepository;
public interface WishlistRepository extends JpaRepository<Wishlist,Integer> {
    void deleteByRoomType_RoomTypeId(Integer id);
}
