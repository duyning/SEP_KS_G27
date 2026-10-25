# Frontend Migration Report

## Status

IN PROGRESS. This is not a completed migration. Missing business APIs block
end-to-end migration and security/ownership testing for most prototype screens.
Source prototypes are retained untouched outside the main repository.

## Architecture Detected Before Implementation

- Prototype root: `Code/`; application root: `Code/HL-RCS/HL-RCS/`.
- Frontend: existing React 19, React Router 7, Vite 7, pnpm lockfile.
- Backend: Java 17 target, Spring Boot 4.1.1, Maven Wrapper, Spring Data JPA.
- Authentication: JWT Bearer, BCrypt, `/api/auth/me` verifies identity. No Google
  sign-in implementation exists, despite OAuth dependencies in the POM.
- Database: MySQL localhost:3306/hlrcs. H2 is test-only. No schema change planned.
- Roles: USER, ROOM_HOST, STAFF, ADMIN. Backend allows ADMIN in host/staff areas.
- API security: Spring Security and method authorization; frontend guards are
  only a UX layer. Existing backend policies must not be relaxed.
- Existing repositories: User, UserCapability, Capability only. Domain entities
  alone are not HTTP APIs and must not be treated as DTO contracts.
- Existing UI: login/register/account. No reusable portal shell existed.
- Git status was inspected: pre-existing modified/untracked backend files and
  frontend sources are retained. No reset, clean, checkout or history rewrite.

## Migration Map

BLOCKED means a React shell can exist but the original screen's business workflow
and visual parity are not complete. It does not mean an empty database response.

| Prototype | Actor | React target | Disposition | Status / gap |
| --- | --- | --- | --- | --- |
| index.html | PUBLIC | / | MERGE | BLOCKED: listing API, featured rooms and statistics |
| home.html | PUBLIC | / | MERGE | BLOCKED: same home screen as index |
| login.html | PUBLIC | /login | REFACTOR | MIGRATED: existing JWT login; visual parity pending |
| register.html | PUBLIC | /register | REFACTOR | MIGRATED: existing registration; visual parity pending |
| search.html | PUBLIC | /search | MIGRATE | BLOCKED: property search/filter API |
| map-search.html | PUBLIC | /map | MIGRATE | BLOCKED: geolocation/coordinate API |
| detail.html | PUBLIC | /properties/detail?id= | MIGRATE | BLOCKED: public property, media, reviews, booking/report APIs |
| favorites.html | USER | /favorites | REFACTOR | BLOCKED: user-owned wishlist API |
| bookings.html | USER | /bookings | REFACTOR | BLOCKED: user-owned viewing requests API |
| community.html | PUBLIC/USER | /community | REFACTOR | BLOCKED: approved-only feed, post/comment/ownership APIs |
| services.html | PUBLIC | /services | MIGRATE | BLOCKED: services/search/provider application APIs |
| service-detail.html | PUBLIC | /services/detail?id= | MIGRATE | BLOCKED: service details and contact DTO |
| notifications.html | MEMBER | /notifications | REFACTOR | BLOCKED: recipient-owned notification API |
| profile.html | MEMBER | /profile | REFACTOR | BLOCKED: account/security integrated; saved/booking/report tabs lack APIs |
| host-dashboard.html | ROOM_HOST/ADMIN | /host | REFACTOR | BLOCKED: owner-scoped dashboard statistics |
| host-property.html | ROOM_HOST/ADMIN | /host/property | REFACTOR | BLOCKED: owned property API |
| host-property-create.html | ROOM_HOST/ADMIN | /host/property/new | REFACTOR | BLOCKED: registration, upload, address APIs |
| host-property-edit.html | ROOM_HOST/ADMIN | /host/property/edit?id= | REFACTOR | BLOCKED: ownership read/update APIs |
| host-room-types.html | ROOM_HOST/ADMIN | /host/room-types | REFACTOR | BLOCKED: room type CRUD/media/amenities APIs |
| host-rooms.html | ROOM_HOST/ADMIN | /host/rooms | REFACTOR | BLOCKED: individual-room and availability APIs |
| host-room-availability.html | ROOM_HOST/ADMIN | /host/rooms | MERGE | MERGED: redirect only, preserve search/hash |
| host-viewing-requests.html | ROOM_HOST/ADMIN | /host/viewings | REFACTOR | BLOCKED: owner-scoped request lifecycle |
| host-support.html | ROOM_HOST/ADMIN | /host/support | REFACTOR | BLOCKED: owned requests and replies API |
| host-notifications.html | ROOM_HOST/ADMIN | /host/notifications | REFACTOR | BLOCKED: recipient-scoped notification API |
| staff-dashboard.html | STAFF/ADMIN | /staff | REFACTOR | BLOCKED: queue, listing reports, feedback, history APIs |
| staff-property-verifications.html | STAFF/ADMIN | /staff/verifications | REFACTOR | BLOCKED: registration review lifecycle/documents |
| staff-property-verification-detail.html | STAFF/ADMIN | /staff/verifications/detail?id= | REFACTOR | BLOCKED: document access and decision API |
| staff-community-moderation.html | STAFF/ADMIN | /staff/community | REFACTOR | BLOCKED: pending posts queue API |
| staff-community-moderation-detail.html | STAFF/ADMIN | /staff/community/detail?id= | REFACTOR | BLOCKED: moderation decisions and audit API |
| staff-assistance-requests.html | STAFF/ADMIN | /staff/assistance | REFACTOR | BLOCKED: assignment-scoped support API |
| staff-assistance-request-detail.html | STAFF/ADMIN | /staff/assistance/detail?id= | REFACTOR | BLOCKED: assignment authorization and reply API |
| admin-dashboard.html | ADMIN | /admin | REFACTOR | BLOCKED: accounts, assignment, statistics, audit API |

