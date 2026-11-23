package org.hlrcs.controller;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.hlrcs.service.HostApplicationService;
import org.hlrcs.dto.response.ApiResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
@RestController @RequiredArgsConstructor @RequestMapping("/api/host-applications")
@PreAuthorize("isAuthenticated()")
public class HostApplicationController {
 private final HostApplicationService service;
 @GetMapping("/current") public ApiResponse<HostApplicationService.View> current(){return ApiResponse.success(service.current());}
 @GetMapping("/{id}/identity-image") public org.springframework.http.ResponseEntity<byte[]> identity(@PathVariable Integer id,@RequestParam(defaultValue="front") String side){
  var image=service.identity(id,side);
  return org.springframework.http.ResponseEntity.ok().cacheControl(org.springframework.http.CacheControl.noStore())
   .header("X-Content-Type-Options","nosniff").header("Content-Disposition","inline; filename=identity-front")
   .contentType(org.springframework.http.MediaType.parseMediaType(image.contentType())).body(image.content());
 }
 @PostMapping @PreAuthorize("hasRole('USER')") public ApiResponse<HostApplicationService.View> submit(@Valid @RequestBody HostApplicationService.Submission request){return ApiResponse.success("Đã gửi hồ sơ. Vui lòng chờ xét duyệt.",service.submit(request));}
 @GetMapping @PreAuthorize("hasAnyRole('STAFF','ADMIN')") public ApiResponse<HostApplicationService.Queue> queue(@RequestParam(required=false) String status,@RequestParam(required=false) String search,@RequestParam(defaultValue="NEWEST") String sort,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="8") int size){return ApiResponse.success(service.queue(status,search,sort,page,size));}
 @GetMapping("/{id}") @PreAuthorize("hasAnyRole('STAFF','ADMIN')") public ApiResponse<HostApplicationService.Detail> detail(@PathVariable Integer id){return ApiResponse.success(service.detail(id));}
 @PostMapping("/{id}/review") @PreAuthorize("hasAnyRole('STAFF','ADMIN')") public ApiResponse<HostApplicationService.View> review(@PathVariable Integer id,@Valid @RequestBody HostApplicationService.Decision request){return ApiResponse.success(service.review(id,request));}
}
