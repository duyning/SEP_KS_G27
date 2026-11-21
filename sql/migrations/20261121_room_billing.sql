-- Apply once after 20261121_room_tenancies.sql on MySQL installations with managed migrations.
ALTER TABLE room_tenancies
    ADD COLUMN rent_cycle_months INT NULL,
    ADD COLUMN rent_due_day INT NULL,
    ADD COLUMN first_rent_due_date DATE NULL;

CREATE TABLE IF NOT EXISTS room_bills (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    revision BIGINT NOT NULL,
    owner_id INT NOT NULL,
    property_id INT NOT NULL,
    room_id INT NOT NULL,
    tenancy_id BIGINT NOT NULL,
    room_number VARCHAR(30) NOT NULL,
    tenant_name VARCHAR(150) NOT NULL,
    billing_month DATE NOT NULL,
    kind VARCHAR(12) NOT NULL,
    due_date DATE NOT NULL,
    rent_from DATE,
    rent_through DATE,
    rent_amount DECIMAL(20,0) NOT NULL,
    utility_reading_id BIGINT UNIQUE,
    utility_revision BIGINT,
    electricity_amount DECIMAL(20,0) NOT NULL,
    water_amount DECIMAL(20,0) NOT NULL,
    charges_json TEXT NOT NULL,
    total_amount DECIMAL(20,0) NOT NULL,
    paid_amount DECIMAL(20,0) NOT NULL,
    issued_at DATETIME(6),
    CONSTRAINT uk_room_bill_period_kind UNIQUE (tenancy_id, billing_month, kind),
    INDEX ix_room_bill_property_period (owner_id, property_id, billing_month)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS room_bill_payments (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    bill_id BIGINT NOT NULL,
    request_key VARCHAR(36) NOT NULL,
    amount DECIMAL(20,0) NOT NULL,
    paid_on DATE NOT NULL,
    method VARCHAR(12) NOT NULL,
    note VARCHAR(400),
    recorded_at DATETIME(6) NOT NULL,
    CONSTRAINT uk_room_bill_payment_request UNIQUE (bill_id, request_key),
    CONSTRAINT fk_room_bill_payment_bill FOREIGN KEY (bill_id) REFERENCES room_bills(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
