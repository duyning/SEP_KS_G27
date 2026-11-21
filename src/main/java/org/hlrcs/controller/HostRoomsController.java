package org.hlrcs.controller;
import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.request.RoomRequest;
import org.hlrcs.dto.request.RoomSetupRequest;
import org.hlrcs.dto.response.*;
import org.hlrcs.exception.BadRequestException;
import org.hlrcs.service.HostRoomsService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;

@RestController @RequestMapping("/api/host/rooms") @RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ROOM_HOST','ADMIN')")
public class HostRoomsController {
    private final HostRoomsService service;
    private Integer id(String value) {if(value==null)return null;try{int id=Integer.parseInt(value);if(id<1)throw new NumberFormatException();return id;}catch(NumberFormatException error){throw new BadRequestException("Mã nhà trọ hoặc loại phòng không hợp lệ.");}}
    @GetMapping public ApiResponse<HostRoomsResponse> list(@RequestParam(required=false) String propertyId,@RequestParam(required=false) String roomTypeId){return ApiResponse.success(service.list(id(propertyId),id(roomTypeId)));}
    @PostMapping public ApiResponse<HostRoomsResponse.RoomSummary> create(@Valid @RequestBody RoomRequest request){return ApiResponse.success(service.save(null,request));}
    @PutMapping("/{id}") public ApiResponse<HostRoomsResponse.RoomSummary> update(@PathVariable Integer id,@Valid @RequestBody RoomRequest request){return ApiResponse.success(service.save(id,request));}
    @PatchMapping("/status") public ApiResponse<java.util.List<HostRoomsResponse.RoomSummary>> updateStatuses(@Valid @RequestBody org.hlrcs.dto.request.RoomStatusRequest request){return ApiResponse.success(service.updateStatuses(request));}
    @PostMapping("/layout") public ApiResponse<java.util.List<HostRoomsResponse.RoomSummary>> layout(@Valid @RequestBody org.hlrcs.dto.request.RoomLayoutRequest request){return ApiResponse.success(service.layout(request));}
    @PostMapping(value = "/setup", consumes = "multipart/form-data")
    public ApiResponse<HostRoomsService.SetupResult> setup(@Valid @RequestPart("setup") RoomSetupRequest setup,
            @RequestPart(value = "photos", required = false) List<MultipartFile> photos) {
        return ApiResponse.success(service.createSetup(setup, photos == null ? List.of() : photos));
    }
    @PutMapping("/publication") public ApiResponse<java.util.List<HostRoomsResponse.RoomSummary>> publish(@Valid @RequestBody org.hlrcs.dto.request.RoomPublicationRequest request){return ApiResponse.success(service.publish(request));}
    @DeleteMapping("/{id}") public ApiResponse<Void> delete(@PathVariable Integer id){service.delete(id);return ApiResponse.success(null);}
}
