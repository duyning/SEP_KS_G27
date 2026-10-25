-- Run on an existing database only. This script preserves all records.
USE hlrcs;
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='property_documents' AND column_name='file_size')=0,
 'ALTER TABLE property_documents ADD COLUMN file_size BIGINT NULL', 'SELECT 1');
PREPARE migration FROM @ddl;
EXECUTE migration;
DEALLOCATE PREPARE migration;
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='property_documents' AND column_name='uploaded_at')=0,
 'ALTER TABLE property_documents ADD COLUMN uploaded_at DATETIME(6) NULL', 'SELECT 1');
PREPARE migration FROM @ddl;
EXECUTE migration;
DEALLOCATE PREPARE migration;
