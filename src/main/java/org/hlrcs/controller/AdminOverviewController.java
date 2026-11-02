package org.hlrcs.controller;

import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.response.ApiResponse;
import org.hlrcs.service.AdminOverviewService;
import org.hlrcs.repository.PropertyRegistrationRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/admin") @RequiredArgsConstructor @PreAuthorize("hasRole('ADMIN')")
public class AdminOverviewController {
    private final AdminOverviewService service;
    @GetMapping("/dashboard") public ApiResponse<AdminOverviewService.Overview> dashboard(){return ApiResponse.success(service.overview());}
    @GetMapping("/accounts") public ApiResponse<AdminOverviewService.Page<AdminOverviewService.Account>> accounts(@RequestParam(defaultValue="") String q,@RequestParam(defaultValue="ALL") String role,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="8") int size){return ApiResponse.success(service.accounts(q,role,page,size));}
    @GetMapping("/assignments") public ApiResponse<AdminOverviewService.Page<PropertyRegistrationRepository.AssignmentOverview>> assignments(@RequestParam(defaultValue="") String q,@RequestParam(defaultValue="false") boolean unassigned,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="8") int size){return ApiResponse.success(service.assignments(q,unassigned,page,size));}
    @GetMapping("/activity") public ApiResponse<AdminOverviewService.Page<AdminOverviewService.Activity>> activity(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="8") int size){return ApiResponse.success(service.activities(page,size));}
}
