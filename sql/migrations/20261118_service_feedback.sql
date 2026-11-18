-- MySQL 8; additive and safe to rerun. Run against the application database.
SET @feedback_ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'services' AND column_name = 'moderation_hidden'),
  'SELECT 1', 'ALTER TABLE services ADD COLUMN moderation_hidden BOOLEAN NOT NULL DEFAULT FALSE');
PREPARE feedback_stmt FROM @feedback_ddl;
EXECUTE feedback_stmt;
DEALLOCATE PREPARE feedback_stmt;

CREATE TABLE IF NOT EXISTS service_ratings (
  rating_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  service_id INT NOT NULL, author_id INT NOT NULL,
  stars INT NOT NULL, content VARCHAR(3000) NOT NULL, created_at DATETIME(6) NOT NULL,
  reply VARCHAR(3000), replied_at DATETIME(6),
  CONSTRAINT uk_service_rating_author UNIQUE (service_id, author_id),
  CONSTRAINT ck_service_rating_stars CHECK (stars BETWEEN 0 AND 5),
  FOREIGN KEY (service_id) REFERENCES services(service_id),
  FOREIGN KEY (author_id) REFERENCES users(user_id)
);
CREATE TABLE IF NOT EXISTS service_rating_images (
  rating_id INT NOT NULL, image_position INT NOT NULL,
  image_content LONGBLOB NOT NULL, content_type VARCHAR(100) NOT NULL,
  PRIMARY KEY (rating_id, image_position), FOREIGN KEY (rating_id) REFERENCES service_ratings(rating_id)
);
CREATE TABLE IF NOT EXISTS service_complaints (
  complaint_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  service_id INT NOT NULL, reporter_id INT NOT NULL,
  content VARCHAR(3000) NOT NULL, status VARCHAR(30) NOT NULL,
  created_at DATETIME(6) NOT NULL, revision INT NOT NULL DEFAULT 0,
  FOREIGN KEY (service_id) REFERENCES services(service_id),
  FOREIGN KEY (reporter_id) REFERENCES users(user_id)
);
CREATE TABLE IF NOT EXISTS service_complaint_images (
  complaint_id INT NOT NULL, image_position INT NOT NULL,
  image_content LONGBLOB NOT NULL, content_type VARCHAR(100) NOT NULL,
  PRIMARY KEY (complaint_id, image_position), FOREIGN KEY (complaint_id) REFERENCES service_complaints(complaint_id)
);
CREATE TABLE IF NOT EXISTS service_complaint_events (
  event_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  complaint_id INT NOT NULL, actor_id INT NOT NULL,
  action VARCHAR(30) NOT NULL, content VARCHAR(3000) NOT NULL, created_at DATETIME(6) NOT NULL,
  FOREIGN KEY (complaint_id) REFERENCES service_complaints(complaint_id),
  FOREIGN KEY (actor_id) REFERENCES users(user_id)
);
CREATE TABLE IF NOT EXISTS service_complaint_event_images (
  event_id INT NOT NULL, image_position INT NOT NULL,
  image_content LONGBLOB NOT NULL, content_type VARCHAR(100) NOT NULL,
  PRIMARY KEY (event_id, image_position), FOREIGN KEY (event_id) REFERENCES service_complaint_events(event_id)
);
