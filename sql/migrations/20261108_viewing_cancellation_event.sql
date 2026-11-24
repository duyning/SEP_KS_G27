-- Preserve existing notification keys and allow the CANCELLED event on MySQL.
ALTER TABLE viewing_notifications MODIFY COLUMN event_key VARCHAR(20) NOT NULL;
