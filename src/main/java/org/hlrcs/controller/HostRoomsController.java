package org.hlrcs.controller;
import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.request.RoomRequest;
import org.hlrcs.dto.response.*;
import org.hlrcs.exception.BadRequestException;
import org.hlrcs.service.HostRoomsService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

@RestController @RequestMapping("/api/host/rooms") @RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ROOM_HOST','ADMIN')")
public class HostRoomsController {
    private final HostRoomsService service;
    private Integer id(String value) {if(value==null)return null;try{int id=Integer.parseInt(value);if(id<1)throw new NumberFormatException();return id;}catch(NumberFormatException error){throw new BadRequestException("Mã nhà trọ hoặc loại phòng không hợp lệ.");}}
    @GetMapping public ApiResponse<HostRoomsResponse> list(@RequestParam(required=false) String propertyId,@RequestParam(required=false) String roomTypeId){return ApiResponse.success(service.list(id(propertyId),id(roomTypeId)));}
    @PostMapping public ApiResponse<HostRoomsResponse.RoomSummary> create(@Valid @RequestBody RoomRequest request){return ApiResponse.success(service.save(null,request));}
    @PutMapping("/{id}") public ApiResponse<HostRoomsResponse.RoomSummary> update(@PathVariable Integer id,@Valid @RequestBody RoomRequest request){return ApiResponse.success(service.save(id,request));}
    @DeleteMapping("/{id}") public ApiResponse<Void> delete(@PathVariable Integer id){service.delete(id);return ApiResponse.success(null);}
}
