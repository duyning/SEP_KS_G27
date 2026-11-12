package org.hlrcs.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.request.CommunityReportDecision;
import org.hlrcs.dto.request.CommunityReportRequest;
import org.hlrcs.dto.response.ApiResponse;
import org.hlrcs.service.CommunityReportService;
import org.hlrcs.service.CommunityReportService.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class CommunityReportController {
    private final CommunityReportService reports;

    @PostMapping(value = "/api/community/posts/{postId}/reports", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Receipt> submit(@PathVariable Integer postId, @Valid @RequestPart("report") CommunityReportRequest request,
                                       @RequestPart(value = "evidence", required = false) List<MultipartFile> evidence) {
        return ApiResponse.success("Đã gửi báo cáo thành công.", reports.submit(postId, request, evidence == null ? List.of() : evidence));
    }

    @GetMapping("/api/community/reports/mine")
    public ApiResponse<Page<Receipt>> mine(@RequestParam(defaultValue = "0") int page) {
        return ApiResponse.success(reports.mine(page));
    }

    @GetMapping("/api/admin/community/reports")
    public ApiResponse<Page<Summary>> queue(@RequestParam(defaultValue = "OPEN") String status,
                                           @RequestParam(defaultValue = "0") int page) {
        return ApiResponse.success(reports.queue(status, page));
    }

    @GetMapping("/api/admin/community/reports/{id}")
    public ApiResponse<Detail> detail(@PathVariable Integer id) {
        return ApiResponse.success(reports.detail(id));
    }

    @PostMapping("/api/admin/community/reports/{id}/decision")
    public ApiResponse<Detail> resolve(@PathVariable Integer id, @Valid @RequestBody CommunityReportDecision decision) {
        return ApiResponse.success(reports.resolve(id, decision));
    }

    @GetMapping("/api/admin/community/reports/{id}/evidence")
    public ResponseEntity<byte[]> evidence(@PathVariable Integer id) {
        var image = reports.evidence(id);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(image.getContentType()))
                .cacheControl(CacheControl.noStore()).header("X-Content-Type-Options", "nosniff").body(image.getFileContent());
    }
}
