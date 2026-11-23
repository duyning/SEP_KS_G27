# Google Maps for public search and property registration

## Local Configuration

Edit `frontend/.env.local` (ignored by Git):

```dotenv
VITE_GOOGLE_MAPS_API_KEY=YOUR_BROWSER_RESTRICTED_KEY
VITE_GOOGLE_MAPS_MAP_ID=YOUR_MAP_ID
```

Reuse the browser key if it is already configured. Restart the Vite dev server after changing it. Rebuild the frontend for a deployment because VITE variables are included at build time. Keep API_TARGET settings unchanged if already customized.

In Google Cloud, configure Maps JavaScript API and Geocoding API in the same project, then create a browser key restricted to Websites/HTTP referrers:

- `http://localhost:5173/*`
- `http://127.0.0.1:5173/*`
- Add the real HTTPS deployment domain when deploying.

Restrict API access to Maps JavaScript API and Geocoding API; set suitable quotas/alerts in the project's account. Follow Google's project/billing prerequisites. This change does not enable billing, create a cloud project or purchase services. Browser API keys are visible in the browser by design, so referrer/API restrictions are essential. Do not use an unrestricted server key. Do not send the key through chat or commit it to Git.

The public search map and the property location picker use `google-map-react` with the shared SDK loader and browser key. Search renders React price pins at stored coordinates. The picker uses Google's AdvancedMarkerElement for a draggable pin and centers on the form's selected coordinates. `DEMO_MAP_ID` is the default for local testing. Use your own map ID when deploying the picker.

## Behavior

- Public search (`/map`): price pins use the coordinates returned for the current search results. Several room types at identical coordinates share a pin. Selecting a pin opens room names, prices, addresses and links to details. Selecting a room card centers the map. Invalid or missing coordinates are omitted.
- Public search and the location picker switch to OpenStreetMap when Google fails to load or rejects authorization. The picker continues to use the coordinates already entered in the form. Setting `VITE_MAP_PROVIDER=osm` forces the OpenStreetMap provider.
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

Automated UI checks run the installed `google-map-react` package with an isolated Google SDK double. They do not contact Google's APIs or write MySQL registrations. Confirm live authorization on an allowed referrer with the project's browser key.
