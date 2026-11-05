# Google Maps integration — 06/11/2026

The shared canvas now uses the official Google Maps JavaScript SDK when
`VITE_GOOGLE_MAPS_API_KEY` is present and `VITE_MAP_PROVIDER` is not `osm`.
No Google tile URL is embedded in Leaflet. Google uses AdvancedMarkerElement,
price pins, React Router popup links, native zoom/fullscreen and native POIs.
The Animate UI buttons switch between roadmap and hybrid (satellite + labels).
Native POI visibility depends on Google's zoom and map data; this does not
perform Google Places searches or promise every nearby business is shown.

The adapter is shared by search, property detail, registration/edit and staff
verification. Staff/detail markers remain read-only. The removed host overview
map stays removed. Address autofill still uses the existing backend resolver;
this change does not enable Google Geocoding or Places billing.

## Local configuration

The supplied key is stored only in ignored `frontend/.env.local`. Vite browser
keys are visible in the browser bundle/requests; ignoring the file prevents Git
publication, not browser visibility. Restrict the key in Google Cloud.

```dotenv
VITE_MAP_PROVIDER=auto
VITE_GOOGLE_MAPS_API_KEY=<your restricted browser key>
VITE_GOOGLE_MAPS_MAP_ID=DEMO_MAP_ID
```

Use a production map ID for deployment. Restart Vite after environment changes.
`VITE_MAP_PROVIDER=osm` explicitly disables the Google adapter.

Check the key's project in Google Cloud:

1. Enable **Maps JavaScript API** and verify its billing/quota state.
2. Restrict the browser key to that API and the website HTTP referrers.
3. Allow the local origin being used, e.g. `http://127.0.0.1:5173/*` and
   `http://localhost:5173/*`. Test port 5174 needs its own allowed entries.
4. Reload and inspect the Google error code. Do not disable restrictions broadly
   as a workaround. Rotate the key shared in chat before production use.

Official setup: https://developers.google.com/maps/documentation/javascript/get-api-key

Error guide: https://developers.google.com/maps/documentation/javascript/error-messages

## Actual result and limits

On the real local origin `http://127.0.0.1:5173`, the SDK loaded, but the map
displayed Google's error overlay and the console returned `Permission Denied.`
No more specific Google key/billing/referrer error code was returned in this
test. The exact Cloud configuration cause is therefore unconfirmed. Satellite
imagery and real Google POIs have **not** been verified successfully.

With the same real Google connection on the app's `/map` route, Google failure
automatically switched to OSM: one price marker and 20 loaded OSM tiles, no page
JavaScript errors. Room API data in this check was a fixture; Google SDK and OSM
tile requests were real. The adapter handles late auth failures, Google error
overlays, SDK failures and a 20-second initial tile timeout. It preserves parent
form/selection state and releases map listeners on fallback/unmount.

`frontend/scripts/check-google-maps.cjs` uses a **mock SDK** with fixture API data:
price popup/router link, card focus, map/hybrid switch, keyboard, click/drag pin,
late-auth fallback and preservation of address/location/selection passed.
Widths 375/768/1024/1440 passed. At 200% zoom the map controls remained usable;
the existing page navigation overflowed horizontally, so a full-page zoom pass
is not claimed. Reduced motion was enabled for the adapter browser checks.

26 related frontend unit tests and production build passed. The build retains
the existing large-chunk warning. No backend logic or Cloud settings changed.
