CREATE TABLE IF NOT EXISTS room_tenancies (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    owner_id INT NOT NULL,
    active_room_id INT UNIQUE,
    contract_id BIGINT UNIQUE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    closed_date DATE,
    monthly_rent DECIMAL(12,2),
    deposit DECIMAL(12,2),
    created_at DATETIME(6),
    INDEX ix_tenancy_room_owner (room_id, owner_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS room_occupants (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    tenancy_id BIGINT NOT NULL,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(30),
    joined_on DATE NOT NULL,
    left_on DATE,
    primary_tenant BOOLEAN NOT NULL,
    INDEX ix_occupant_tenancy (tenancy_id),
    CONSTRAINT fk_occupant_tenancy FOREIGN KEY (tenancy_id) REFERENCES room_tenancies (id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
