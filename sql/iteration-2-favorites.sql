-- Run before deploying Iteration 2 against an existing MySQL database; safe to rerun.
-- Keep the earliest saved reference when historical duplicates exist.
START TRANSACTION;
DELETE later FROM wishlists later JOIN wishlists earlier
  ON later.user_id=earlier.user_id AND later.room_type_id=earlier.room_type_id
  AND later.wishlist_id>earlier.wishlist_id;
COMMIT;
-- DDL commits implicitly in MySQL. Hibernate may already have created the named constraint.
SET @favorites_ddl = IF(EXISTS(SELECT 1 FROM information_schema.statistics
  WHERE table_schema=DATABASE() AND table_name='wishlists' AND index_name='uk_wishlist_user_room_type'),
  'SELECT 1', 'ALTER TABLE wishlists ADD CONSTRAINT uk_wishlist_user_room_type UNIQUE (user_id, room_type_id)');
PREPARE favorites_migration FROM @favorites_ddl;
EXECUTE favorites_migration;
DEALLOCATE PREPARE favorites_migration;
