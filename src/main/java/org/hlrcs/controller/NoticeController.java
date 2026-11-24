package org.hlrcs.controller;
import lombok.RequiredArgsConstructor;
import org.hlrcs.service.NoticeService;
import org.hlrcs.dto.response.ApiResponse;
import org.springframework.web.bind.annotation.*;
@RestController @RequiredArgsConstructor @RequestMapping("/api/notifications")
public class NoticeController {
 private final NoticeService service;
 private final org.hlrcs.repository.UserRepository users;
 public record AdminInput(@jakarta.validation.constraints.NotNull Integer recipientId,@jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max=255)String title,@jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max=3500)String content,@jakarta.validation.constraints.Size(max=200)String effectivePeriod){}
 @PostMapping("/admin") @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
 public ApiResponse<Void> admin(@jakarta.validation.Valid @RequestBody AdminInput input){var recipient=users.findById(input.recipientId()).orElseThrow(()->new org.hlrcs.exception.ResourceNotFoundException("Không tìm thấy tài khoản."));service.send(recipient,"ADMIN","ANNOUNCEMENT",input.title(),input.content(),input.effectivePeriod(),null,null,null,null);return ApiResponse.success(null);}
 @GetMapping("/{id}/viewing") public ApiResponse<org.hlrcs.dto.response.ViewingResponses.Viewing> viewing(@PathVariable String id){return ApiResponse.success(service.viewing(id));}
 @GetMapping public ApiResponse<NoticeService.Feed> feed(@RequestParam(defaultValue="ALL")String category,@RequestParam(defaultValue="")String kind,@RequestParam(defaultValue="")String q,@RequestParam(defaultValue="")String before){return ApiResponse.success(service.feed(category,kind,q,before));}
 @PutMapping("/{id}/read") public ApiResponse<NoticeService.Item> read(@PathVariable String id){return ApiResponse.success(service.read(id));}
 @PutMapping("/read-all") public ApiResponse<Void> all(){service.readAll();return ApiResponse.success(null);}
}
