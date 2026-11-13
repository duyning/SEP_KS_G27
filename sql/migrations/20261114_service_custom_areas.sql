-- MySQL: additive migration for proposals and their approved public snapshots.
-- Run before deploying the backend. Safe to rerun if Hibernate has added a column.
-- Legacy service_area text is preserved; the application splits legacy values
-- when editing and stores custom values separately on the next submission.
SET @area_ddl = IF(
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE()
    AND table_name = 'service_registrations' AND column_name = 'custom_service_areas'),
  'SELECT 1', 'ALTER TABLE service_registrations ADD COLUMN custom_service_areas VARCHAR(600) NULL');
PREPARE area_stmt FROM @area_ddl;
EXECUTE area_stmt;
DEALLOCATE PREPARE area_stmt;

SET @area_ddl = IF(
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE()
    AND table_name = 'services' AND column_name = 'custom_service_areas'),
  'SELECT 1', 'ALTER TABLE services ADD COLUMN custom_service_areas VARCHAR(600) NULL');
PREPARE area_stmt FROM @area_ddl;
EXECUTE area_stmt;
DEALLOCATE PREPARE area_stmt;
