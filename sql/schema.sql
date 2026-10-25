-- HL-RCS Database Schema (MySQL)
-- Generated from ERD

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `reports`;
DROP TABLE IF EXISTS `feedbacks`;
DROP TABLE IF EXISTS `comments`;
DROP TABLE IF EXISTS `bookings`;
DROP TABLE IF EXISTS `wishlists`;
DROP TABLE IF EXISTS `moderation_logs`;
DROP TABLE IF EXISTS `support_logs`;
DROP TABLE IF EXISTS `support_requests`;
DROP TABLE IF EXISTS `pass_item_post_details`;
DROP TABLE IF EXISTS `pass_room_post_details`;
DROP TABLE IF EXISTS `roommate_post_details`;
DROP TABLE IF EXISTS `post_media`;
DROP TABLE IF EXISTS `posts`;
DROP TABLE IF EXISTS `services`;
DROP TABLE IF EXISTS `service_documents`;
DROP TABLE IF EXISTS `service_registrations`;
DROP TABLE IF EXISTS `service_categories`;
DROP TABLE IF EXISTS `room_type_amenities`;
DROP TABLE IF EXISTS `amenities`;
DROP TABLE IF EXISTS `room_type_videos`;
DROP TABLE IF EXISTS `room_type_images`;
DROP TABLE IF EXISTS `room_types`;
DROP TABLE IF EXISTS `properties`;
DROP TABLE IF EXISTS `property_submission_events`;
DROP TABLE IF EXISTS `property_documents`;
DROP TABLE IF EXISTS `property_registrations`;
DROP TABLE IF EXISTS `user_capabilities`;
DROP TABLE IF EXISTS `capabilities`;
DROP TABLE IF EXISTS `users`;

SET FOREIGN_KEY_CHECKS = 1;

