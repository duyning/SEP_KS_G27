# Property Registration Form

Route: `/host/property/new`.

The six-step React form follows the supplied registration screenshot: heading, numbered stepper, primary form column, progress/review/help sidebar, and separate navigation/draft action bar. Styles are scoped to this page. No sample photos, documents, amenities or house rules are prefilled. Manager contact defaults come from the signed-in account.

## Frontend validation

- Property name: 3-100 trimmed characters.
- Property type: one of the supported choices.
- Description: 30-2000 trimmed characters.
- Manager name: 2-100 trimmed characters.
- Contact phone: Vietnamese mobile format, domestic or +84; optional Zalo uses the same format.
- Area required; detailed address 10-255 characters; nearby landmark up to 255.
- Map location is required. Coordinates must be paired decimal numbers within latitude/longitude bounds; empty, hexadecimal, exponent, nonfinite and out-of-range values are rejected.
- Optional house rules up to 2000 characters.
- Photos: 1-10 JPG/PNG/WEBP files, nonempty, max 5 MB each; drag/drop selection, removable previews and cover selection with object URL cleanup. The first photo is the cover.
- Ownership and identity documents required; PCCC document recommended, not required. PDF/JPG/PNG/WEBP, nonempty, max 10 MB each.
- Twelve shared amenity choices and six house-rule choices; supported keys are validated and restored from drafts. Additional free-text rules remain optional.
- Explicit consent required on the review step.
- Inline accessible errors, input focus on the first invalid control, and full revalidation on final submit.

The backend repeats required-field, format, range and supported-choice validation. Uploads are checked for size, MIME type and matching PNG/JPEG/WEBP/PDF header signatures. These checks are not a malware scan.

## Draft and submission

Drafts store text fields and selected amenity/rule keys in account-scoped session storage only. Documents, images and consent are never persisted in browser storage. Reload restores the text draft and asks the user to reselect files. Storage failures are shown, not reported as success.

`POST /api/host/property-registrations` accepts a JSON `details` part, 1-10 `photos`, required `ownership` and `idCard` parts, and optional `fireSafety`. It saves the registration as `PENDING` and its private attachments in one transaction. Full form details are retained as JSON; the first photo remains the cover by `PHOTO_0` ordering. No active Property is created and no public attachment URL is exposed. Approval/rejection endpoints are outside this change.

Ownership comes from the authenticated principal. A per-owner pessimistic lock under READ_COMMITTED and duplicate checks prevent concurrent pending registrations. Hosts already owning a property cannot submit another. Any failed file validation rolls back the complete submission.

Only a confirmed pending response triggers the success notification, clears the draft/files and shows the pending-state panel. `GET /api/host/property-registrations/current` restores the owner's pending state after reload. Existing dashboard/property views use the pending-registration count. Errors keep the form editable; controls are locked during upload. A 409 conflict rechecks the current registration before deciding whether to display an existing pending record.

The single application.properties retains the MySQL connection and now sets multipart limits of 10 MB per file and 85 MB total. JPA adds nullable registration-details and private attachment-content columns using the existing ddl-auto=update setting. Account/database credentials are unchanged.

## Verification

- 37 frontend unit tests passed, including multipart authentication/boundary handling, pending response validation and 10 registration-validation tests.
- 22 backend tests passed, including transactional pending registration, retained attachments/details, rollback on invalid submission, authorization, owner isolation, duplicate/existing-property guards and two concurrent submissions creating only one pending record. Writes in these tests use isolated H2, not MySQL.
- Vite production build passed; existing large-bundle warning remains.
- Browser script `scripts/check-property-registration.cjs` covers all six steps, invalid fields, file types, drag/drop, previews, changing/removing cover photos, optional PCCC, editing a review section, consent, draft save/restore, failed submission, locked controls, pending notification and reload. Two intercepted submission requests verify UI behavior without writing sample registrations into MySQL. The initial current-status GET uses the real backend.
- Responsive checks: 1920, 1536, 1366, 1024, 768 and 390 pixels.
- Each of the amenities/images/documents/review steps is additionally checked at 1536, 768 and 390 pixels. Review is divided into five editable sections, matching the additional reference images.

## Location Step

The location screenshot is implemented with a two-column address/area row, optional landmark field and an interactive Leaflet 1.9.4 map. The map provides click placement, draggable pin, zoom, and four approximate quick-pin locations retained from the original prototype. The initial viewport is not a saved property location. A user must explicitly place a pin or enter coordinates.

Coordinates are shared with the manual inputs and review step and retained when navigating or restoring a text draft. Approximate quick-pin coordinates are labelled as reference centers, not verified addresses. No reverse-geocoding or administrative-boundary validation is claimed.

Leaflet marker bitmap assets are imported from the package to avoid broken marker URLs. Map lifecycle and resize observers are cleaned up when leaving the step, including React StrictMode remounts. The map has a local stacking context so controls cannot cover the shared header.

OpenStreetMap raster tiles require Internet connectivity. The verification environment refused the tile-server connection; live geographical background imagery could not be confirmed there. An explicit loading-failure notice, retry and manual-coordinate fallback remain available. Browser tests use controlled bitmap tile responses only to check retry recovery, not geographical rendering accuracy. Map placement, dragging, quick pins, zoom, coordinate validation/restoration and page responsiveness were checked separately.
