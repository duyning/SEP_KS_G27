-- MySQL 8; additive, rerunnable. Select the intended schema before running.
-- No previously approved property is hidden solely by installing this schema.
SET @reverification_ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns
 WHERE table_schema=DATABASE() AND table_name='properties' AND column_name='reverification_required'),
 'SELECT 1', 'ALTER TABLE properties ADD COLUMN reverification_required BOOLEAN NOT NULL DEFAULT FALSE');
PREPARE reverification_stmt FROM @reverification_ddl;
EXECUTE reverification_stmt;
DEALLOCATE PREPARE reverification_stmt;

SET @reverification_ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns
 WHERE table_schema=DATABASE() AND table_name='properties' AND column_name='reverification_reasons_json'),
 'SELECT 1', 'ALTER TABLE properties ADD COLUMN reverification_reasons_json TEXT NULL');
PREPARE reverification_stmt FROM @reverification_ddl;
EXECUTE reverification_stmt;
DEALLOCATE PREPARE reverification_stmt;

SET @reverification_ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns
 WHERE table_schema=DATABASE() AND table_name='property_registrations' AND column_name='reverification_reasons_json'),
 'SELECT 1', 'ALTER TABLE property_registrations ADD COLUMN reverification_reasons_json TEXT NULL');
PREPARE reverification_stmt FROM @reverification_ddl;
EXECUTE reverification_stmt;
DEALLOCATE PREPARE reverification_stmt;
