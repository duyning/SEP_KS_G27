# Final integration checkpoint — 2026-11-20

Branch: `integration/final-merge`, created from `origin/main` (`7e6ad876`).
Approved feature branches: DuongND, DungDT, NingDD, MaiNTT, VietNV.
Main and the remote feature branches have not been modified.

## Safety backups

- Main backup stash: `f24c2decdfe82498a82d15716fae0cd52fdd644b`, named `backup-before-final-integration-2026-11-20`.
- Separate stash: `backup-integration-vite-cache-2026-11-20`.
- Original older stash retained. Do not pop any backup into this branch during integration.
- The pnpm cache had a junction into frontend. Stash cleanup traversed it; tracked files were recovered from HEAD, ignored `.env.local` recovered from the saved stash, and the junction itself removed without recursively deleting its target. Dependencies were reinstalled. Cache directories are now ignored to prevent another traversal.

## Merge order and current state

1. **origin/DuongND** (`3038405c`): merged with `--no-ff`; no merge conflicts. Community reporting and mobile moderation retained.
2. **origin/DungDT** (`f7bd2f6c`): merged with `--no-ff`; 76 overlapping files reconciled.
3. **origin/NingDD** (`4fac7f0c`): foundational availability, reverification, maps/onboarding/mobile integrated before the dependent AI/search branch.
4. **origin/MaiNTT** (`9325b949`): AI recommendations, assistant, origin/distance search integrated with prior inventory/onboarding.
5. origin/VietNV (`4aea39ea`): not merged yet.

`origin/DuongND-service-ui` is already an ancestor of origin/main and does not need a separate merge.

## Validation after DuongND

- Tracked source scanned for actual conflict markers (`<<<<<<<`, a standalone `=======`, `>>>>>>>`): none.
- Frontend tests: **212 passed / 212**.
- Frontend Vite production build: **passed**; existing large-chunk warning remains.
- No frontend lint script is configured in package.json.
- Backend: **179 passed / 179**, no skipped tests, after the user authorized execution outside the sandbox. H2 only; the earlier loopback restriction is resolved for validation.
- First checkpoint now satisfies build/test/conflict checks. Continuing the remaining approved branches.

## Compatibility fixes made before the next merge

- Regenerated npm package-lock.json using npm install because the pre-existing lockfile did not match package.json; no package.json dependency declarations were removed.
- Updated the routing migration inventory assertion to include the three later host-registration pages and the existing `merged` integration status; retained role, legacy-target and unsafe-HTML checks.
- Profile logout test now checks both the delegated runtime handler and the actual prototype template containing the button.
- GoogleMapCanvas creates its static SVG marker with SVG DOM APIs instead of innerHTML; marker functionality retained.
- Disabled footer placeholders with no destination are rendered as disabled link spans instead of navigation to `#`; existing real links retained.
- Ignored pnpm/Vite/Python caches. No application secrets or environment overrides were committed.

## Resume

Backend integration tests with local loopback access are authorized. Continue the remaining branches in order. Inspect overlapping files and resolve both sides' business logic at each merge; regenerate conflicting lockfiles from the combined package.json. Run build/tests/conflict scan after each branch and record results here. No force push, no merge into main, and no automatic publication of this integration branch.

## Validation and conflict resolution after DungDT

- Frontend: 219/219 tests passed; Vite production build passed (existing chunk-size warning).
- Backend: 190/190 tests passed, no failures/errors/skips, isolated H2 (`integration-02-backend.log`).
- No unresolved conflict markers. No lint script exists.
- Combined service requests, cancellation, price units, multiple/custom coverage areas, ratings/media and service complaints with existing reporting and service review access rules.
- SecurityConfig unions public service image/rating reads with existing public endpoints; StaffService keeps property verification authorization, scoped staff history and complaint statistics.
- App/main/layout/router preserve session guards, keyed toast lifetime, motion styles, host header targets, modern public page shells and all routes; add design-system styles, shared UI controls, dynamic titles and service complaint navigation for staff/admin.
- Service catalog retains slug aliases, accent-insensitive search, price/name sorting and bounded pagination while adopting new service domain workflows. Area filtering includes custom and all-area providers. Registration retains document upload/supplement, validation, abort guards and duplicate-submit prevention; documents are optional under the incoming backend policy, still capped at five.
- Common Modal retains keyboard/focus/backdrop behavior; Pagination retains bounded page ranges. Toast gains actionable notices. StatusBadge combines incoming semantic styles with reporting HIDDEN state.
- Other overlapping live pages and styles retain API/auth/report behavior and responsive/motion fixes, with incoming shared Button/Field primitives and accessible action colors. Older prototype implementations were not substituted for working live flows.
- Registration test updated for optional documents while retaining file-limit and other validation assertions.

