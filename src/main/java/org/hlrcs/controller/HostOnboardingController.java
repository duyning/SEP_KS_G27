package org.hlrcs.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.request.*;
import org.hlrcs.dto.response.*;
import org.hlrcs.service.*;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.List;

@RestController @RequiredArgsConstructor
@RequestMapping("/api/host-onboarding")
@PreAuthorize("hasAnyRole('USER','ROOM_HOST')")
public class HostOnboardingController {
    private final HostOnboardingService onboarding;
    private final PropertyEditService edits;
    private final HostPropertyService properties;
    private final PropertyLocationService locations;
    @GetMapping("/current") public ApiResponse<HostOnboardingService.Current> current(){return ApiResponse.success(onboarding.current());}
    @PostMapping(consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<PropertyRegistrationResponse> submit(@Valid @RequestPart HostApplicationService.Submission account,
            @Valid @RequestPart PropertyRegistrationRequest details,@RequestPart List<MultipartFile> photos,
            @RequestPart MultipartFile ownership,@RequestPart MultipartFile fireSafety) throws IOException {
        return ApiResponse.success(onboarding.submit(account,details,photos,ownership,fireSafety));
    }
    @PostMapping("/location/resolve")
    public ApiResponse<PropertyLocationService.Location> location(@Valid @RequestBody PropertyRegistrationController.LocationInput input){return ApiResponse.success(locations.lookup(input.input()));}
    @PostMapping("/location/resolve-mobile")
    public ApiResponse<PropertyLocationService.MobileLookup> resolveMobileLocation(
            @Valid @RequestBody PropertyRegistrationController.LocationInput input) {
        return ApiResponse.success(locations.lookupMobile(input.input()));
    }
    @GetMapping("/{id}/edit") public ApiResponse<PropertyEditService.Edit> edit(@PathVariable Integer id){onboarding.requireOwned(id);return ApiResponse.success(edits.edit(id));}
    @PostMapping(value="/{id}/resubmit",consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<PropertyRegistrationResponse> resubmit(@PathVariable Integer id,@Valid @RequestPart PropertyResubmissionRequest edit,
            @RequestPart(required=false) List<MultipartFile> photos,@RequestPart(required=false) MultipartFile ownership,
            @RequestPart(required=false) MultipartFile idCard,@RequestPart(required=false) MultipartFile idCardBack,
            @RequestPart(required=false) MultipartFile fireSafety) throws IOException {
        onboarding.requireOwned(id);return ApiResponse.success(edits.submit(id,edit,photos,ownership,idCard,fireSafety,idCardBack));
    }
    @GetMapping("/photos/{id}") public ResponseEntity<byte[]> photo(@PathVariable Integer id){
        onboarding.requirePhoto(id);var photo=properties.getPhoto(id);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).header("X-Content-Type-Options","nosniff").contentType(MediaType.parseMediaType(photo.contentType())).body(photo.content());
    }
}