## Dependencies And Data Classification

See `migration/inventory.json` for each HTML file's actual stylesheet/script,
heading, form field, table, navigation, inline code and asset references; all CSS
and JS files have hashes and references. The inventory is extracted from source,
not inferred solely from filenames.

- `styles.css`, `home.css`, host/staff dashboard CSS: REUSE design tokens and
  layout geometry; MERGE shared brand, navigation, buttons and surface styles.
- Per-screen CSS: REUSE by screen family, adapt responsive conflicts; do not
  import every stylesheet globally into authentication pages.
- DOM page controllers: REFACTOR into React state/components. Do not execute
  old DOMContentLoaded controllers inside React.
- `rooms-data.js`, `services-data.js`: MOCK ONLY; not production listings.
- host/staff/community/booking/notification/report/wishlist helpers: PERSISTENT
  PROTOTYPE DATA, localStorage seeds and mock ownership; not backend enforcement.
- Sorting, filters, selected tabs, open dialogs: LOCAL UI STATE; safe to migrate.
- JWT identity, account/profile/password: REAL BACKEND DATA.
- Leaflet: REUSE only if map data API becomes available. Do not create invented
  room markers. Availability controller/style: OBSOLETE runtime, merged into rooms.
- Existing `reference/auth` is reference only, not a second frontend architecture.

## API Contracts

| Workflow | Existing endpoint | Contract |
| --- | --- | --- |
| Login | POST /api/auth/login | email (email or phone), password; AuthResponse |
| Registration | POST /api/auth/register | fullName, email, phoneNumber, password, role |
| Identity | GET /api/auth/me | userId, fullName, email, phoneNumber, role, status, createdAt, capabilities |
| Profile update | PUT /api/auth/profile | fullName, phoneNumber; UserProfileResponse |
| Change password | PUT /api/auth/change-password | oldPassword, newPassword; no data |
| Logout | POST /api/auth/logout | clear frontend token after request |

Responses use ApiResponse(success, message, data). No business endpoint paths
are invented. API 401 expires the frontend session; 403 is not fake success.

## Backend Gaps And Business Conflicts

- SupportStatus only has PENDING, IN_PROGRESS, COMPLETED. Prototype also uses
  WAITING_FOR_HOST, RESOLVED, REJECTED. Do not map silently or alter enum/schema.
- SupportRequest has no assignedStaff relation. SupportLog.performedBy records
  an action, not assignment. Staff A/B enforcement requires an agreed contract.