Files that had conflicts in this merge:
- `.gitignore`
- `frontend/src/App.jsx`
- `frontend/src/components/OpenStreetPropertyMap.jsx`
- `frontend/src/components/PortalUI.jsx`
- `frontend/src/components/PropertyAddressLookup.jsx`
- `frontend/src/components/PropertyLocationMap.jsx`
- `frontend/src/components/RoomEditorModal.jsx`
- `frontend/src/components/RoomTypeCreateModal.jsx`
- `frontend/src/components/RoomTypeDetailModal.jsx`
- `frontend/src/components/ServiceRegistrationModal.jsx`
- `frontend/src/components/ServicesCatalog.jsx`
- `frontend/src/components/StaffUI.jsx`
- `frontend/src/components/common/Modal.jsx`
- `frontend/src/components/common/Pagination.jsx`
- `frontend/src/components/common/StatusBadge.jsx`
- `frontend/src/layouts/PortalLayout.jsx`
- `frontend/src/main.jsx`
- `frontend/src/pages/AuthPage.jsx`
- `frontend/src/pages/ProfilePage.jsx`
- `frontend/src/pages/admin/AdminDashboardPage.jsx`
- `frontend/src/pages/host/HostDashboardPage.jsx`
- `frontend/src/pages/host/HostNotificationsPage.jsx`
- `frontend/src/pages/host/HostPropertyCreatePage.jsx`
- `frontend/src/pages/host/HostPropertyEditPage.jsx`
- `frontend/src/pages/host/HostPropertyPage.jsx`
- `frontend/src/pages/host/HostRoomTypesPage.jsx`
- `frontend/src/pages/host/HostRoomsPage.jsx`
- `frontend/src/pages/host/HostSupportPage.jsx`
- `frontend/src/pages/host/HostViewingRequestsPage.jsx`
- `frontend/src/pages/public/BookingsPage.jsx`
- `frontend/src/pages/public/CommunityPage.jsx`
- `frontend/src/pages/public/DetailPage.jsx`
- `frontend/src/pages/public/FavoritesPage.jsx`
- `frontend/src/pages/public/HomePage.jsx`
- `frontend/src/pages/public/MapSearchPage.jsx`
- `frontend/src/pages/public/NotificationsPage.jsx`
- `frontend/src/pages/public/SearchPage.jsx`
- `frontend/src/pages/staff/StaffAssistanceRequestDetailPage.jsx`
- `frontend/src/pages/staff/StaffAssistanceRequestsPage.jsx`
- `frontend/src/pages/staff/StaffCommunityModerationDetailPage.jsx`
- `frontend/src/pages/staff/StaffCommunityModerationPage.jsx`
- `frontend/src/pages/staff/StaffDashboardPage.jsx`
- `frontend/src/pages/staff/StaffPropertyVerificationDetailPage.jsx`
- `frontend/src/pages/staff/StaffPropertyVerificationsPage.jsx`
- `frontend/src/pages/staff/StaffServiceApplicationsPage.jsx`
- `frontend/src/routing/screens.js`
- `frontend/src/services/service-registration.js`
- `frontend/src/styles/admin-dashboard.css`
- `frontend/src/styles/auth.css`
- `frontend/src/styles/community.css`
- `frontend/src/styles/favorites.css`
- `frontend/src/styles/home.css`
- `frontend/src/styles/host-dashboard.css`
- `frontend/src/styles/host-notifications.css`
- `frontend/src/styles/host-property-create.css`
- `frontend/src/styles/host-property-edit.css`
- `frontend/src/styles/host-property-page.css`
- `frontend/src/styles/host-property-registration.css`
- `frontend/src/styles/host-room-availability.css`
- `frontend/src/styles/host-room-types-page.css`
- `frontend/src/styles/host-room-types.css`
- `frontend/src/styles/host-rooms.css`
- `frontend/src/styles/host-support.css`
- `frontend/src/styles/host-viewing-requests.css`
- `frontend/src/styles/host-viewings-page.css`
- `frontend/src/styles/map-search.css`
- `frontend/src/styles/notifications.css`
- `frontend/src/styles/portal.css`
- `frontend/src/styles/search.css`
- `frontend/src/styles/service-applications.css`
- `frontend/src/styles/service-detail.css`
- `frontend/src/styles/services.css`
- `frontend/src/styles/staff-dashboard.css`
- `frontend/src/styles/styles.css`
- `src/main/java/org/hlrcs/configuration/SecurityConfig.java`
- `src/main/java/org/hlrcs/service/StaffService.java`



