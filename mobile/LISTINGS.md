# Mobile listings and room-type detail

Home cards represent RoomType, identified by propertyId + roomTypeId. They do not identify an individual Room. The detail screen therefore shows the selected room type, its availability count, and other public room types in the same property. No individual-room route or endpoint is fabricated.

## Navigation

- Home > featured “Xem tất cả” / “Tất cả” > existing `/explore` tab.
- Home / Explore / another room type > `/rooms/[roomTypeId]?propertyId=...`.
- Detail is in the root Stack above `(main)`, so native bottom tabs are absent while the booking bar is visible.
- Explore stays mounted during detail navigation, preserving search, filters and scroll state.
- The original NativeTabs structure, colors and sizing are preserved; the explore label is now Tìm phòng with a search icon. Web tab horizontal padding is reduced from 32px to 16px to prevent the original tab row overflowing a 320px viewport.

## API contracts

- `GET /api/properties/search`: page/size, q, price, sort, type, location, amenities, availableOnly. Search is debounced 350ms; page size is 15 (backend supports 1–50). Filters and sorting run on the server. Load-more merges by roomTypeId, locks duplicate requests, supports retry, and cancels obsolete/unmounted requests.
- `GET /api/properties/{propertyId}/room-types/{roomTypeId}/details`: summary, room gallery, descriptions, amenities, costs, approved public contact, mapUrl and related roomTypes.
- `GET /api/favorites/state`: batches at most 50 IDs. `POST /api/favorites`, `DELETE /api/favorites/{id}`: existing bearer-token contract, optimistic rollback and a lock per room type. Refetch on screen focus keeps Home/Explore/Detail consistent.
- `POST /api/viewings`: propertyId, roomTypeId, scheduledDate (Vietnam local time), contactName, contactPhone, optional note. Requires USER or ROOM_HOST, matching backend policy. Client validates the date/phone; backend remains authoritative for ownership, conflicts, publication and scheduling rules. The UI displays the status actually returned by the backend, including an existing request returned by an idempotent retry; sending a request does not itself confirm a booking.

Missing optional data is hidden. Contacts come only from publicContact; no account phone is exposed. External map action opens backend mapUrl; no map provider/key/GPS dependency was added. Share uses native text sharing without inventing a public website or deep-link URL. Gallery supports paging and fullscreen; pinch zoom is not implemented. There is no individual Room detail API in this flow, so the UI labels availability by room type.

## Layout and interactions

The booking bar is a normal flex sibling of ScrollView, reserving its own actual height even when font scaling wraps the CTA. Only the bar consumes bottom safe area. Explore lets NativeTabs manage native content insets, with 24px visual list spacing. No second tab bar is created.

Reuses RoomCard, HomeSearchBar, FilterBottomSheet, HomeSkeleton, HomeErrorState, AnimatedPressable and existing motion/haptic tokens. Cards scale to 0.98; hearts use the existing spring; gallery transitions respect Reduce Motion. Favorite buttons stop event propagation. Modal transitions respect Reduce Motion. No animation dependencies were added. Installed skill directories were checked; animate-ui and expo-animation were not present.

## Changed files

- src/app/(main)/home.tsx
- src/app/(main)/explore.tsx
- src/app/_layout.tsx
- src/app/rooms/[roomTypeId].tsx (new)
- src/components/app-tabs.web.tsx (horizontal padding only)
- src/components/home/room-card.tsx
- src/components/home/home-feedback-states.tsx (retry accessibility label)
- src/components/home/home-search-bar.tsx
- src/components/home/home-categories.tsx (supported backend filter IDs)
- src/components/home/filter-bottom-sheet.tsx (supported values, type/location and area sort)
- src/components/listings/property-image-gallery.tsx (new)
- src/components/listings/viewing-sheet.tsx (new)
- src/hooks/use-listings.ts (new)
- src/hooks/use-listing-favorites.ts (new)
- src/services/accommodations.ts
- tests/accommodations.test.ts (new)
- scripts/check-listings.cjs (new)
- package.json (test:listings script)

