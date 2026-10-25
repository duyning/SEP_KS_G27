# Staff Workspace: Database Integration

## Scope

The following React pages replace their former fixture-based implementations and follow the supplied dashboard/list designs:

- `/staff`: dashboard, real work queue, operation counts and moderation activity.
- `/staff/verifications`: registration list, search/status/sort controls, five-row pagination and detail navigation.
- `/staff/verifications/detail?id=<numeric-id>`: complete submitted information, photo gallery, confidential documents, review history and approve/reject actions.

The shared staff header/logo/sidebar retain the existing app shell. Sidebar counters use the dashboard endpoint. Header controls are responsive and no longer overflow on tablet/mobile. No sample registrations or assets are inserted into MySQL.

## APIs

All endpoints require STAFF or ADMIN through the existing security configuration and controller authorization:

- `GET /api/staff/dashboard`
- `GET /api/staff/verifications`
- `GET /api/staff/verifications/{id}`
- `GET /api/staff/verifications/{id}/files/{fileId}`
- `POST /api/staff/verifications/{id}/review` with `decision=APPROVE|REJECT` and optional note (required 10-2000 trimmed characters for rejection).

Details include the stored structured registration fields: property identity/type, description, contact data, area/address/nearby landmarks, exact coordinates, amenities, selected rules, custom rules, consent, all photo/document metadata and moderation history. Legacy records without structured fields explicitly show unavailable values rather than fixtures. Missing/invalid IDs do not fall back to another registration.

Files are fetched with bearer authorization and rendered through revocable local blob URLs. The server verifies that the file belongs to the requested registration, limits served content types, and sends private/no-store and nosniff headers. Images can be enlarged; PDFs use a sandboxed browser preview with a download fallback. Public users and hosts cannot call staff file endpoints. Metadata responses do not include binary file contents.

## Actual Review Behavior

Approval/rejection is transactional under READ_COMMITTED. A registration lock and owner lock prevent repeated or concurrent approval from creating duplicate properties. PENDING and NEEDS_SUPPLEMENT registrations can receive a final decision. Approval requires structured submitted data, consent, a cover photo and the two mandatory private documents; it creates the owner's ACTIVE Property, marks submitted legal documents approved and records reviewer/time/note plus a ModerationLog event. Host `/host/property` consequently renders the approved property as `Đang hiển thị`.

Rejection requires a reason, records the decision/audit and does not publish or create a property. The host sees the rejected registration and reason through the existing property details endpoint. A reviewed registration cannot be processed again. Frontend controls lock while saving; server errors retain the dialog and do not report success. A concurrent-review conflict reloads the authoritative state.

The `reviewed_at` column is added to property_registrations through the existing JPA update setting. MySQL connection settings are unchanged.

## Honest Unavailable Data

- Feedback has no verification status in the current model: its pending count is null, not a fabricated number.
- SLA and average response timing have no measurement source: shown as unavailable.
- Supplement requests are now supported: REQUEST_SUPPLEMENT requires a trimmed 10-2000 character note, changes PENDING to NEEDS_SUPPLEMENT, and records reviewer/time plus REQUESTED_SUPPLEMENT audit history. Hosts see the note through their own property/current-registration endpoints. The verification list includes the new counter/filter. Duplicate supplement requests are blocked; terminal decisions stay locked. No email/SMS or supplemental-upload endpoint is claimed by this change.
- Real pending reports, posts and support requests appear in the dashboard queue, but action links to their still-fixture-based screens are disabled. This migration does not claim to replace those other modules.
- Empty tables/queues/history and network/server errors have separate states. Refresh always reloads real data.

## Verification

Supplement update: 43 frontend and 29 backend tests pass; production build succeeds. `scripts/check-supplement-modal.cjs` verifies all three confirmation dialogs, cancel-without-write, blank-note validation, retained content after save failure, successful status change, and desktop/mobile modal bounds. Browser API calls are intercepted, with zero real MySQL profile mutations. The backend was rebuilt/restarted on 8081 without stopping IntelliJ on 8080.

- 42 frontend tests and a successful production build. The existing bundle-size warning remains.
- 28 backend tests, including staff/admin authorization, host/public denial, full submitted details, real file bytes, file/registration ownership matching, rejection validation, approval-to-host visibility, audit creation and duplicate/concurrent review protection. Backend mutation tests run against isolated H2 only.
- `scripts/check-staff-workspace.cjs` read the existing real MySQL registration, all six photos and two private documents. It checked all three pages at 1536/1366/1024/768/390 pixels: 15 viewport checks, no horizontal page overflow or runtime errors.
- Browser review requests were intercepted (two requests: failure and success) to avoid approving/rejecting the user's real profile. Database writes from the browser checks: zero. Alternative empty/error responses are test-only.
- Development URLs: `http://127.0.0.1:5173/staff` and `http://127.0.0.1:5173/staff/verifications`; agent backend is on 8081. The user's IntelliJ backend was not stopped.
