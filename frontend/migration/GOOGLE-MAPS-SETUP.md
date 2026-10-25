# Google Maps: Step 2 of Property Registration

## Local Configuration

Edit `frontend/.env.local` (ignored by Git):

```dotenv
VITE_GOOGLE_MAPS_API_KEY=YOUR_BROWSER_RESTRICTED_KEY
VITE_GOOGLE_MAPS_MAP_ID=YOUR_MAP_ID
```

The file already exists with an empty key. Restart the Vite dev server after filling it. Rebuild the frontend for a deployment: VITE variables are included at build time. Keep API_TARGET settings unchanged if already customized.

In Google Cloud, configure Maps JavaScript API and Geocoding API in the same project, then create a browser key restricted to Websites/HTTP referrers:

- `http://localhost:5173/*`
- `http://127.0.0.1:5173/*`
- Add the real HTTPS deployment domain when deploying.

Restrict API access to Maps JavaScript API and Geocoding API; set suitable quotas/alerts in the project's account. Follow Google's project/billing prerequisites. This change does not enable billing, create a cloud project or purchase services. Browser API keys are visible in the browser by design, so referrer/API restrictions are essential. Do not use an unrestricted server key. Do not send the key through chat or commit it to Git.

The map uses AdvancedMarkerElement. `DEMO_MAP_ID` is the default for local testing; use your own map ID when deploying.

## Behavior

- Empty key: preserve the existing OpenStreetMap map and manual address/coordinate entry. The app explicitly shows that Google Maps has not been configured. No Google requests are made with a blank key.
- Configured key: Google Maps click/drag updates actual coordinates. Pasting into the new address/link field starts geocoding; typing can use the Find Location button.
- A single result fills address, recognized business area and coordinates in one update, and moves the pin. Multiple results require choosing an address. Ambiguous/approximate geocodes carry a warning to verify the pin. No claim of guaranteed building-level accuracy is made.
- Zalo is a source of copied text only: there is no Zalo account integration or chat access. Labelled address lines and full Google links with query/place/coordinates are supported.
- Short maps.app.goo.gl links are not silently followed or fetched by the server. Open them in Google Maps and copy the full address/location link. A URL containing only `@lat,lng` is a map viewport, not a guaranteed property pin, and is rejected.
- If Google cannot map the result to the project's existing four Hòa Lạc areas, the area is left empty for manual selection. No district/commune, nearby landmark distance or coordinate is invented. Existing unrelated form fields/files stay in memory, including across focus/visibility rechecks.
- Search changes, manual location changes and unmounts invalidate late geocoding results. API errors leave existing address fields and coordinates unchanged.

## Official References

- https://developers.google.com/maps/documentation/javascript/get-api-key
- https://developers.google.com/maps/documentation/javascript/load-maps-js-api
- https://developers.google.com/maps/documentation/javascript/geocoding
- https://developers.google.com/maps/documentation/javascript/advanced-markers/draggable-markers

## Verification Limit

No real Google API key was supplied. Live Google geocoding/billing/authorized-domain behavior cannot be confirmed until the project owner adds a working restricted key. Automated UI checks use an isolated SDK double and do not contact Google's APIs or write MySQL registrations.
