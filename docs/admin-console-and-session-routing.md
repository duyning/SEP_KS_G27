# Admin console and account switching

## Pages and data

The `/admin` portal uses authenticated database APIs. It contains the dashboard,
account directory (`?view=accounts`), assignment monitoring (`?view=assignment`),
and moderation log (`?view=activity`). Search, role filters, and pagination run
on the server and persist in URL parameters. Errors never become sample data.

New GET endpoints: `/api/admin/dashboard`, `/api/admin/accounts`,
`/api/admin/assignments`, and `/api/admin/activity`. Controller and service both
require an active Admin. Responses use explicit DTOs/projections and exclude
password hashes, private registration payloads, and document contents.

Account and assignment screens are read-only. They do not grant roles, assign
staff, or approve property applications. Moderation history is not a complete
authentication/security audit log.

## Login and logout

Default destinations are Admin `/admin`, Staff `/staff`, Host `/host`, and
Member `/`. An authorized deep link can be resumed after login. External,
unknown, authentication, and unauthorized return targets are discarded.
Authenticated visitors to another role's portal return to their own landing page.

Explicit logout clears both token stores immediately and discards the previous
protected return destination. Session version/token checks prevent old bootstrap,
profile, or logout responses from overwriting a newer login. Portal/toast state
resets when the account identity or role changes.

## Verification

- Backend suite: 119 tests, zero failures/errors; isolated H2 test database.
- Targeted frontend suite: 16 passing tests for auth, role destinations, Staff
  requests, and supplement requests.
- Production frontend build passed (existing large-bundle warning remains).
- `frontend/scripts/check-admin-and-role-login.cjs`: browser API mocks cover
  four roles, delayed old logout response, forbidden portal API suppression,
  filters/pagination, error/retry/empty states, and mobile navigation.
- Admin checked at 375, 768, 1024, and 1440 CSS pixels and a zoom-equivalent
  narrow viewport. Production MySQL data was not modified by these checks.

Restart Spring Boot after updating source to expose the new Admin endpoints.
