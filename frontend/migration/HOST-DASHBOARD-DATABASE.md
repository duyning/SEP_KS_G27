# Host Dashboard Database Integration

- `/host` no longer imports or falls back to prototype fixtures.
- `GET /api/host/dashboard` is implemented with existing JPA entities and tables.
  It reads only properties, room types, bookings and pending property registrations
  belonging to the authenticated principal. No owner ID from the client is used.
- Access: ROOM_HOST/ADMIN, enforced by Spring Security and method authorization.
- Confirmed empty properties plus no pending registration show original HTML
  onboarding: welcome message, three steps, first-property registration button.
- Pending registrations show a pending-review state instead of prompting another
  first registration. Actual populated data render from response DTO fields.
- Loading, malformed data, network errors and server errors never become an empty
  property list. The page offers refresh/retry and cancels requests on unmount.
- No individual-room entity exists, so available room count is unavailable rather
  than fabricated. No table, column or MySQL configuration changed.
- The supplied `.h2d` is a binary design export and could not be directly decoded.
  Visual reference used: `Code/html/host-dashboard.html` onboarding section and
  original `Code/css/host-dashboard.css`. PNG/HTML is needed to compare the export.
- Other Host modules retain their prior integration status; this change does not
  claim to replace fixtures or implement mutations across every Host page.

## Verification

Maven: 12 tests pass, including four new Host Dashboard tests on isolated H2:
empty data, pending registration, Host A/B isolation, and role enforcement.
Frontend: 20 unit tests pass, including real endpoint/DTO and failed response
handling. Production build passes (existing >500 KB bundle warning remains).

Browser: real MySQL response 200 for the existing host account, 0 properties and
0 pending registrations. Registration navigation works. Seven viewports checked:
1920, 1536, 1440, 1366, 1024, 768, 390. Empty, retry/error, pending and populated
response paths are tested; non-real responses exist only in browser tests.
No property/sample data were inserted into MySQL during verification.

Reproduce with `scripts/check-host-dashboard.cjs` (Playwright and Edge required).
Artifacts: task visualization folder `host-dashboard-database/`.

Updated background backend is on 8081; the pre-existing IntelliJ instance on 8080
was not stopped. Restart Spring Boot from IntelliJ to load the new controller
when using port 8080. The Vite instance at 5173 currently proxies port 8081.
