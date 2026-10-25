# Physical Rooms

## Data and API

- Added a separate Room entity/table with property and room-type foreign keys. Unique `(property_id, room_number)` protects room numbers in each property.
- GET `/api/host/rooms?propertyId=&roomTypeId=` returns actual owned properties, room types and rooms. Invalid/foreign filters return errors instead of fake empty data.
- POST `/api/host/rooms` accepts an existing roomTypeId, roomNumber, floor, VACANT/OCCUPIED status and nullable customPrice. Ownership/property approval are checked on the server. Body-supplied ownership is never trusted.
- PUT `/api/host/rooms/{id}` updates owned rooms, including actual status. DELETE requires ownership and a confirmation dialog; occupied rooms cannot be deleted. Bookings are not deleted or automatically converted into occupancy changes.
- Owner locking plus the database uniqueness constraint handles simultaneous submissions. Room numbers are trimmed/uppercased and limited to 30 letters/digits/spaces/dots/hyphens/underscores. Floor is required and limited to 50 characters. Optional custom rent is an integer from 1 to 999999999 VND.
- Without a custom price, rent is read dynamically from the linked room type. Area, capacity, deposit and amenities also come from that type. Missing legacy values display as unavailable, never NaN. A type without valid rent requires an explicit valid custom price.
- Type deletion is blocked while physical rooms are linked. Room-type statistics/details, property statistics and host dashboard room counts now use the physical Room records.
- `confirmedAt` is updated when the owner saves the actual room state. The confirmation-needed count identifies rooms with no confirmation; no unrequested expiry/SLA interval is invented.

## UI

- Reference-style property heading, four metrics, search, room-type/floor/status filters, sorting and switchable cards/table.
- Add-room modal only offers room types returned by the owner's API. Inherited information, required room number/floor, actual-status radios and optional custom rent follow the reference.
- Successful persistence shows a toast and updates the actual list and totals. Reload fetches persisted data. Error/cancel does not invent successful saves. Form controls lock during submission.
- Missing property, pending profile, missing room types, no rooms, unmatched filters and network errors remain separate states. No production sample rooms are added.
- Type detail modal now displays only its own linked physical rooms instead of a hard-coded empty row.

## Verification

- 55 frontend tests and 39 backend tests pass. Backend writes use isolated H2 only.
- Backend coverage: existing/foreign type ownership, required fields, custom and inherited values, reloads, duplicate numbers and concurrent submissions, inactive properties, room-type deletion protection, manual status changes, occupied deletion protection and counts across related pages.
- `scripts/check-host-rooms.cjs`: add/validation/failure/retry, inherited values without NaN, optional custom rent, reload, table/card switching, filters, status update/delete safeguards and 9 viewport checks at 1536/768/390 pixels. Browser API calls are intercepted; no real MySQL rooms are created by the checks.
- Frontend: http://127.0.0.1:5173/host/rooms. Codex backend: 8081. IntelliJ backend: 8080 remains untouched.