## NingDD resolution checkpoint

- Union StaffService constructor dependencies: service complaints and combined host onboarding; existing property-verification access retained.
- PropertyAddressLookup adopts VIETMAP autocomplete/reverse and preserves Google-link/coordinate fallback, abort guards, accessible combobox and shared UI controls.
- RoomEditorModal keeps shared fields and adds occupied lease-date controls. RoomTypeCreateModal imports both shared fields and VND money input. HostRoomTypesPage combines shared controls and multi-floor setup.
- HostPropertyCreatePage combines new property type/description/photo guidance and identity reuse/onboarding rules with the existing shared fields and upload validation.
- PublicNavbar combines avatar/banner, keyboard/mobile behavior and shared Button. DetailPrototypeShell retains notification/favorites/dashboard layout while adding host registration banner, avatar and host property shortcut. PortalLayout retains all service/report/admin navigation.
- Staff verification detail combines onboarding identity/reverification data with shared controls. The queue uses the incoming inspection-first workflow: approval/rejection/supplement remain available in detail; stale quick-decision modal removed with its obsolete handlers. Adds the 48-hour waiting reminder.
- Existing favorite/public-photo/availability test fixtures now explicitly publish their intended public rooms, and occupied-state requests include required lease dates. Publication and document privacy rules were not relaxed.
- Frontend component-test loader bundles relative JSX dependencies; assertions reflect the current phone-verification/two-sided-identity form instead of removed legacy fields.
- Mobile dependencies installed from its existing lockfile; added CSS module declarations for strict type checking.
- Web: 245/245 tests, production build passed. Mobile: 88/88 tests, lint and typecheck passed. Live Gemini provider test is intentionally conditional on credentials; no external AI request is needed for integration validation.

Conflicted files:

- `frontend/src/components/PropertyAddressLookup.jsx`
- `frontend/src/components/RoomEditorModal.jsx`
- `frontend/src/components/RoomTypeCreateModal.jsx`
- `frontend/src/components/detail/DetailPrototypeShell.jsx`
- `frontend/src/components/layout/PublicNavbar.jsx`
- `frontend/src/layouts/PortalLayout.jsx`
- `frontend/src/pages/host/HostPropertyCreatePage.jsx`
- `frontend/src/pages/host/HostRoomTypesPage.jsx`
- `frontend/src/pages/staff/StaffPropertyVerificationDetailPage.jsx`
- `frontend/src/pages/staff/StaffPropertyVerificationsPage.jsx`
- `src/main/java/org/hlrcs/service/StaffService.java`
- Backend suite: 246 tests discovered; after publication/lease fixture updates, only the final photo fixture remained failing in that run. Its corrected PropertyAssignmentSecurityTests rerun passed 17/17. Combined current result: 245 passing, 1 intentional live-provider skip, zero remaining failures. Conflict-marker scan clear.


## MaiNTT conflict resolution

