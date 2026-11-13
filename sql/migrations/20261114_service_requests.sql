-- MySQL migration; review and apply through deployment, not application startup.
-- DATETIME values for this table represent UTC instants.
CREATE TABLE IF NOT EXISTS service_requests (
    request_id INT NOT NULL AUTO_INCREMENT,
    service_id INT NOT NULL,
    customer_id INT NOT NULL,
    contact_name VARCHAR(100) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    description VARCHAR(2000) NOT NULL,
    address VARCHAR(500),
    scheduled_at DATETIME(6) NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    handled_by INT,
    handled_at DATETIME(6),
    response_reason VARCHAR(2000),
    revision INT NOT NULL DEFAULT 0,
    PRIMARY KEY (request_id),
    INDEX idx_service_request_customer (customer_id, request_id),
    INDEX idx_service_request_service (service_id, request_id),
    CONSTRAINT fk_service_request_service FOREIGN KEY (service_id) REFERENCES services(service_id),
    CONSTRAINT fk_service_request_customer FOREIGN KEY (customer_id) REFERENCES users(user_id),
    CONSTRAINT fk_service_request_handler FOREIGN KEY (handled_by) REFERENCES users(user_id)
);
