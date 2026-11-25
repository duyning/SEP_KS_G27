package org.hlrcs.controller;

import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.response.ApiResponse;
import org.hlrcs.service.MessagingService;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/messaging") @RequiredArgsConstructor
public class MessagingController {
    private final MessagingService messaging;
    public record Open(Integer recipientId,MessagingService.Context context) {}
    public record Send(String clientMessageId,String content,MessagingService.Context context,Long replyToId) {}
    public record Read(long through) {}
    @GetMapping("/conversations")
    public ApiResponse<MessagingService.Inbox> inbox(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="") String q){return ApiResponse.success(messaging.inbox(page,q));}
    @PostMapping("/conversations")
    public ApiResponse<MessagingService.Opened> open(@RequestBody Open body){return ApiResponse.success(messaging.open(body.recipientId(),body.context()));}
    @GetMapping("/conversations/{id}/messages")
    public ApiResponse<MessagingService.History> history(@PathVariable Long id,@RequestParam(defaultValue="9223372036854775807") long before){return ApiResponse.success(messaging.history(id,before));}
    @PostMapping(value="/conversations/{id}/messages",consumes="application/json")
    public ApiResponse<MessagingService.Message> send(@PathVariable Long id,@RequestBody Send body){return ApiResponse.success(messaging.send(id,body.clientMessageId(),body.content(),body.context(),body.replyToId(),java.util.List.of()));}
    @PostMapping(value="/conversations/{id}/messages",consumes="multipart/form-data")
    public ApiResponse<MessagingService.Message> upload(@PathVariable Long id,@RequestPart Send details,
            @RequestPart java.util.List<org.springframework.web.multipart.MultipartFile> files){
        return ApiResponse.success(messaging.send(id,details.clientMessageId(),details.content(),details.context(),details.replyToId(),files));
    }
    @GetMapping("/conversations/{id}/attachments/{attachmentId}")
    public org.springframework.http.ResponseEntity<org.springframework.core.io.Resource> attachment(@PathVariable Long id,@PathVariable Long attachmentId){
        var file=messaging.attachment(id,attachmentId);
        return org.springframework.http.ResponseEntity.ok().contentType(org.springframework.http.MediaType.parseMediaType(file.contentType()))
            .header("Cache-Control","private, no-store").header("X-Content-Type-Options","nosniff")
            .header("Content-Disposition",org.springframework.http.ContentDisposition.inline().filename(file.fileName(),java.nio.charset.StandardCharsets.UTF_8).build().toString())
            .body(new org.springframework.core.io.ByteArrayResource(file.bytes()));
    }
    @PutMapping("/conversations/{id}/read")
    public ApiResponse<MessagingService.Conversation> read(@PathVariable Long id,@RequestBody Read body){return ApiResponse.success(messaging.markRead(id,body.through()));}
}
