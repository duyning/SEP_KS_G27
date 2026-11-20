-- Allow cancellation on MySQL installations using a native ENUM. VARCHAR needs no change.
SET @cancel_ddl = IF(
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE()
    AND table_name = 'service_registrations' AND column_name = 'status' AND data_type = 'enum'),
  'ALTER TABLE service_registrations MODIFY COLUMN status ENUM(''PENDING'',''NEEDS_SUPPLEMENT'',''APPROVED'',''REJECTED'',''CANCELLED'') NOT NULL',
  'SELECT 1');
PREPARE cancel_stmt FROM @cancel_ddl;
EXECUTE cancel_stmt;
DEALLOCATE PREPARE cancel_stmt;
