package org.hlrcs.repository;
import org.hlrcs.entity.Wishlist;
import org.springframework.data.jpa.repository.JpaRepository;
public interface WishlistRepository extends JpaRepository<Wishlist,Integer> {
    void deleteByRoomType_RoomTypeId(Integer id);
    java.util.Optional<Wishlist> findByUser_UserIdAndRoomType_RoomTypeId(Integer userId, Integer roomTypeId);
    java.util.Optional<Wishlist> findByWishlistIdAndUser_UserId(Integer id, Integer userId);
    org.springframework.data.domain.Page<Wishlist> findByUser_UserId(Integer userId, org.springframework.data.domain.Pageable page);
    java.util.List<Wishlist> findByUser_UserIdAndRoomType_RoomTypeIdIn(Integer userId, java.util.Collection<Integer> ids);
    long countByUser_UserId(Integer userId);
}