- AccommodationSummary includes distanceKm plus freshness fields. AccommodationService combines distance/radius/nearest and AI recommendations with public-only vacancy counts, batched covers used by host views, approved-coordinate parsing and the stricter publication policy.
- HostRoomsResponse/RoomMapping retain lease dates and publicVisible; StaffResponse/StaffService retain hostOnboarding and reverification fields; HostPropertyService only marks selected public inventory visible.
- HostRoomsService retains batch/multi-floor, lease and publication actions. PublicPropertyService keeps fail-closed reverification/publication checks.
- Independent reverification additions deduplicated in PropertyRegistration; duplicate AvailabilityNotice imports and repeated badges removed from cards/detail.
- Maps combine SDK error fallback/cleanup with safe SVG icon creation. Search/favorites/detail links preserve search origin, nearby-radius filtering and shared UI controls.
- Current host onboarding/identity reuse, phone OTP, description/photo guidance, dynamic banners, avatar, notification button and active booking navigation retained. Valid social/contact links from MaiNTT adopted.
- Availability and reverification UI retain the fuller responsive/accessibility behavior from NingDD; inspection-first staff queue and its reminder retained, with additional reverification tags. Approval/rejection/supplement remain in detail. Attachment sorting retained.
- Test isolation retained in Maven and application.properties: local MySQL import is only in the !test document; AI/map/phone provider property groups combined. No local credential file copied.
- package.json reconciled first (no dependency removed), package-lock regenerated with npm install --package-lock-only. Routing/logout tests combine inventory and authorization coverage; publication/lease fixtures retained.

Conflicted files:

- `docs/PROJECT_CONTEXT.md`
- `frontend/package-lock.json`
- `frontend/scripts/check-availability-confirmation.cjs`
- `frontend/scripts/check-property-reverification.cjs`
- `frontend/src/components/GoogleMapCanvas.jsx`
- `frontend/src/components/HostAvailabilityConfirmation.jsx`
- `frontend/src/components/ReverificationNotice.jsx`
- `frontend/src/components/detail/DetailPrototypeParts.jsx`
- `frontend/src/components/detail/DetailPrototypeShell.jsx`
- `frontend/src/pages/BecomeHostPrototype.jsx`
- `frontend/src/pages/ProfilePrototype.jsx`
- `frontend/src/pages/host/HostPropertyEditForm.jsx`
- `frontend/src/pages/public/FavoritesPage.jsx`
- `frontend/src/pages/public/HomeLandingPage.jsx`
- `frontend/src/pages/public/HomePrototype.jsx`
- `frontend/src/pages/public/SearchPage.jsx`
- `frontend/src/pages/staff/StaffPropertyVerificationDetailPage.jsx`
- `frontend/src/pages/staff/StaffPropertyVerificationsPage.jsx`
- `frontend/src/services/staff-verifications.js`
- `frontend/src/services/verification-detail.js`
- `frontend/src/styles/availability.css`
- `frontend/src/styles/reverification.css`
- `frontend/tests/host-logout.test.js`
- `frontend/tests/property-reverification.test.js`
- `frontend/tests/routing.test.js`
- `src/main/java/org/hlrcs/dto/response/AccommodationSummary.java`
- `src/main/java/org/hlrcs/dto/response/HostRoomsResponse.java`
- `src/main/java/org/hlrcs/dto/response/StaffResponse.java`
- `src/main/java/org/hlrcs/service/AccommodationService.java`
- `src/main/java/org/hlrcs/service/HostPropertyService.java`
- `src/main/java/org/hlrcs/service/HostRoomsService.java`
- `src/main/java/org/hlrcs/service/PublicPropertyService.java`
- `src/main/java/org/hlrcs/service/RoomMapping.java`
- `src/main/java/org/hlrcs/service/StaffService.java`
- `src/main/resources/application.properties`
- `src/test/java/org/hlrcs/AvailabilityConfirmationTests.java`
- `src/test/java/org/hlrcs/HostDashboardTests.java`
- Validation: web 247/247 tests and production build passed. Backend full run: 248 discovered, 1 conditional live-provider skip; final AI fixture selected an occupied seed instead of its vacant unit. After correcting that selector, all 14 AccommodationTests passed. Combined current suite: 247 passing / 1 intentional skip, zero remaining failures. Shared UI imports and conflict-marker scan clear.
