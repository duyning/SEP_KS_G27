-- Optional MySQL migration for environments without Hibernate ddl-auto=update.
CREATE TABLE IF NOT EXISTS collected_posts (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    external_id VARCHAR(64) NOT NULL,
    source_url VARCHAR(512) NOT NULL,
    group_url VARCHAR(512) NOT NULL,
    author VARCHAR(255) NOT NULL,
    caption TEXT NOT NULL,
    source_published_at DATETIME(6) NOT NULL,
    collected_at DATETIME(6) NOT NULL,
    published BOOLEAN NOT NULL DEFAULT FALSE,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    published_at DATETIME(6) NULL,
    collected_by INT NOT NULL,
    published_by INT NULL,
    CONSTRAINT uk_collected_external UNIQUE (external_id),
    INDEX idx_collected_visibility_id (published, id),
    CONSTRAINT fk_collected_collector FOREIGN KEY (collected_by) REFERENCES users(user_id),
    CONSTRAINT fk_collected_publisher FOREIGN KEY (published_by) REFERENCES users(user_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS collected_post_images (
    post_id BIGINT NOT NULL,
    image_order INT NOT NULL,
    image_url VARCHAR(2048) NOT NULL,
    PRIMARY KEY (post_id, image_order),
    CONSTRAINT fk_collected_image_post FOREIGN KEY (post_id) REFERENCES collected_posts(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
