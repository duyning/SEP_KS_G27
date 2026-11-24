-- Apply once to an existing rental_contracts table on MySQL with managed migrations.
ALTER TABLE rental_contracts
    ADD COLUMN signing_token_hash VARCHAR(64) NULL,
    ADD COLUMN signing_link_expires_at DATETIME(6) NULL,
    ADD COLUMN owner_signature_json MEDIUMTEXT NULL,
    ADD COLUMN tenant_signature_json MEDIUMTEXT NULL,
    ADD UNIQUE KEY uk_rental_contract_signing_token (signing_token_hash);
