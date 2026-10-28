package org.hlrcs.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/** Public room information and explicitly published registration contacts; private account fields are excluded. */
public record AccommodationDetail(
        AccommodationSummary summary, List<Photo> gallery, Integer capacity, BigDecimal deposit,
        BigDecimal electricityPrice, BigDecimal waterPrice, BigDecimal internetPrice, BigDecimal servicePrice,
        String description, String propertyDescription, List<String> amenities, List<String> propertyAmenities,
        List<String> selectedRules, String rules, LocalDateTime publishedAt, String mapUrl, String nearby,
        ReviewSummary reviews, List<AccommodationSummary> similar, PublicContact publicContact,
        List<Photo> propertyGallery, List<AccommodationSummary> roomTypes) {
    public record PublicContact(String phone, String zaloPhone) { }
    public record Photo(String url, String caption) { }
    public record Review(Integer reviewId, String authorName, int rating, String content, LocalDateTime createdAt) { }
    public record ReviewSummary(Double averageRating, long totalReviews, List<Long> ratingCounts, List<Review> latest) { }
}
