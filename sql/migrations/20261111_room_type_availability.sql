-- MySQL 8, additive and rerunnable. Run against the selected application schema.
-- Normal development startup uses Hibernate ddl-auto=update; no backfill is performed.
SET @availability_ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns
  WHERE table_schema=DATABASE() AND table_name='room_types' AND column_name='availability_confirmed_at'),
  'SELECT 1', 'ALTER TABLE room_types ADD COLUMN availability_confirmed_at DATETIME(6) NULL');
PREPARE availability_stmt FROM @availability_ddl;
EXECUTE availability_stmt;
DEALLOCATE PREPARE availability_stmt;

SET @availability_ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns
  WHERE table_schema=DATABASE() AND table_name='room_types' AND column_name='availability_confirmed_by'),
  'SELECT 1', 'ALTER TABLE room_types ADD COLUMN availability_confirmed_by INT NULL');
PREPARE availability_stmt FROM @availability_ddl;
EXECUTE availability_stmt;
DEALLOCATE PREPARE availability_stmt;

SET @availability_ddl = IF(EXISTS(SELECT 1 FROM information_schema.key_column_usage
  WHERE table_schema=DATABASE() AND table_name='room_types' AND column_name='availability_confirmed_by'
    AND referenced_table_name='users'),
  'SELECT 1', 'ALTER TABLE room_types ADD CONSTRAINT fk_room_type_availability_actor FOREIGN KEY (availability_confirmed_by) REFERENCES users(user_id)');
PREPARE availability_stmt FROM @availability_ddl;
EXECUTE availability_stmt;
DEALLOCATE PREPARE availability_stmt;
