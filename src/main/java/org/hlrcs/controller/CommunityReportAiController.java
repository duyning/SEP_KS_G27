package org.hlrcs.controller;

import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.response.ApiResponse;
import org.hlrcs.service.CommunityReportAssistant;
import org.springframework.web.bind.annotation.*;

@RestController @RequiredArgsConstructor
@RequestMapping("/api/admin/community/reports")
public class CommunityReportAiController {
    private final CommunityReportAssistant assistant;
    @GetMapping("/{id}/ai")
    public ApiResponse<CommunityReportAssistant.View> view(@PathVariable Integer id) { return ApiResponse.success(assistant.view(id)); }
    @PostMapping("/{id}/ai")
    public ApiResponse<CommunityReportAssistant.View> request(@PathVariable Integer id) { return ApiResponse.success(assistant.request(id)); }
}
