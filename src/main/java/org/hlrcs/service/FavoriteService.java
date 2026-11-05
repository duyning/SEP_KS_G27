package org.hlrcs.service;

import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.response.FavoriteResponse;
import org.hlrcs.entity.User;
import org.hlrcs.entity.Wishlist;
import org.hlrcs.entity.enums.UserRole;
import org.hlrcs.entity.enums.UserStatus;
import org.hlrcs.exception.BadRequestException;
import org.hlrcs.exception.ResourceNotFoundException;
import org.hlrcs.repository.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FavoriteService {
    private final AuthService auth;
    private final UserRepository users;
    private final WishlistRepository favorites;
    private final RoomTypeRepository types;
    private final AccommodationService accommodations;

    private User actor(boolean lock) {
        int id = auth.getCurrentUser().getUserId();
        // Serialize saves/removals for this account, including requests on different server instances.
        var user = (lock ? users.findForRegistrationUpdate(id) : users.findById(id))
                .orElseThrow(() -> new AccessDeniedException("Tài khoản không khả dụng."));
        if (user.getStatus() != UserStatus.ACTIVE || !Set.of(UserRole.USER, UserRole.ROOM_HOST).contains(user.getRole()))
            throw new AccessDeniedException("Chỉ người thuê và chủ trọ đang hoạt động được quản lý danh sách yêu thích.");
        return user;
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public FavoriteResponse save(Integer roomTypeId) {
        var user = actor(true);
        var type = types.findOne(PublicAccommodationPolicy.visible().and((root, query, cb) -> cb.equal(root.get("roomTypeId"), roomTypeId)))
                .orElseThrow(() -> new ResourceNotFoundException("Loại phòng không còn được công khai."));
        var favorite = favorites.findByUser_UserIdAndRoomType_RoomTypeId(user.getUserId(), roomTypeId)
                .orElseGet(() -> favorites.saveAndFlush(Wishlist.builder().user(user).roomType(type).build()));
        return responses(List.of(favorite)).get(0);
    }

    public FavoriteResponse.Page list(int page, int size) {
        if (page < 0 || size < 1 || size > 50) throw new BadRequestException("Trang phải từ 0; kích thước trang từ 1 đến 50.");
        var result = favorites.findByUser_UserId(actor(false).getUserId(), PageRequest.of(page, size,
                Sort.by(Sort.Direction.DESC, "createdAt", "wishlistId")));
        return new FavoriteResponse.Page(responses(result.getContent()), page, size, result.getTotalElements(), result.getTotalPages());
    }

    public FavoriteResponse get(Integer id) {
        var favorite = own(id, actor(false).getUserId());
        return responses(List.of(favorite)).get(0);
    }

    public FavoriteResponse.State state(List<Integer> ids) {
        if (ids.size() > 50 || ids.stream().anyMatch(id -> id == null || id < 1)) throw new BadRequestException("Tối đa 50 mã loại phòng hợp lệ.");
        int userId = actor(false).getUserId();
        var items = ids.isEmpty() ? List.<FavoriteResponse.StateItem>of() : favorites.findByUser_UserIdAndRoomType_RoomTypeIdIn(userId, ids).stream()
                .map(f -> new FavoriteResponse.StateItem(f.getRoomType().getRoomTypeId(), f.getWishlistId())).toList();
        return new FavoriteResponse.State(items, favorites.countByUser_UserId(userId));
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void remove(Integer id) {
        int userId = actor(true).getUserId();
        favorites.delete(own(id, userId));
        // No cascade from Wishlist to RoomType or Room: removing a choice never removes accommodation.
    }

    private Wishlist own(Integer id, Integer userId) {
        return favorites.findByWishlistIdAndUser_UserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy mục yêu thích."));
    }

    private List<FavoriteResponse> responses(List<Wishlist> entries) {
        var ids = entries.stream().map(f -> f.getRoomType().getRoomTypeId()).toList();
        var summaries = accommodations.publicSummaries(ids).stream().collect(Collectors.toMap(s -> s.roomTypeId(), Function.identity()));
        return entries.stream().map(f -> {
            int typeId = f.getRoomType().getRoomTypeId();
            var summary = summaries.get(typeId);
            // Hidden records disclose only the member's own saved reference and timestamp.
            return new FavoriteResponse(f.getWishlistId(), typeId, f.getCreatedAt(), summary != null, summary);
        }).toList();
    }
}
