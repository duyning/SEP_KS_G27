# Host Room Types and Multiple Properties

## Registration Access

- A host can register multiple properties, including when other profiles are pending, approved or need supplements. `GET /api/host/property-registrations/eligibility` returns ELIGIBLE for authenticated hosts/admins; the route remains protected by role authorization. Existing ownership no longer hides registration navigation or redirects the new-profile form.
- POST registration validates all fields/files and serializes submissions by owner. A non-rejected registration with the same name and address returns 409 to prevent duplicate retries. Distinct profiles are independent; current-registration is retained as a legacy latest-pending read, never used to overwrite or block a new form.
- Staff approval creates a property for that registration only; it no longer blocks owners with another property. Status checks and the unique registration relationship prevent the same profile from being approved twice. Existing properties/data remain intact; owner_id already uses ManyToOne and requires no schema redesign.
- After successful submission, the owner sees pending status for the submitted profile and can start another registration with a clean form. A 409 preserves the entered form and never claims success based on another pending profile.
- Property overview includes every owned property plus all registrations not yet linked to a property, including pending, supplement and rejected records. Dashboard aggregates all properties. Room type/room pages offer an explicit property selector; switching clears the old room-type filter. Viewing requests support all-property and per-property views. Creation/import is scoped to the selected property, and the same room number can exist in distinct properties.
- Verified by 42 backend tests (isolated H2), 72 frontend tests, production build and browser checks `check-multiple-properties.cjs`, `check-host-room-types.cjs`, `check-registration-file-focus.cjs`. Browser writes are intercepted and do not add real MySQL sample data.

## Property portfolio overview

- `/host/property` displays a compact card portfolio with status counters, accent-insensitive name/address/manager/phone search, status filters, sorting and pagination (maximum six records per page). Each card shows one cover photo, its actual review status, database ID, room counts and scoped management links. Unknown room counts remain unknown.
- Full information is displayed only for `/host/property?id=<propertyId>` or `/host/property?registrationId=<registrationId>`. Pending/supplement/rejected profiles remain individually accessible. The Back link preserves the list's search/status/sort/page query parameters. Invalid or inaccessible IDs never select another record.
- The overview loads only cover photos for the visible page using the existing authenticated image endpoint. Full galleries and documents appear only inside the selected detail page. No sample database records are introduced.
- Verified: 75 frontend tests, production build, and `check-property-portfolio.cjs` covering a 15-record browser-only contract, six-item pagination, filters, search, approved/pending details, no-result/empty/inaccessible states and 1536/768/390px layout checks.

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

### Excel template and import

- The room-type page now offers **Tải mẫu Excel** and **Nhập Excel**. ExcelJS is loaded only when using Excel features. The `.xlsx` template has empty `Loại phòng` and `Danh sách phòng` input sheets plus `Hướng dẫn`; it contains no sample property, room type or rooms. Numeric bounds and amenity dropdowns guide data entry, while room-number columns use text formatting to preserve leading zeroes.
- Each workbook creates one type and 1–200 linked rooms for the currently selected, owned active property. Type metadata, optional fees and supported amenities are parsed into the same validated two-step form. Device photos can be added in the form after importing.
- Accept only nonempty `.xlsx` files up to 5 MB. Validate sheet/header structure, direct scalar cell values (reject formulas/hyperlinks/dates), required fields, numeric limits, duplicate field labels, duplicate/existing type names, and duplicate/existing room numbers. Errors cite sheet/cell locations. Incorrect files never overwrite form content or create database records.
- Import first presents an editable-form handoff after a read-only preview. It never writes automatically. Final confirmation uses the existing transactional `/with-rooms` API, preserving all backend authorization and rollback checks.
- `/host/rooms` no longer offers room creation; its editor opens only for an existing room. Table/cards, search, filters, detail, edits, availability and deletion remain. Empty guidance directs owners to room types.
- Verified with 71 frontend tests, production build, and browser checks `check-room-type-excel.cjs` / `check-host-rooms.cjs` using intercepted API calls. The browser check downloads the actual generated template, fills and reimports it, verifies cell errors, hands off to the editable wizard, saves the final preview and confirms no room-create button on `/host/rooms`. No MySQL sample data is inserted.

### Two-step creation wizard

- New creation uses two steps: type details/photos, then the physical room preview. Editing an existing type keeps the existing metadata-only form.
- The preview starts empty. Generate rooms from up to 20 floor/area groups (prefix, starting number, count), or add manual rows. Leading zeroes are preserved. Names and floors remain editable; rows/groups can be removed. Regenerating or clearing a populated preview requires explicit confirmation.
- The final preview is authoritative. POST multipart `/api/host/room-types/with-rooms` sends JSON `details`, JSON `layout: {rooms: [{roomNumber, floor}]}`, and repeated `photos` files. One transaction saves the type, images and all preview rooms. Failures roll everything back. Newly created rooms are VACANT and inherit type pricing and amenities.
- Validate 1–200 rooms; unique room names within the preview and the authenticated owner's property; room numbers 1–30 characters; floors/areas 1–50 characters. Backend owner locks serialize concurrent room/type writes. Ownership and approved/active property checks are mandatory.
- Back navigation retains type fields, selected photos, groups, preview edits and entry mode. Server errors retain the form for correction/retry. Success refreshes type totals/vacancies with actual persisted rooms and shows a count-specific toast.
- Verified: 64 frontend tests, 42 backend tests (isolated H2), production build, and three browser scripts (`check-room-type-wizard.cjs`, `check-host-room-types.cjs`, `check-room-type-crud.cjs`). Browser APIs are intercepted; no sample rows are inserted into real MySQL.
- Restart the running Spring Boot process after this update to load the new `/with-rooms` endpoint.

- CRUD/image update: 51 frontend tests and 35 backend tests against isolated H2. Coverage includes multipart uploads, strict validation, scoped binary reads, cross-owner/type denial, edit retention/replacement, rollback, duplicate names, deletion cleanup and booking-history protection.
- Production React build succeeds with the existing bundle-size warning.
- `scripts/check-host-room-types.cjs` checks 3 blocked URL variants, permitted new-owner access, fail-closed eligibility, validation, save failure/retry, creation/toast/list/reload, search, grid and detail; desktop/tablet/mobile modal/page bounds pass at 1536/1024/768/390 pixels.
- Browser tests intercept API calls and do not mutate real MySQL profiles or room types.
- `scripts/check-room-type-crud.cjs` verifies device-file selection, previews, invalid files, creation, type-only gallery, edit/remove/add images, reload persistence, delete cancellation, conflict/retry and 9 responsive checks across detail/edit/list at 1536/768/390 pixels. All browser writes are intercepted.
- Frontend: http://127.0.0.1:5173/host/room-types. Agent backend: 8081. User IntelliJ backend: 8080, left untouched.
