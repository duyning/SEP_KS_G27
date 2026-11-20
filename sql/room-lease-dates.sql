-- For environments managed by SQL migrations; development uses Hibernate ddl-auto=update.
ALTER TABLE rooms ADD COLUMN lease_start_date DATE NULL, ADD COLUMN lease_end_date DATE NULL;
