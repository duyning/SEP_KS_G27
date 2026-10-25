# Host Viewings: Database Integration

## Data source

- React route: `/host/viewings`.
- Authenticated read endpoint: `GET /api/host/viewings`.
- Ownership is derived from the authenticated user, never an owner ID query parameter.
- Returns owned properties, pending registration count, and all owned viewing bookings, not only the dashboard's latest five.
- No sample properties or bookings are inserted into MySQL or used as a frontend fallback.

## States

- No property and no pending registration: screenshot-aligned house icon, registration heading and button to `/host/property/new`.
- Pending registration: pending review notice and property navigation.
- Existing property without bookings: empty viewing request list.
- Existing bookings: database records, status/search/appointment-date filters, ordering and details.
- Server/network errors: error and retry, never a false no-property state.
- Property query outside the returned owned list: access-safe error.
- Loading is distinct from an empty response.

The database enum `APPROVED` is displayed as confirmed. Confirm/reject actions remain disabled because write APIs have not been implemented; there are no fake success updates.

## Verification

- Maven verify: 18 tests passed, including owner isolation, permission checks, pending state and a seven-booking full list.
- Frontend: 25 tests passed; production build passed with the existing large-bundle warning.
- `scripts/check-host-viewings.cjs`: real authenticated MySQL response verified as empty; browser-only intercepted alternatives cover error/retry, pending, empty requests, details, escaped note text, filters and an inaccessible property query. Interception does not write database records.
- Desktop/mobile widths: 1920, 1536, 1440, 1366, 1024, 768, 390. No horizontal page overflow or browser runtime errors.
- Development frontend: `http://127.0.0.1:5173/host/viewings`; development API on 8081. The user's IntelliJ backend on 8080 was not stopped.
