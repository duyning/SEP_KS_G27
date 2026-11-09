package org.hlrcs.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.response.ApiResponse;
import org.hlrcs.dto.response.FavoriteResponse;
import org.hlrcs.service.FavoriteService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/favorites")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('USER', 'ROOM_HOST')")
public class FavoriteController {
    private final FavoriteService service;
    public record SaveRequest(@NotNull @Positive Integer roomTypeId) { }
    private <T> ResponseEntity<ApiResponse<T>> response(T data) {
        return ResponseEntity.ok().header("Cache-Control", "private, no-store").body(ApiResponse.success(data));
    }
    @GetMapping
    public ResponseEntity<ApiResponse<FavoriteResponse.Page>> list(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "6") int size) {
        return response(service.list(page, size));
    }
    @GetMapping("/state")
    public ResponseEntity<ApiResponse<FavoriteResponse.State>> state(@RequestParam(required = false) List<Integer> roomTypeIds) {
        return response(service.state(roomTypeIds == null ? List.of() : roomTypeIds));
    }
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<FavoriteResponse>> get(@PathVariable Integer id) { return response(service.get(id)); }
    @PostMapping
    public ResponseEntity<ApiResponse<FavoriteResponse>> save(@Valid @RequestBody SaveRequest request) { return response(service.save(request.roomTypeId())); }
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> remove(@PathVariable Integer id) { service.remove(id); return response(null); }
}
