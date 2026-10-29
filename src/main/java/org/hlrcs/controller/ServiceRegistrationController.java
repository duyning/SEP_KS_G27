package org.hlrcs.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.request.ServiceRegistrationRequest;
import org.hlrcs.dto.response.ApiResponse;
import org.hlrcs.repository.ServiceCategoryRepository;
import org.hlrcs.service.ServiceRegistrationService;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/service-registrations")
public class ServiceRegistrationController {
    private final ServiceRegistrationService service;
    private final ServiceCategoryRepository categories;
    public record Category(Integer categoryId, String name) {}

    @GetMapping("/categories")
    public ApiResponse<List<Category>> categories() {
        return ApiResponse.success(categories.findAll(org.springframework.data.domain.Sort.by("categoryId")).stream()
                .map(c -> new Category(c.getCategoryId(), c.getName())).toList());
    }

    @GetMapping("/current")
    public ApiResponse<ServiceRegistrationService.State> current() { return ApiResponse.success(service.current()); }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ServiceRegistrationService.RegistrationInfo>> submit(
            @Valid @RequestPart("details") ServiceRegistrationRequest details,
            @RequestPart("documents") List<MultipartFile> documents) throws IOException {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(service.submit(details, documents)));
    }

    @GetMapping("/documents/{id}")
    public ResponseEntity<byte[]> document(@PathVariable Integer id) {
        var file = service.document(id);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(file.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(file.getDocumentName(), StandardCharsets.UTF_8).build().toString())
                .header("X-Content-Type-Options", "nosniff").cacheControl(CacheControl.noStore()).body(file.getFileContent());
    }
}
