-- Nullable price unit for proposals and approved snapshots. Safe to rerun.
SET @unit_ddl = IF(
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE()
    AND table_name = 'service_registrations' AND column_name = 'price_unit'),
  'SELECT 1', 'ALTER TABLE service_registrations ADD COLUMN price_unit VARCHAR(20) NULL');
PREPARE unit_stmt FROM @unit_ddl;
EXECUTE unit_stmt;
DEALLOCATE PREPARE unit_stmt;

SET @unit_ddl = IF(
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE()
    AND table_name = 'services' AND column_name = 'price_unit'),
  'SELECT 1', 'ALTER TABLE services ADD COLUMN price_unit VARCHAR(20) NULL');
PREPARE unit_stmt FROM @unit_ddl;
EXECUTE unit_stmt;
DEALLOCATE PREPARE unit_stmt;
