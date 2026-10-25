package org.hlrcs.controller;

import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.response.ApiResponse;
import org.hlrcs.service.PublicPropertyService;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/public/properties")
@RequiredArgsConstructor
public class PublicPropertyController {
    private final PublicPropertyService service;
    @GetMapping
    public ApiResponse<List<PublicPropertyService.Listing>> list(){return ApiResponse.success(service.list());}
    @GetMapping("/photos/{id}")
    public ResponseEntity<byte[]> photo(@PathVariable Integer id){return response(service.photo(id));}
    @GetMapping("/room-images/{id}")
    public ResponseEntity<byte[]> roomImage(@PathVariable Integer id){return response(service.roomImage(id));}
    private ResponseEntity<byte[]> response(PublicPropertyService.Image image){
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(image.contentType()))
            .header("X-Content-Type-Options","nosniff").header(HttpHeaders.CACHE_CONTROL,"no-store").body(image.bytes());
    }
}
