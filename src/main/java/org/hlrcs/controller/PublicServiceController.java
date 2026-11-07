package org.hlrcs.controller;

import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.response.ApiResponse;
import org.hlrcs.exception.BadRequestException;
import org.hlrcs.service.ServicePublicationService;
import org.hlrcs.exception.ResourceNotFoundException;
import org.hlrcs.repository.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/services")
public class PublicServiceController {
    private final ServiceRepository services;
    private final ServiceCategoryRepository categories;
    private final ServicePublicationService publication;
    public record Listing(Integer serviceId, String serviceName, Integer categoryId, String categoryName,
            String description, String pricingType, BigDecimal price, String serviceArea,
            String contactPhone, String contactEmail, String providerName, Integer providerId,
            String pricingLabel, String activeState, boolean publicEligible, String imageUrl, List<String> imageUrls) {}
    public record Category(Integer categoryId, String name) {}
    private Integer positiveId(String value) {
        if (!value.matches("[1-9]\\d{0,9}") || Long.parseLong(value) > Integer.MAX_VALUE)
            throw new BadRequestException("Mã dịch vụ hoặc danh mục không hợp lệ.");
        return Integer.valueOf(value);
    }
    private String pricingLabel(org.hlrcs.entity.Service row) {
        if ("NEGOTIABLE".equals(row.getPricingType())) return "Thỏa thuận";
        if (row.getPrice() == null) return "Liên hệ báo giá";
        var format = java.text.NumberFormat.getNumberInstance(java.util.Locale.forLanguageTag("vi-VN"));
        format.setMaximumFractionDigits(2);
        return ("FROM".equals(row.getPricingType()) ? "Từ " : "") + format.format(row.getPrice()) + " VNĐ";
    }
    private Listing dto(org.hlrcs.entity.Service row) {
        return new Listing(row.getServiceId(), row.getServiceName(), row.getCategory().getCategoryId(), row.getCategory().getName(),
                row.getDescription(), row.getPricingType(), row.getPrice(), row.getServiceArea(), row.getContactInfo(), row.getContactEmail(), row.getProvider().getFullName(),
                row.getProvider().getUserId(), pricingLabel(row), row.getStatus(), true,
                row.getRegistration().getImageContent() == null ? null : "/api/services/" + row.getServiceId() + "/image?v=" + row.getRevision(),
                java.util.stream.IntStream.range(0, row.getRegistration().imageCount()).mapToObj(i -> "/api/services/" + row.getServiceId() + "/image?index=" + i + "&v=" + row.getRevision()).toList());
    }
    @GetMapping("/{id}/image") @Transactional(readOnly = true)
    public org.springframework.http.ResponseEntity<byte[]> image(@PathVariable String id, @RequestParam(defaultValue = "0") int index) {
        var row = services.findById(positiveId(id)).filter(publication::isPublic).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ảnh dịch vụ."));
        var source = row.getRegistration();
        if (source.getImageContent() == null) throw new ResourceNotFoundException("Không tìm thấy ảnh dịch vụ.");
        var selected = source.imageAt(index);
        return org.springframework.http.ResponseEntity.ok().contentType(org.springframework.http.MediaType.parseMediaType(selected.getContentType()))
                .header("X-Content-Type-Options", "nosniff").cacheControl(org.springframework.http.CacheControl.noStore()).body(selected.getContent());
    }
    @GetMapping @Transactional(readOnly = true)
    public ApiResponse<List<Listing>> list(@RequestParam(required = false) String categoryId) {
        var rows = categoryId == null ? services.findByStatusOrderByServiceIdDesc("ACTIVE")
                : services.findByStatusAndCategory_CategoryIdOrderByServiceIdDesc("ACTIVE", positiveId(categoryId));
        return ApiResponse.success(rows.stream().filter(publication::isPublic).map(this::dto).toList());
    }
    @GetMapping("/categories")
    public ApiResponse<List<Category>> categories() {
        return ApiResponse.success(categories.findAll(org.springframework.data.domain.Sort.by("categoryId")).stream().map(c -> new Category(c.getCategoryId(), c.getName())).toList());
    }
    @GetMapping("/{id}") @Transactional(readOnly = true)
    public ApiResponse<Listing> detail(@PathVariable String id) {
        return ApiResponse.success(services.findById(positiveId(id)).filter(publication::isPublic).map(this::dto).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dịch vụ công khai.")));
    }
}
