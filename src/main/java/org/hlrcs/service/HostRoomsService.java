package org.hlrcs.service;
import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.request.RoomRequest;
import org.hlrcs.dto.response.HostRoomsResponse;
import org.hlrcs.entity.Room;
import org.hlrcs.entity.enums.RegistrationStatus;
import org.hlrcs.exception.*;
import org.hlrcs.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import java.time.LocalDateTime;

@Service @RequiredArgsConstructor
public class HostRoomsService {
    private final AuthService auth;
    private final UserRepository users;
    private final RoomRepository rooms;
    private final RoomTypeRepository types;
    private final HostRoomTypeService typeService;
    private final RoomMapping mapper;

    @Transactional(readOnly=true)
    public HostRoomsResponse list(Integer propertyId,Integer typeId) {
        var data=typeService.getRoomTypes(propertyId);
        if(typeId!=null&&data.roomTypes().stream().noneMatch(type->type.roomTypeId().equals(typeId)))throw new ResourceNotFoundException("Không tìm thấy loại phòng trong nhà trọ của bạn.");
        var rows=rooms.findByProperty_Owner_UserIdOrderByRoomNumberAsc(auth.getCurrentUser().getUserId()).stream()
                .filter(room->propertyId==null||room.getProperty().getPropertyId().equals(propertyId))
                .map(mapper::summary).toList();
        return new HostRoomsResponse(data.properties(),data.pendingRegistrationCount(),data.roomTypes(),rows);
    }
    private Room owned(Integer id) {
        return rooms.findById(id).filter(room->room.getProperty().getOwner().getUserId().equals(auth.getCurrentUser().getUserId()))
                .orElseThrow(()->new ResourceNotFoundException("Không tìm thấy phòng trong nhà trọ của bạn."));
    }
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public HostRoomsResponse.RoomSummary save(Integer id,RoomRequest value) {
        var owner=users.findForRegistrationUpdate(auth.getCurrentUser().getUserId()).orElseThrow();
        var type=types.findById(value.roomTypeId()).filter(row->row.getProperty().getOwner().getUserId().equals(owner.getUserId()))
                .orElseThrow(()->new ResourceNotFoundException("Loại phòng liên kết không tồn tại hoặc không thuộc nhà trọ của bạn."));
        var property=type.getProperty();
        if(!"ACTIVE".equalsIgnoreCase(property.getStatus())||(property.getRegistration()!=null&&property.getRegistration().getStatus()!=RegistrationStatus.APPROVED))throw new AppException("Nhà trọ chưa được phê duyệt hoặc chưa hoạt động.",HttpStatus.CONFLICT);
        if(value.customPrice()==null&&(type.getPrice()==null||type.getPrice().signum()<=0))throw new BadRequestException("Loại phòng chưa có giá hợp lệ. Hãy cập nhật loại phòng hoặc nhập giá riêng.");
        var room=id==null?Room.builder().property(property).build():owned(id);
        if(!room.getProperty().getPropertyId().equals(property.getPropertyId()))throw new BadRequestException("Không được chuyển phòng sang nhà trọ khác.");
        String number=RoomRules.number(value.roomNumber());
        String floor=RoomRules.floor(value.floor());
        if(rooms.existsByProperty_PropertyIdAndRoomNumberIgnoreCaseAndRoomIdNot(property.getPropertyId(),number,id==null?-1:id))throw new AppException("Số phòng đã tồn tại trong nhà trọ. Vui lòng chọn số phòng khác.",HttpStatus.CONFLICT);
        var oldType = room.getRoomType();
        boolean inventoryChanged = id == null || oldType == null || !oldType.getRoomTypeId().equals(type.getRoomTypeId()) || !java.util.Objects.equals(room.getStatus(),value.status());
        if (inventoryChanged) {
            invalidate(type);
            if (oldType != null && !oldType.getRoomTypeId().equals(type.getRoomTypeId())) invalidate(oldType);
        }
        room.setConfirmedAt(LocalDateTime.now());
        room.setRoomType(type);room.setRoomNumber(number);room.setFloor(floor);room.setStatus(value.status());room.setCustomPrice(value.customPrice());
        try{rooms.saveAndFlush(room);}catch(org.springframework.dao.DataIntegrityViolationException error){throw new AppException("Số phòng đã tồn tại. Vui lòng tải lại và chọn ký hiệu khác.",HttpStatus.CONFLICT);}return mapper.summary(room);
    }
    private void invalidate(org.hlrcs.entity.RoomType type) {
        type.setAvailabilityConfirmedAt(null);
        type.setAvailabilityConfirmedBy(null);
    }
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public void delete(Integer id) {
        users.findForRegistrationUpdate(auth.getCurrentUser().getUserId()).orElseThrow();var room=owned(id);
        if("OCCUPIED".equals(room.getStatus()))throw new AppException("Phòng đang có người thuê. Cần cập nhật trạng thái thực tế trước khi xóa.",HttpStatus.CONFLICT);
        invalidate(room.getRoomType());
        rooms.delete(room);rooms.flush();
    }
}
