-- Development: Hibernate ddl-auto=update also creates this table after backend restart.
-- Contracts contain private tenant data; never expose this table through public endpoints.
CREATE TABLE IF NOT EXISTS rental_contracts (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    owner_id INT NOT NULL,
    status VARCHAR(20) NOT NULL,
    property_name VARCHAR(150) NOT NULL,
    property_address VARCHAR(500),
    room_number VARCHAR(30) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    details_json MEDIUMTEXT NOT NULL,
    created_at DATETIME(6),
    closed_at DATETIME(6),
    signing_token_hash VARCHAR(64) UNIQUE,
    signing_link_expires_at DATETIME(6),
    owner_signature_json MEDIUMTEXT,
    tenant_signature_json MEDIUMTEXT,
    INDEX ix_rental_contract_room_owner (room_id,owner_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
