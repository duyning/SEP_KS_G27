package org.hlrcs.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.request.ServiceRegistrationRequest;
import org.hlrcs.dto.request.ServiceResubmissionRequest;
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

    @GetMapping("/mine")
    public ApiResponse<List<ServiceRegistrationService.RegistrationInfo>> mine() { return ApiResponse.success(service.mine()); }

    @GetMapping("/services")
    public ApiResponse<List<ServiceRegistrationService.RegistrationInfo>> myServices() { return ApiResponse.success(service.myServices()); }

    @PostMapping(value = "/services/{id}/changes", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<ServiceRegistrationService.RegistrationInfo> change(@PathVariable Integer id,
            @Valid @RequestPart("details") org.hlrcs.dto.request.ServiceChangeRequest details,
            @RequestPart(value = "image", required = false) List<MultipartFile> image) throws IOException {
        return ApiResponse.success(service.change(id, details, image));
    }

    @GetMapping("/{id}/image")
    public ResponseEntity<byte[]> image(@PathVariable Integer id, @RequestParam(defaultValue = "0") int index) {
        var image = service.image(id, index);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(image.contentType())).header("X-Content-Type-Options", "nosniff")
                .cacheControl(CacheControl.noStore()).body(image.bytes());
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ServiceRegistrationService.RegistrationInfo>> submit(
            @Valid @RequestPart("details") ServiceRegistrationRequest details,
            @RequestPart("documents") List<MultipartFile> documents,
            @RequestPart(value = "image", required = false) List<MultipartFile> image) throws IOException {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(service.submit(details, documents, image)));
    }

    @GetMapping("/documents/{id}")
    public ResponseEntity<byte[]> document(@PathVariable Integer id) {
        var file = service.document(id);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(file.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(file.getDocumentName(), StandardCharsets.UTF_8).build().toString())
                .header("X-Content-Type-Options", "nosniff").cacheControl(CacheControl.noStore()).body(file.getFileContent());
    }
    @PostMapping(value = "/{id}/resubmit", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<ServiceRegistrationService.RegistrationInfo> resubmit(@PathVariable Integer id,
            @Valid @RequestPart("details") ServiceResubmissionRequest details,
            @RequestPart(value = "documents", required = false) List<MultipartFile> documents,
            @RequestPart(value = "image", required = false) List<MultipartFile> image) throws IOException {
        return ApiResponse.success(service.resubmit(id, details, documents, image));
    }
}