-- 1. USERS
CREATE TABLE `users` (
    `user_id` INT AUTO_INCREMENT PRIMARY KEY,
    `full_name` VARCHAR(255) NULL,
    `email` VARCHAR(255) NOT NULL UNIQUE,
    `phone_number` VARCHAR(50) NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` VARCHAR(50) NOT NULL COMMENT 'USER, ROOM_HOST, STAFF, ADMIN',
    `status` VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' COMMENT 'ACTIVE, INACTIVE',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. CAPABILITIES
CREATE TABLE `capabilities` (
    `capability_id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `code` VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. USER_CAPABILITY
CREATE TABLE `user_capabilities` (
    `user_capability_id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `capability_id` INT NOT NULL,
    `status` VARCHAR(50) NULL,
    `granted_at` DATETIME NULL,
    CONSTRAINT `fk_uc_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
    CONSTRAINT `fk_uc_capability` FOREIGN KEY (`capability_id`) REFERENCES `capabilities` (`capability_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. PROPERTY_REGISTRATIONS
CREATE TABLE `property_registrations` (
    `registration_id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `address` VARCHAR(500) NULL,
    `contact_info` VARCHAR(255) NULL,
    `google_map_link` VARCHAR(500) NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING, NEEDS_SUPPLEMENT, APPROVED, REJECTED',
    `target_property_id` INT NULL,
    `base_registration_id` INT NULL,
    `requested_fields_json` TEXT NULL,
    `submitted_at` DATETIME(6) NULL,
    `registration_details` TEXT NULL,
    `reviewed_at` DATETIME(6) NULL,
    `reviewed_by` INT NULL,
    `reason_note` TEXT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_pr_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
    CONSTRAINT `fk_pr_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. PROPERTY_DOCUMENTS
CREATE TABLE `property_documents` (
    `document_id` INT AUTO_INCREMENT PRIMARY KEY,
    `registration_id` INT NOT NULL,
    `document_type` VARCHAR(100) NULL,
    `document_url` VARCHAR(500) NULL,
    `verification_status` VARCHAR(50) NULL,
    `file_name` VARCHAR(255) NULL,
    `content_type` VARCHAR(255) NULL,
    `file_size` BIGINT NULL,
    `uploaded_at` DATETIME(6) NULL,
    `archived_at` DATETIME(6) NULL,
    `file_content` LONGBLOB NULL,
    CONSTRAINT `fk_pd_registration` FOREIGN KEY (`registration_id`) REFERENCES `property_registrations` (`registration_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. PROPERTIES
CREATE TABLE `property_submission_events` (
    `event_id` INT AUTO_INCREMENT PRIMARY KEY,
    `registration_id` INT NOT NULL,
    `actor_id` INT NOT NULL,
    `action` VARCHAR(255) NOT NULL,
    `previous_details` TEXT NULL,
    `submitted_details` TEXT NULL,
    `previous_document_ids` TEXT NULL,
    `previous_review_note` TEXT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT `fk_submission_registration` FOREIGN KEY (`registration_id`) REFERENCES `property_registrations` (`registration_id`),
    CONSTRAINT `fk_submission_actor` FOREIGN KEY (`actor_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `properties` (
    `property_id` INT AUTO_INCREMENT PRIMARY KEY,
    `owner_id` INT NOT NULL,
    `registration_id` INT NULL UNIQUE,
    `name` VARCHAR(255) NOT NULL,
    `address` VARCHAR(500) NULL,
    `contact_info` VARCHAR(255) NULL,
    `google_map_link` VARCHAR(500) NULL,
    `description` TEXT NULL,
    `status` VARCHAR(50) NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_prop_owner` FOREIGN KEY (`owner_id`) REFERENCES `users` (`user_id`),
    CONSTRAINT `fk_prop_registration` FOREIGN KEY (`registration_id`) REFERENCES `property_registrations` (`registration_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. ROOM_TYPES
CREATE TABLE `room_types` (
    `room_type_id` INT AUTO_INCREMENT PRIMARY KEY,
    `property_id` INT NOT NULL,
    `room_type` VARCHAR(100) NOT NULL,
    `price` DECIMAL(12, 2) NULL,
    `area_sqm` FLOAT NULL,
    `service_price` DECIMAL(12, 2) NULL,
    `description` TEXT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_rt_property` FOREIGN KEY (`property_id`) REFERENCES `properties` (`property_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. ROOM_TYPE_IMAGES
CREATE TABLE `room_type_images` (
    `image_id` INT AUTO_INCREMENT PRIMARY KEY,
    `room_type_id` INT NOT NULL,
    `image_url` VARCHAR(500) NOT NULL,
    CONSTRAINT `fk_rti_room_type` FOREIGN KEY (`room_type_id`) REFERENCES `room_types` (`room_type_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. ROOM_TYPE_VIDEOS
CREATE TABLE `room_type_videos` (
    `video_id` INT AUTO_INCREMENT PRIMARY KEY,
    `room_type_id` INT NOT NULL,
    `video_url` VARCHAR(500) NOT NULL,
    CONSTRAINT `fk_rtv_room_type` FOREIGN KEY (`room_type_id`) REFERENCES `room_types` (`room_type_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. AMENITIES
CREATE TABLE `amenities` (
    `amenity_id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `category` VARCHAR(100) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. ROOM_TYPE_AMENITIES
CREATE TABLE `room_type_amenities` (
    `room_type_id` INT NOT NULL,
    `amenity_id` INT NOT NULL,
    PRIMARY KEY (`room_type_id`, `amenity_id`),
    CONSTRAINT `fk_rta_room_type` FOREIGN KEY (`room_type_id`) REFERENCES `room_types` (`room_type_id`) ON DELETE CASCADE,
    CONSTRAINT `fk_rta_amenity` FOREIGN KEY (`amenity_id`) REFERENCES `amenities` (`amenity_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. SERVICE_CATEGORIES
CREATE TABLE `service_categories` (
    `category_id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. SERVICE_REGISTRATIONS
CREATE TABLE `service_registrations` (
    `registration_id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `category_id` INT NOT NULL,
    `service_name` VARCHAR(255) NOT NULL,
    `contact_info` VARCHAR(255) NULL,
    `price` DECIMAL(12, 2) NULL,
    `description` TEXT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING, APPROVED, REJECTED',
    `reviewed_by` INT NULL,
    `reason_note` TEXT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `reviewed_at` DATETIME NULL,
    CONSTRAINT `fk_sr_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
    CONSTRAINT `fk_sr_category` FOREIGN KEY (`category_id`) REFERENCES `service_categories` (`category_id`),
    CONSTRAINT `fk_sr_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. SERVICE_DOCUMENTS
CREATE TABLE `service_documents` (
    `document_id` INT AUTO_INCREMENT PRIMARY KEY,
    `registration_id` INT NOT NULL,
    `document_name` VARCHAR(255) NULL,
    `document_url` VARCHAR(500) NULL,
    `verification_status` VARCHAR(50) NULL,
    CONSTRAINT `fk_sd_registration` FOREIGN KEY (`registration_id`) REFERENCES `service_registrations` (`registration_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. SERVICES
CREATE TABLE `services` (
    `service_id` INT AUTO_INCREMENT PRIMARY KEY,
    `provider_id` INT NOT NULL,
    `category_id` INT NOT NULL,
    `registration_id` INT NULL UNIQUE,
    `service_name` VARCHAR(255) NOT NULL,
    `contact_info` VARCHAR(255) NULL,
    `price` DECIMAL(12, 2) NULL,
    `description` TEXT NULL,
    `status` VARCHAR(50) NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_srv_provider` FOREIGN KEY (`provider_id`) REFERENCES `users` (`user_id`),
    CONSTRAINT `fk_srv_category` FOREIGN KEY (`category_id`) REFERENCES `service_categories` (`category_id`),
    CONSTRAINT `fk_srv_registration` FOREIGN KEY (`registration_id`) REFERENCES `service_registrations` (`registration_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. POSTS
CREATE TABLE `posts` (
    `post_id` INT AUTO_INCREMENT PRIMARY KEY,
    `author_id` INT NOT NULL,
    `post_type` VARCHAR(50) NOT NULL COMMENT 'ROOMMATE, PASS_ROOM, PASS_ITEM',
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING, APPROVED, REJECTED',
    `reviewed_by` INT NULL,
    `reviewed_at` DATETIME NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_posts_author` FOREIGN KEY (`author_id`) REFERENCES `users` (`user_id`),
    CONSTRAINT `fk_posts_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. POST_MEDIA
CREATE TABLE `post_media` (
    `media_id` INT AUTO_INCREMENT PRIMARY KEY,
    `post_id` INT NOT NULL,
    `media_type` VARCHAR(50) NOT NULL COMMENT 'IMAGE, VIDEO',
    `media_url` VARCHAR(500) NOT NULL,
    CONSTRAINT `fk_pm_post` FOREIGN KEY (`post_id`) REFERENCES `posts` (`post_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. ROOMMATE_POST_DETAILS
CREATE TABLE `roommate_post_details` (
    `post_id` INT PRIMARY KEY,
    `roommate_type` VARCHAR(50) NULL COMMENT 'HAS_ROOM, NO_ROOM',
    `requirements` TEXT NULL,
    `location` VARCHAR(255) NULL,
    `property_id` INT NULL,
    `property_description` TEXT NULL,
    CONSTRAINT `fk_rpd_post` FOREIGN KEY (`post_id`) REFERENCES `posts` (`post_id`) ON DELETE CASCADE,
    CONSTRAINT `fk_rpd_property` FOREIGN KEY (`property_id`) REFERENCES `properties` (`property_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. PASS_ROOM_POST_DETAILS
CREATE TABLE `pass_room_post_details` (
    `post_id` INT PRIMARY KEY,
    `property_id` INT NULL,
    `property_info` TEXT NULL,
    `description` TEXT NULL,
    `pass_reason` TEXT NULL,
    `available_date` DATETIME NULL,
    `contract_expire_date` DATETIME NULL,
    CONSTRAINT `fk_prpd_post` FOREIGN KEY (`post_id`) REFERENCES `posts` (`post_id`) ON DELETE CASCADE,
    CONSTRAINT `fk_prpd_property` FOREIGN KEY (`property_id`) REFERENCES `properties` (`property_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20. PASS_ITEM_POST_DETAILS
CREATE TABLE `pass_item_post_details` (
    `post_id` INT PRIMARY KEY,
    `item_description` TEXT NULL,
    CONSTRAINT `fk_pipd_post` FOREIGN KEY (`post_id`) REFERENCES `posts` (`post_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 21. SUPPORT_REQUESTS
CREATE TABLE `support_requests` (
    `request_id` INT AUTO_INCREMENT PRIMARY KEY,
    `requester_id` INT NOT NULL,
    `target_property_id` INT NULL,
    `request_type` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING, IN_PROGRESS, COMPLETED',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `completed_at` DATETIME NULL,
    CONSTRAINT `fk_srq_requester` FOREIGN KEY (`requester_id`) REFERENCES `users` (`user_id`),
    CONSTRAINT `fk_srq_property` FOREIGN KEY (`target_property_id`) REFERENCES `properties` (`property_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 22. SUPPORT_LOGS
CREATE TABLE `support_logs` (
    `log_id` INT AUTO_INCREMENT PRIMARY KEY,
    `request_id` INT NOT NULL,
    `performed_by` INT NOT NULL,
    `action_description` TEXT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_sl_request` FOREIGN KEY (`request_id`) REFERENCES `support_requests` (`request_id`) ON DELETE CASCADE,
    CONSTRAINT `fk_sl_performed_by` FOREIGN KEY (`performed_by`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 23. MODERATION_LOGS
CREATE TABLE `moderation_logs` (
    `log_id` INT AUTO_INCREMENT PRIMARY KEY,
    `staff_id` INT NOT NULL,
    `target_type` VARCHAR(100) NOT NULL,
    `target_id` INT NOT NULL,
    `action` VARCHAR(100) NOT NULL,
    `note` TEXT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_ml_staff` FOREIGN KEY (`staff_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 24. WISHLISTS
CREATE TABLE `wishlists` (
    `wishlist_id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `room_type_id` INT NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_wl_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
    CONSTRAINT `fk_wl_room_type` FOREIGN KEY (`room_type_id`) REFERENCES `room_types` (`room_type_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 25. BOOKINGS
CREATE TABLE `bookings` (
    `booking_id` INT AUTO_INCREMENT PRIMARY KEY,
    `renter_id` INT NOT NULL,
    `room_type_id` INT NOT NULL,
    `scheduled_date` DATETIME NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING, APPROVED, REJECTED, CANCELLED',
    `note` TEXT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_bk_renter` FOREIGN KEY (`renter_id`) REFERENCES `users` (`user_id`),
    CONSTRAINT `fk_bk_room_type` FOREIGN KEY (`room_type_id`) REFERENCES `room_types` (`room_type_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 26. COMMENTS
CREATE TABLE `comments` (
    `comment_id` INT AUTO_INCREMENT PRIMARY KEY,
    `post_id` INT NOT NULL,
    `author_id` INT NOT NULL,
    `content` TEXT NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_cm_post` FOREIGN KEY (`post_id`) REFERENCES `posts` (`post_id`) ON DELETE CASCADE,
    CONSTRAINT `fk_cm_author` FOREIGN KEY (`author_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 27. FEEDBACKS
CREATE TABLE `feedbacks` (
    `feedback_id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `property_id` INT NOT NULL,
    `rating` INT NOT NULL,
    `content` TEXT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_fb_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
    CONSTRAINT `fk_fb_property` FOREIGN KEY (`property_id`) REFERENCES `properties` (`property_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 28. REPORTS
CREATE TABLE `reports` (
    `report_id` INT AUTO_INCREMENT PRIMARY KEY,
    `reporter_id` INT NOT NULL,
    `target_type` VARCHAR(50) NOT NULL COMMENT 'POST, PROPERTY, SERVICE, USER',
    `target_id` INT NOT NULL,
    `reason` TEXT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING, RESOLVED, DISMISSED',
    `handler_id` INT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_rp_reporter` FOREIGN KEY (`reporter_id`) REFERENCES `users` (`user_id`),
    CONSTRAINT `fk_rp_handler` FOREIGN KEY (`handler_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