## Running and checks

From the mobile directory:

```powershell
npm run typecheck
npm run lint
npm run test:auth
npm run test:listings
npx expo start --clear
```

Set EXPO_PUBLIC_API_URL in .env.local to the reachable Spring Boot host:8081. Start backend/MySQL separately and put the phone on the same reachable network. Restart Expo after changing the environment.

Browser regression helper uses Edge headless and API fixtures only; it never writes to a real backend. Start Expo web on port 8092, set PLAYWRIGHT_MODULE to the installed Playwright package if needed, then run `node scripts/check-listings.cjs`. Fixtures exist only in tests, never in application components. Screenshots go to ignored `.expo/listing-review`.

Native iOS/Android Safe Area, gestures, device font scaling, phone/Zalo/map/Share handlers, and real authenticated viewing/favorite integration still require device/backend verification. The configured backend was unreachable during implementation. Browser fixture checks are not proof of real backend writes.


## Verification results

- TypeScript typecheck passed.
- ESLint passed.
- 7 accommodation API contract/cancellation/date tests and 18 existing auth tests passed.
- Expo web export completed successfully during implementation.
- Browser fixture regression covers Home > Detail > Back > Explore > Detail, fullscreen gallery, server search/filter parameters, second-page loading without duplicate requests, state preserved on Back, and responsive document width at 320, 360, 390 and 430px.
- Loading/error/empty/retry UI uses the same API boundary; no real backend writes were made.


Final browser fixture run passed, including empty/error/retry through in-app search (7 search requests). The intentional HTTP 500 fixture produces an expected console resource error. Browser development reload of /explore intermittently hit Expo Metro SSR 'Requiring unknown module 857'; in-app navigation and the earlier web export passed. No Expo SDK/config change was made to work around this dev-server issue.


## Tìm phòng refinement

Changed in this refinement:

- `src/components/app-tabs.tsx`: explore label → Tìm phòng; Feather search template icon; route and native tab styling unchanged.
- `src/components/app-tabs.web.tsx`: same label; tighter existing gaps to fit the longer label at 320px without overflow.
- `src/app/(main)/home.tsx`: `navigate('/explore')` selects the existing tab.
- `src/app/(main)/explore.tsx`: root header Tìm phòng trọ / Hòa Lạc, Hà Nội; no Back; header/search/chips/results moved into FlatList's header so the outer vertical list receives native tab insets. No manual tab-height guess or duplicate bottom safe area. Compact card and skeleton; existing search/filter/pagination/favorite hooks retained.
- `src/components/home/room-card.tsx`: new compact variant with a 112px-wide image, 144px minimum image height, room type as primary title, property/address as secondary text, separate price/facts, and one availability count per room type. No property grouping or removal of distinct IDs. Card content can grow at large system font scales; image width decreases to 88px above 1.3 fontScale. Existing Home featured/editorial layouts remain available.
- `src/components/listings/compact-room-skeleton.tsx`: matching three-row loading placeholder; no fake listing data.
- `src/app/rooms/[roomTypeId].tsx`: rent omitted from the extra-cost table (still in overview and sticky CTA); empty cost section hidden; identical normalized descriptions shown once; room/common amenities deduplicated; short area in overview and complete address in location; other room types use compact cards.
- `scripts/check-listings.cjs`: updated card locators, root header/Back checks, and guest favorite guard check.

Verified: typecheck, lint, 18 auth tests, 7 accommodation tests, browser fixture navigation/search/filter/pagination/gallery/empty/error/retry and guest favorite guard. Browser screenshots inspected at 320/360/390/430px; no document horizontal overflow. Approximately three compact cards fit the 844px-high reference viewport. This is browser fixture coverage, not a claim of native device or live backend verification. Native font scaling, Dynamic Island/Home Indicator and Android gesture/three-button navigation still require device verification.
