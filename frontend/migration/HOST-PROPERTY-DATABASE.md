# My Property: Owned Details and Review States

Route `/host/property` reads `GET /api/host/property`, with optional positive property `id`. The backend derives ownership only from authentication. An inaccessible ID returns 404 rather than an empty/onboarding response.

## Data and Layout

- The supplied detail design is used for both pending registrations and owned properties: cover/gallery, property/contact summary, four statistics, management navigation, information/amenities/rules, and review/document metadata.
- When no Property exists, the pending registration (or latest reviewed registration) supplies the actual stored name, contact/address and structured JSON details. It does not create an active Property.
- No owned property or registration retains the previous no-property onboarding design.
- Room-type and pending-booking counts are queried from the database. Individual-room and vacancy counts remain null because no individual-room model exists; the UI shows an unavailable value rather than invented counts.
- Legacy records without structured registration details show only available fields. A cross-owner registration relationship is ignored to protect private data.

## Status Rules

- Pending registration: `PENDING`, amber label `Hồ sơ đang chờ xét duyệt`; no verified badge or public claim.
- Active Property with approved registration (or a legacy active Property without a registration): `VISIBLE`, green `Đang hiển thị`.
- Rejected registration: rejection state, never visible.
- Approved registration without an active Property: approved but not displayed; approval alone does not fabricate a publicly available listing.
- Verification/document labels are derived independently from actual registration/document review statuses.

## Photos and Documents

`GET /api/host/property/photos/{documentId}` returns only an authenticated owner's PHOTO attachment with supported image content type. Other owners and verification documents receive 404. Responses use `private, no-store` and `nosniff` headers. React fetches photos with the authorization header, renders local blob URLs and revokes them on cleanup. The gallery opens a native dialog.

The details response uses metadata projections and never includes file contents, document URLs or raw registration JSON/consent. Legal documents are shown as metadata/status only. Public-view and edit buttons remain disabled because linked real-property public/edit APIs do not exist; they do not navigate into prototype fixtures. Room-management links are available for an existing nonpending property.

## Verification

- 39 frontend tests passed; production build passed with the existing large-bundle warning.
- 25 backend tests passed, including full pending details, approved/active versus pending/inactive status, owner isolation, image bytes, private-document rejection and permissions. Backend test writes use isolated H2.
- `scripts/check-host-property.cjs` read the actual MySQL pending registration and rendered its six saved photographs. No MySQL records were inserted or changed by this check.
- Browser-only alternative responses cover empty/error/retry, pending/visible layouts and different badge colors, authenticated bitmap loading, image dialog, management navigation and inaccessible IDs.
- Both pending and visible layouts were checked at 1920, 1536, 1440, 1366, 1024, 768 and 390 pixels: 14 viewport checks, no horizontal page overflow or runtime errors.
- Development URL: `http://127.0.0.1:5173/host/property`; agent backend on 8081. The user's IntelliJ backend was not stopped.