- No IndividualRoom entity/CRUD exists; RoomType alone cannot persist P.101 or
  derive individual room availability. No invented table or column is added.
- Property coordinates, utility prices, detailed document/media upload fields
  differ from prototype. Confirm requirements before adding backend contracts.
- Community publication/moderation/ownership must be enforced by backend before
  enabling public content or decisions. Verification and listing moderation
  remain separate workflows.
- No notification DTO/API, admin account management/audit API, search/map API,
  reports, wishlist, viewing request or service registration controller exists.
- JWT logout currently clears client storage/cookies, not server-side token
  revocation. Migration does not claim to add revocation or refresh-token APIs.

## Safety And Remaining Work

Do not delete prototypes or their reference copies. Do not import prototype
mock authentication. Do not create fake current identities, counters, mutations,
notifications or success messages. Unsupported mutations remain disabled.
Only account mutations use existing contracts; do not touch schema/properties.

Final implementation, build, runtime and responsive results are recorded below
after verification. Full visual parity and end-to-end domain testing remain
blocked until the missing APIs and permission contracts exist.

## Files Created In This Migration Group

- `scripts/audit-prototype.mjs`: reproducible source inventory; never edits source.
- `scripts/check-browser.cjs`: real-login browser checks, no MySQL mutations.
- `migration/inventory.json`: all 99 source artifacts, hashes, dependencies,
  field/table/modal references and broken local references.
- `src/routing/screens.js`: 32 screen targets, role matrix, landing routes.
- `src/layouts/PortalLayout.jsx`: shared shell with separate actor navigation.
- `src/components/PortalUI.jsx`: state views, status, disabled actions, table,
  metrics, toast and native accessible dialog.
- `src/pages/PortalScreens.jsx`: grouped screen shells with local UI state only.
- `src/pages/ProfilePage.jsx`: API-backed profile/password, unsupported tabs gated.
- `src/styles/portal.css`: shared tokens, shell geometry and responsive adaptations.
- `tests/routing.test.js`, `tests/auth-api.test.js`.
- `FRONTEND-MIGRATION-REPORT.md` (this report).

## Files Modified And Removed

- `src/App.jsx`: route registry, legacy aliases, guards, profile alias, 404 state.
- `src/main.jsx`: import shared portal stylesheet.
- `src/pages/AuthPage.jsx`: role-aware destination and return to requested route.
- `src/context/AuthContext.jsx`: profile update, session-expiry handling and
  protection against stale profile responses restoring a logged-out session.
- `src/services/auth.js`: profile/password contracts; 401 session invalidation
  does not allow a late response to clear a newer login.
- `package.json`: test and audit commands; no new frontend dependencies.
- `frontend/README.md`, parent `Code/HL-RCS/README.md`: current run/route status.
- `src/test/java/org/hlrcs/HlRcsApplicationTests.java`: two additional tests.
- Removed obsolete React `src/pages/AccountPage.jsx`; `/account` now redirects to
  the API-backed `/profile`. This was not an original prototype file.
- No backend production Java, SQL/schema, application properties, prototype
  HTML/CSS/JS, reference sources or Git history changed in this group.

## Shared Components And Design

Brand, avatar, topbar, sidebar, breadcrumbs, mobile drawer, screen headings,
filter bar, metrics, table/mobile row layout, pagination controls, status,
toast, dialog and form fields are shared. Host, Staff and Admin have separate
menu definitions. Admin navigation does not add Staff Assistance or System
Settings. The prototype's cross-portal Staff links are not copied into Admin.

Visual foundation retains Plus Jakarta Sans, teal #0d9488, slate #0f172a,
background #f8fafc, border #e2e8f0, 260px sidebar and 72px topbar. Original inline
SVG systems are replaced with the existing lucide-react dependency. Public
photography uses the prototype's original Unsplash URL; fonts remain remote.
No fake verified-property counts, ratings, testimonials or user identities are
ported into production constants. Metrics display unavailable, not fake zeros.

This group does NOT claim full visual parity: original populated cards, document
previews, galleries, map pins, charts, domain-specific modals and complete form
workflows remain to be ported/verified alongside their missing data contracts.
Screens marked BLOCKED are shared React shells, not fully migrated screens.

