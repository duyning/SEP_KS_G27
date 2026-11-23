-- Run once only when schema management is manual (Hibernate update handles local development).
ALTER TABLE property_registrations ADD COLUMN host_onboarding BOOLEAN NOT NULL DEFAULT FALSE;
