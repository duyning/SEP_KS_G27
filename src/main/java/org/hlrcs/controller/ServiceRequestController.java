package org.hlrcs.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.request.ServiceRequestInput;
import org.hlrcs.dto.response.ApiResponse;
import org.hlrcs.service.ServiceRequestService;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequiredArgsConstructor
@RequestMapping("/api/service-requests")
public class ServiceRequestController {
    private final ServiceRequestService service;
    public record Response(@NotNull @Pattern(regexp = "ACCEPTED|REJECTED") String decision,
                           @Size(max = 2000) String reason, @NotNull @Min(0) Integer revision) {}
    @GetMapping("/mine") public ApiResponse<List<ServiceRequestService.Result>> mine() { return ApiResponse.success(service.mine()); }
    @GetMapping("/incoming") public ApiResponse<List<ServiceRequestService.Result>> incoming() { return ApiResponse.success(service.incoming()); }
    @GetMapping("/{id}") public ApiResponse<ServiceRequestService.Result> detail(@PathVariable Integer id) { return ApiResponse.success(service.detail(id)); }
    @PostMapping public ResponseEntity<ApiResponse<ServiceRequestService.Result>> submit(@Valid @RequestBody ServiceRequestInput input) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(service.submit(input)));
    }
    @PostMapping("/{id}/response") public ApiResponse<ServiceRequestService.Result> respond(@PathVariable Integer id, @Valid @RequestBody Response input) {
        return ApiResponse.success(service.respond(id, input.decision(), input.reason(), input.revision()));
    }
}