## Source Asset Problems Found

Inventory identifies six missing local references in the original source:

- `auth.js` under three Staff HTML pages (assistance list, property verification
  list and detail). It is not imported by React; JWT auth is reused instead.
- `css/images/layers.png`, `layers-2x.png`, `marker-icon.png` referenced by Leaflet.
  Leaflet is not loaded in current runtime because map data/coordinates are
  unavailable; these missing assets must be resolved before enabling the map.

## Mock Removal And Security Boundaries

Prototype helper controllers, sample room/service arrays, account switchers,
localStorage identities/records and fake success notifications are not executed
or imported. Only JWT session persistence and remember-me use browser storage.
Filters, tab selections, property wizard drafts and support reply drafts are
transient UI state, never claimed to be persisted. Unsupported submit/decision
buttons are disabled, and unknown domain APIs are never called.

Direct actor routes require the real backend-returned role. Unknown portals
fail closed. Backend authorization is unchanged. User input is rendered through
React text/controlled inputs, never raw HTML. API errors are displayed without
fake success; password confirmation uses a native focus-trapping dialog.

No host ownership, Staff assignment, community publication or Admin mutation
enforcement is claimed for absent APIs. Those workflows cannot be enabled until
the backend enforces them. Account profile ownership is tested separately.

## Verification Results

- React production build: PASS; no new package dependency required.
- Node unit tests: 10 PASS (inventory coverage, role matrix, routes, no prototype
  identity/unsafe HTML, token stores, DTO PUT contracts, 401/403 handling,
  validation/network/server errors, stale-session response protection).
- Maven verify: 8 PASS, 0 failures/errors, isolated H2 test database only.
  Includes all four role/API combinations, unauthorized access, account A/B
  isolation, attempted role/userId override, validation, password persistence,
  old-password rejection, JWT login and legacy auth redirects.
- Browser: real existing USER, ROOM_HOST, STAFF and ADMIN credentials; identity
  verified through `/api/auth/me`, reload and logout. No account data modified.
- Responsive targets: 1920x1080, 1440x900, 1366x768, 1280x800, 1024x768,
  768x1024, 390x844; table-to-mobile and drawer behavior checked.
- Final browser run: 210 viewport checks, 56 denied route checks, 0 horizontal
  overflows, 0 JS exceptions, 0 internal network failures, 0 external failures.
- Login/register validation, auth viewports and rejected-token checks passed.
  The rejected token produces an expected 401 and clears browser storage.
  Final machine-readable results are saved with the screenshots.
- Runtime uses existing Vite at http://127.0.0.1:5173, proxying the existing
  MySQL-backed Spring Boot instance at localhost:8081. Neither existing backend
  process nor the database service was stopped or reconfigured.
- Browser results/screenshots are in the task visualization directory under
  `portal-migration/`; source script can reproduce them using CHECK_OUTPUT.
- Visual spot checks inspected Staff verification desktop and profile mobile.
  Home background image was explicitly decoded (1600x2133) and inspected in
  `home-image-checked.png`; screenshot checks now wait for primary image decode.
  Full pixel-diff visual regression against every original screen is NOT done.

## Remaining Work In Order

1. Agree backend DTO/lifecycle/ownership/assignment contracts for missing APIs.
   In particular, resolve support status/assignment and individual-room model
   conflicts; do not invent schema changes to satisfy prototype fields.
2. Complete Public/User search, details, saved rooms, viewing requests, community,
   services and notifications using real APIs and backend publication rules.
3. Complete Host property registration/edit, uploads, room types/rooms and
   availability, viewing requests, assistance and recipient notifications.
4. Complete Staff queues, document authorization, separate verification/listing
   decisions, community moderation, assigned assistance and audit history.
5. Complete Admin statistics, accounts, assignment and audit via Admin-only APIs.
6. Finish per-screen original design parity, domain validation and modals,
   keyboard/tab interactions, map assets, all loading/error/empty data paths.
7. Test mutations and persistence, Host A/B and Staff A/B isolation, direct API
   IDOR, approved-only public content and full navigation/visual regression.

Until these are complete, overall migration status remains IN PROGRESS/BLOCKED,
not complete. No prototype folder should be deleted.
