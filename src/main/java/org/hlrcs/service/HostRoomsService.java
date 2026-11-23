package org.hlrcs.service;
import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.request.RoomRequest;
import org.hlrcs.dto.request.RoomLayoutRequest;
import org.hlrcs.dto.request.RoomSetupRequest;
import org.hlrcs.dto.request.RoomTenancyRequest;
import org.hlrcs.dto.response.HostRoomsResponse;
import org.hlrcs.entity.Room;
import org.hlrcs.entity.enums.RegistrationStatus;
import org.hlrcs.exception.*;
import org.hlrcs.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;

@Service @RequiredArgsConstructor
public class HostRoomsService {
    private final AuthService auth;
    private final UserRepository users;
    private final RoomRepository rooms;
    private final PropertyRepository properties;
    private final RoomTypeRepository types;
    private final HostRoomTypeService typeService;
    private final RoomMapping mapper;
    private final RentalContractService rentalContracts;
    private final RoomTenancyService tenancies;

    public record SetupResult(Map<Integer, Integer> createdTypes, List<HostRoomsResponse.RoomSummary> rooms) { }
    public record TenancyResult(HostRoomsResponse.RoomSummary room, RoomTenancyService.Profile profile) { }

    @Transactional(readOnly = true)
    public RoomTenancyService.Profile tenancyProfile(Integer id) {
        return tenancies.profile(owned(id));
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public TenancyResult startTenancy(Integer id, RoomTenancyRequest request) {
        var room = ownedForTenancyUpdate(id);
        applyLease(room, "OCCUPIED", request.startDate(), request.endDate(), true);
        tenancies.start(room, request);
        if (!"OCCUPIED".equals(room.getStatus())) invalidate(room.getRoomType());
        room.setStatus("OCCUPIED");
        room.setConfirmedAt(LocalDateTime.now());
        return new TenancyResult(mapper.summary(room), tenancies.profile(room));
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public RoomTenancyService.Profile addOccupant(Integer id, String key, RoomTenancyRequest.Occupant request) {
        var room = ownedForTenancyUpdate(id);
        tenancies.addOccupant(room, key, request);
        return tenancies.profile(room);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public RoomTenancyService.Profile markOccupantLeft(Integer id, String key, Long occupantId, RoomTenancyRequest.Dated request) {
        var room = ownedForTenancyUpdate(id);
        tenancies.markLeft(room, key, occupantId, request.date());
        return tenancies.profile(room);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public TenancyResult closeTenancy(Integer id, String key, RoomTenancyRequest.Dated request) {
        var room = ownedForTenancyUpdate(id);
        tenancies.checkClose(room, key, request.date());
        finishLease(room, request.date());
        invalidate(room.getRoomType());
        applyLease(room, "VACANT", null, null, false);
        room.setStatus("VACANT");
        room.setConfirmedAt(LocalDateTime.now());
        return new TenancyResult(mapper.summary(room), tenancies.profile(room));
    }

    private Room ownedForTenancyUpdate(Integer id) {
        users.findForRegistrationUpdate(auth.getCurrentUser().getUserId()).orElseThrow();
        var room = owned(id);
        active(room.getProperty());
        return room;
    }

    private void finishLease(Room room, java.time.LocalDate date) {
        tenancies.close(room, date);
        rentalContracts.close(room);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED, rollbackFor = Exception.class)
    public SetupResult createSetup(RoomSetupRequest request, List<MultipartFile> photos) {
        int photoCount = request.types().stream().mapToInt(RoomSetupRequest.NewType::photoCount).sum();
        if (photoCount != photos.size() || photoCount > 40 ||
                photos.stream().mapToLong(MultipartFile::getSize).sum() > 80L * 1024 * 1024) {
            throw new BadRequestException("Kiểm tra số ảnh đã chọn. Mỗi đợt tối đa 40 ảnh và tổng 80 MB.");
        }
        var localIds = new HashSet<Integer>();
        for (var draft : request.types()) {
            if (!localIds.add(draft.localId()) || !request.propertyId().equals(draft.details().propertyId())) {
                throw new BadRequestException("Loại phòng bị lặp hoặc không khớp nhà trọ đang thiết lập.");
            }
        }
        for (var draft : request.rooms()) {
            if (draft.roomTypeId() == 0 || (draft.roomTypeId() < 0 && !localIds.contains(draft.roomTypeId()))) {
                throw new BadRequestException("Chưa gán loại phòng hợp lệ cho phòng " + draft.roomNumber() + ".");
            }
        }

        var createdTypes = new HashMap<Integer, Integer>();
        int photoOffset = 0;
        for (var draft : request.types()) {
            int nextOffset = photoOffset + draft.photoCount();
            try {
                var created = typeService.save(draft.details(), null, photos.subList(photoOffset, nextOffset));
                createdTypes.put(draft.localId(), created.roomTypeId());
            } catch (AppException error) {
                throw new AppException(draft.details().roomType().trim() + " · " + error.getMessage(), error.getStatus());
            }
            photoOffset = nextOffset;
        }
        if (request.rooms().isEmpty()) return new SetupResult(createdTypes, List.of());

        var roomDrafts = request.rooms().stream().map(draft -> new RoomLayoutRequest.Draft(
                createdTypes.getOrDefault(draft.roomTypeId(), draft.roomTypeId()), draft.roomNumber(), draft.floor())).toList();
        return new SetupResult(createdTypes, layout(new RoomLayoutRequest(request.propertyId(), roomDrafts)));
    }

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
        // Existing duplicates can still be edited without changing their room numbers.
        if (id == null || !number.equalsIgnoreCase(room.getRoomNumber())) {
            RoomRules.reserveNumber(RoomRules.numberKeys(rooms.findRoomNumbers(property.getPropertyId(), id == null ? -1 : id)), number);
        }
        var oldType = room.getRoomType();
        boolean inventoryChanged = id == null || oldType == null || !oldType.getRoomTypeId().equals(type.getRoomTypeId()) || !java.util.Objects.equals(room.getStatus(),value.status());
        if (inventoryChanged) {
            invalidate(type);
            if (oldType != null && !oldType.getRoomTypeId().equals(type.getRoomTypeId())) invalidate(oldType);
        }
        if(id!=null){
            rentalContracts.validateDates(room,value.status(),value.leaseStartDate(),value.leaseEndDate());
            if("VACANT".equals(value.status()))finishLease(room, RoomTenancyService.today());
        }
        room.setConfirmedAt(LocalDateTime.now());
        applyLease(room,value.status(),value.leaseStartDate(),value.leaseEndDate(),false);
        if (id != null && "OCCUPIED".equals(value.status()) && room.getLeaseStartDate() != null && room.getLeaseEndDate() != null) {
            tenancies.syncDates(room);
        }
        room.setRoomType(type);room.setRoomNumber(number);room.setFloor(floor);room.setStatus(value.status());room.setCustomPrice(value.customPrice());
        try{rooms.saveAndFlush(room);}catch(org.springframework.dao.DataIntegrityViolationException error){throw new AppException("Số phòng đã tồn tại. Vui lòng tải lại và chọn ký hiệu khác.",HttpStatus.CONFLICT);}return mapper.summary(room);
    }
    private void invalidate(org.hlrcs.entity.RoomType type) {
        type.setAvailabilityConfirmedAt(null);
        type.setAvailabilityConfirmedBy(null);
    }
    private void active(org.hlrcs.entity.Property property){
        if(!"ACTIVE".equalsIgnoreCase(property.getStatus())||(property.getRegistration()!=null&&property.getRegistration().getStatus()!=RegistrationStatus.APPROVED))
            throw new AppException("Nhà trọ chưa được phê duyệt hoặc chưa hoạt động.",HttpStatus.CONFLICT);
    }
    static void applyLease(Room room,String status,java.time.LocalDate start,java.time.LocalDate end,boolean requireDates){
        if("VACANT".equals(status)){room.setLeaseStartDate(null);room.setLeaseEndDate(null);return;}
        if(!"OCCUPIED".equals(status))throw new BadRequestException("Trạng thái phòng không hợp lệ.");
        // Legacy occupied rooms may still be edited/reconfirmed without inventing dates.
        if(!requireDates&&"OCCUPIED".equals(room.getStatus())&&start==null&&end==null)return;
        if(start==null||end==null)throw new BadRequestException("Vui lòng nhập ngày bắt đầu và ngày kết thúc thuê.");
        if(start.getYear()<1||start.getYear()>9999||end.getYear()<1||end.getYear()>9999)throw new BadRequestException("Ngày thuê không hợp lệ.");
        if(end.isBefore(start))throw new BadRequestException("Ngày kết thúc phải bằng hoặc sau ngày bắt đầu thuê.");
        room.setLeaseStartDate(start);room.setLeaseEndDate(end);
    }
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public java.util.List<HostRoomsResponse.RoomSummary> updateStatuses(org.hlrcs.dto.request.RoomStatusRequest value){
        var owner=users.findForRegistrationUpdate(auth.getCurrentUser().getUserId()).orElseThrow();
        var ids=new java.util.LinkedHashSet<>(value.roomIds());
        if(ids.isEmpty()||ids.size()>200||ids.size()!=value.roomIds().size())throw new BadRequestException("Chọn từ 1 đến 200 phòng khác nhau.");
        var selected=rooms.findForStatusUpdate(ids,owner.getUserId(),value.propertyId());
        if(selected.size()!=ids.size()||selected.stream().anyMatch(room->!room.getProperty().getOwner().getUserId().equals(owner.getUserId())||!room.getProperty().getPropertyId().equals(value.propertyId())))
            throw new ResourceNotFoundException("Có phòng không tồn tại hoặc không thuộc nhà trọ của bạn. Chưa cập nhật phòng nào.");
        // Validate all targets before mutating the managed entities.
        for(var room:selected)active(room.getProperty());
        applyLease(new Room(),value.status(),value.leaseStartDate(),value.leaseEndDate(),true);
        var drafts=new java.util.HashMap<Integer,org.hlrcs.dto.request.RentalContractRequest>();
        if(value.contracts()!=null&&!value.contracts().isEmpty()){
            if(!"OCCUPIED".equals(value.status())||value.contracts().size()!=ids.size())throw new BadRequestException("Cần một hợp đồng riêng cho mỗi phòng chuyển sang Đang thuê.");
            for(var draft:value.contracts())if(!ids.contains(draft.roomId())||drafts.put(draft.roomId(),draft)!=null)throw new BadRequestException("Danh sách hợp đồng có phòng không khớp hoặc bị trùng.");
        }
        for(var room:selected)rentalContracts.validateDates(room,value.status(),value.leaseStartDate(),value.leaseEndDate());
        var confirmed=LocalDateTime.now();
        for(var room:selected){
            if(!java.util.Objects.equals(room.getStatus(),value.status()))invalidate(room.getRoomType());
            if ("VACANT".equals(value.status())) finishLease(room, RoomTenancyService.today());
            applyLease(room,value.status(),value.leaseStartDate(),value.leaseEndDate(),true);
            room.setStatus(value.status());room.setConfirmedAt(confirmed);
            if ("OCCUPIED".equals(value.status())) {
                tenancies.syncDates(room);
                if(drafts.containsKey(room.getRoomId()))rentalContracts.record(room,drafts.get(room.getRoomId()));
            }
        }
        rooms.saveAllAndFlush(selected);
        return selected.stream().map(mapper::summary).toList();
    }
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public java.util.List<HostRoomsResponse.RoomSummary> layout(org.hlrcs.dto.request.RoomLayoutRequest request) {
        var owner=users.findForRegistrationUpdate(auth.getCurrentUser().getUserId()).orElseThrow();
        var property=properties.findById(request.propertyId()).filter(p->p.getOwner().getUserId().equals(owner.getUserId()))
                .orElseThrow(()->new ResourceNotFoundException("Không tìm thấy nhà trọ của bạn."));
        active(property);
        var available=types.findByProperty_PropertyId(property.getPropertyId()).stream().collect(java.util.stream.Collectors.toMap(org.hlrcs.entity.RoomType::getRoomTypeId,t->t));
        var existing = RoomRules.numberKeys(rooms.findRoomNumbers(property.getPropertyId(), -1));
        var created=new java.util.ArrayList<Room>();
        for(var row:request.rooms()) {
            var type=available.get(row.roomTypeId());
            if(type==null)throw new ResourceNotFoundException("Loại phòng không thuộc nhà trọ này. Chưa tạo phòng nào.");
            if(type.getPrice()==null||type.getPrice().signum()<=0)throw new BadRequestException("Loại phòng phải có giá hợp lệ trước khi tạo phòng.");
            var number=RoomRules.number(row.roomNumber());var floor=RoomRules.floor(row.floor());
            RoomRules.reserveNumber(existing, number);
            created.add(Room.builder().property(property).roomType(type).roomNumber(number).floor(floor).status("VACANT").publicVisible(false).build());
        }
        created.stream().map(Room::getRoomType).distinct().forEach(this::invalidate);
        try{rooms.saveAllAndFlush(created);}catch(org.springframework.dao.DataIntegrityViolationException e){throw new AppException("Có số phòng đã tồn tại. Tải lại dữ liệu và kiểm tra danh sách.",HttpStatus.CONFLICT);}
        return created.stream().map(mapper::summary).toList();
    }
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public java.util.List<HostRoomsResponse.RoomSummary> publish(org.hlrcs.dto.request.RoomPublicationRequest request) {
        var owner=users.findForRegistrationUpdate(auth.getCurrentUser().getUserId()).orElseThrow();
        var property=properties.findById(request.propertyId()).filter(p->p.getOwner().getUserId().equals(owner.getUserId()))
                .orElseThrow(()->new ResourceNotFoundException("Không tìm thấy nhà trọ của bạn."));
        active(property);
        var ids=new java.util.HashSet<>(request.roomIds());
        if(ids.size()!=request.roomIds().size())throw new BadRequestException("Danh sách phòng bị trùng.");
        var inventory=rooms.findByProperty_Owner_UserIdOrderByRoomNumberAsc(owner.getUserId()).stream()
                .filter(r->r.getProperty().getPropertyId().equals(property.getPropertyId())).toList();
        if(!inventory.stream().map(Room::getRoomId).collect(java.util.stream.Collectors.toSet()).containsAll(ids))
            throw new ResourceNotFoundException("Có phòng không thuộc nhà trọ của bạn. Chưa cập nhật phòng nào.");
        for(var room:inventory) {
            boolean visible=ids.contains(room.getRoomId());
            if(room.isPublicVisible()!=visible)invalidate(room.getRoomType());
            room.setPublicVisible(visible);
        }
        rooms.saveAllAndFlush(inventory);
        return inventory.stream().map(mapper::summary).toList();
    }
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public void delete(Integer id) {
        users.findForRegistrationUpdate(auth.getCurrentUser().getUserId()).orElseThrow();var room=owned(id);
        if("OCCUPIED".equals(room.getStatus()))throw new AppException("Phòng đang có người thuê. Cần cập nhật trạng thái thực tế trước khi xóa.",HttpStatus.CONFLICT);
        invalidate(room.getRoomType());
        rooms.delete(room);rooms.flush();
    }
}
