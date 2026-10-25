# Host Room Types and Registration Guard

## Registration Access

- `GET /api/host/property-registrations/eligibility` derives permission from the authenticated owner, actual properties and registration statuses.
- Existing property or approved registration: registration navigation is hidden; `/host/property/new` and its legacy HTML alias redirect to `/host/property`. The form is never mounted before eligibility succeeds. Errors do not grant access. Returning to the tab rechecks access.
- Backend current-registration access returns 403 for existing owners. A direct multipart registration POST returns 409. Owner locking protects concurrent registration/review requests.
- Pending and supplement-requested profiles cannot create a second registration. No browser-storage flag is trusted as authority.

## Room Types

- `GET /api/host/room-types` lists only the authenticated owner's actual data. No sample records or sample image buttons are added.
- `POST /api/host/room-types` creates a real record only for an owned, active, approved property. Duplicate names are checked under an owner lock, including simultaneous requests.
- Name: 3-100 trimmed characters. Area: 1-10000 square meters, at most two decimal places. Capacity: 1-20 people. Rent: positive integer VND, at most 999999999. Deposit and fees: optional nonnegative integer VND within the same limit. Blank deposit defaults to one month's rent on the server; blank fees remain null.
- Image input now selects multiple files from the device instead of entering a URL. Up to 10 JPG/PNG/WEBP images per type, at most 5 MB each, with server-side content-signature checks. Description: at most 2000 characters. Amenities: at most 12 distinct supported keys. The legacy imageUrl column/JSON field remains for compatibility but is not used to mix property or external images into the gallery.
- Added nullable RoomType fields: capacity, deposit, imageUrl, amenitiesJson, electricityPrice, waterPrice and internetPrice. Existing price, areaSqm, description and servicePrice remain in use. The existing Hibernate schema-update configuration adds these columns without changing MySQL settings or removing existing rows.
- Successful creation returns the persisted DTO, displays a toast, inserts the row into the list and clears conflicting search/status filters. Refresh reads the persisted record. Error responses retain the dialog content. Cancellation does not create a record. Controls lock while saving.
- Search, availability filters, sort, table/grid toggle and room-management navigation are wired. Detail uses GET `/api/host/room-types/{id}` and a reference-style modal showing stats, description, deposit, amenities, only this type's photos, service fees and an empty physical-room state.
- Create uses multipart POST; edit uses multipart PUT `/api/host/room-types/{id}` with JSON `details`, repeated `photos` files and `retainedImageIds`. Existing files not retained are removed transactionally, new uploads appended, and invalid updates rolled back. Retained IDs must belong to the actual edited type. The first image is the cover.
- RoomTypeImage uses the existing room_type_images table with added fileName/contentType/fileContent fields. Binary content is not included in DTOs. Authenticated GET `/{id}/images/{imageId}` checks both owner and type/image relationship and returns private/no-store and nosniff headers. Object URLs are revoked on change/unmount.
- DELETE `/api/host/room-types/{id}` requires ownership and a confirmation dialog. Any linked booking, including historical/cancelled ones, blocks deletion with 409. Images, videos, amenity links and wishlists are cleaned up only as part of the successful transaction. Data linked to other types is untouched.
- Physical-room support is now implemented in the Room entity and `/api/host/rooms`. Type totals/vacancies and the detail table are derived from its actual linked rooms. See HOST-ROOMS-DATABASE.md. A type with zero linked rooms is not classified as sold out, and deletion is blocked while linked rooms exist.

## Verification

- CRUD/image update: 51 frontend tests and 35 backend tests against isolated H2. Coverage includes multipart uploads, strict validation, scoped binary reads, cross-owner/type denial, edit retention/replacement, rollback, duplicate names, deletion cleanup and booking-history protection.
- Production React build succeeds with the existing bundle-size warning.
- `scripts/check-host-room-types.cjs` checks 3 blocked URL variants, permitted new-owner access, fail-closed eligibility, validation, save failure/retry, creation/toast/list/reload, search, grid and detail; desktop/tablet/mobile modal/page bounds pass at 1536/1024/768/390 pixels.
- Browser tests intercept API calls and do not mutate real MySQL profiles or room types.
- `scripts/check-room-type-crud.cjs` verifies device-file selection, previews, invalid files, creation, type-only gallery, edit/remove/add images, reload persistence, delete cancellation, conflict/retry and 9 responsive checks across detail/edit/list at 1536/768/390 pixels. All browser writes are intercepted.
- Frontend: http://127.0.0.1:5173/host/room-types. Agent backend: 8081. User IntelliJ backend: 8080, left untouched.
