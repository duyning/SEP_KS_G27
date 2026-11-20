# Property editing and review

Update 2026-11-11: critical changes now follow [N05–N08 reverification](../../docs/PROPERTY_REVERIFICATION.md).
Address, coordinates, manager identity and ownership/identity evidence temporarily
hide the property until a valid staff approval. Statements below about keeping
the approved version public apply only to ordinary content changes. Rejection
and supplement do not clear the hidden flag. The baseline remains available to
authorized staff for comparison even after approval.

## Host permissions

- Unsaved registration drafts stay editable in the browser.
- Pending registrations/change requests are read-only; server guards apply to direct URLs and API calls.
- NEEDS_SUPPLEMENT unlocks only the checklist fields requested by staff. A grouped contact/rules/coordinate request unlocks its related fields. Images are stored as one property gallery, so any image-category request unlocks that gallery; the staff note still specifies which photos must be supplied.
- Structured scope is stored on the registration. Previous checklist text is parsed for compatibility. A genuinely old free-text request with no recognizable checklist permits full resubmission and explicitly explains that to the host.
- Rejected profiles may be corrected and resubmitted for another review.
- Approved profiles open a new change request. The original approved registration remains linked to the published property until approval. There can be only one pending or supplement-required change request per property.
- Room-type prices and operational room statuses retain their existing independent APIs.

## Persistence

PropertyRegistration adds nullable targetPropertyId, baseRegistrationId, requestedFieldsJson, and submittedAt. PropertyDocument adds archivedAt; replaced uploads are archived, retained current files continue to be used, and archived IDs are not returned by active-file queries. PropertySubmissionEvent stores the actor, timestamps, before/after form JSON, previous file IDs and previous staff feedback. These records are private and not included in public listing DTOs.

All form/attachment changes, resubmission status and history changes are transactional. Consent, file types/sizes/counts, required documents, owner authorization and permitted fields are validated on the server. A server version token rejects stale form submissions. Owner locks serialize host edits and staff review. Approval checks that the change request's baseline still matches the published registration, updates the existing property and leaves room/type IDs intact. Rejection or supplement requests never alter the published property.

Hibernate's configured update mode adds nullable columns and the history table on startup; do not run the destructive fresh-install schema script on an existing database.

## API and UI

- GET /api/host/property-registrations/{id}/edit returns authoritative policy, current data, retained attachment metadata and version token.
- POST /api/host/property-registrations/{id}/resubmit accepts multipart `edit` JSON (details, versionToken, retainedPhotoIds), optional photos and replacement documents.
- Staff review accepts optional requestedFields. New checklist submissions always include it.
- Host property details show change-request status and point editing to the correct registration. Staff details compare proposed fields with the currently published form and include owner resubmission events alongside staff decisions.
- The editor supports an account/profile/version-scoped browser draft, excludes files and renewed consent, and requires a confirmation before sending. Drafts never publish data or change server status.

Tests cover scoped edits, forbidden field tampering, file ownership, invalid-file rollback, history retention, pending locks, cross-owner access, concurrent duplicate changes, rejected resubmissions and approval without creating another property or losing rooms. Browser checks use intercepted fixtures and never mutate live MySQL profiles.
