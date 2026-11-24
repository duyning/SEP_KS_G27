# Google sign-in and live backend verification

## Current state

- The existing `POST /api/auth/google` verifies the Google ID token for native and web sign-in. The Expo Go browser flow uses `/api/auth/google/mobile/*` and the same account rules and database schema.
- Mobile Google sign-in uses the same AuthSession path as password login. SecureStore persists the HL-RCS JWT returned by the backend. The backend supplies the profile and role.
- Development builds use the native Google SDK. Expo Go uses the system browser and an eight-digit confirmation code when the HTTPS browser origin is configured.
- Expo web uses the official Google Identity Services button. Its credential is POSTed to the same backend endpoint. Closing the chooser does not create a session. No client secret belongs in the app.

## Already tested against the real backend

Backend: `http://192.168.10.148:8081` (Wi-Fi IP configured in `.env.local`).

The actual mobile auth service passed password login, authenticated `/api/auth/me`, logout, and rejection of an invalid Google ID token with HTTP 401. Tokens were kept in memory during this test and not printed or written to disk. This is a real backend test, not a mocked HTTP response. A seeded local account was used without changing it.

The backend's existing `GoogleAuthTests` passed 3 tests on its isolated H2 test profile, including locally signed verification fixtures. Those fixtures are not Google-issued production credentials. A real Google account chooser/sign-in was not tested because native platform OAuth credentials and a development build are not available.

## Configure for a native development build

1. In the same Google Cloud project as the existing Web Client ID, create an iOS OAuth client with the app's actual bundle identifier and/or an Android OAuth client with its actual package and signing SHA-1. Register every signing certificate used for debug/development/release. Do not replace the backend audience with the iOS or Android client ID.
2. Keep `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` identical to backend `app.google.client-id`. The existing Web Client ID has been copied to `.env.local` and `.env.example`; it is public configuration.
3. For iOS set `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` and `HLRCS_IOS_BUNDLE_ID`. `app.config.ts` derives the reversed client URL scheme and applies the Google config plugin only when the real iOS client ID exists. No made-up client ID or URL scheme is installed.
4. For Android set `HLRCS_ANDROID_PACKAGE` to the package registered with Google Cloud. Native autolinking provides the SDK; this project does not use Firebase or require a Google client secret.
5. Create a development build using the Expo workflow, then start Metro with `npx expo start --dev-client --clear`. Adding this native SDK requires rebuilding the installed app; reloading Expo Go cannot supply it. iOS builds require EAS or macOS/Xcode; Android can use a configured Android toolchain or EAS. EAS project/signing setup has not been performed or charged.

The backend deliberately rejects an existing password-account email that has not been linked to a Google subject (HTTP 409). The mobile app displays that backend error; it does not bypass the rule or silently merge accounts.

## Test in Expo Go now

1. Add the HTTPS origin serving the browser login to **Authorized JavaScript origins** of the same Google Web Client ID used by Spring Boot. Use the origin without a path.
2. Proxy `/api/auth/google/mobile/*` on that HTTPS origin to the same Spring Boot instance serving the phone (port 8081 for local development). All steps for an attempt must reach that instance because attempts are held in memory and expire after five minutes.
3. For local development on Windows, stop the old Expo terminal and run this from `mobile`, substituting your registered origin:

   ```powershell
   npm run dev -- -GoogleBrowserOrigin https://login.example.com
   ```

   The launcher saves the origin in `mobile/.env.local` and applies it to the mobile API. Later runs can use `npm run dev`. Outside this launcher, set `GOOGLE_MOBILE_BROWSER_ORIGIN` on Spring Boot and `EXPO_PUBLIC_GOOGLE_BROWSER_ORIGIN` in the app.
4. Tap **Tiếp tục với Google**, select an account in the system browser, then enter the eight-digit confirmation code back in HL_RCS.

The browser page and app each receive a separate part of the confirmation. A code is consumed once and the Google credential is verified on the backend with the matching nonce. Local HTTP over Wi-Fi remains available for password login.

## Expo web

Use a browser origin registered in Google Cloud Authorized JavaScript Origins and allowed by backend CORS. The current backend permits `http://localhost:5173` and `http://127.0.0.1:5173`; it does not allow arbitrary Expo ports. The existing web frontend was already using port 5173 during verification and was left running. To run Expo web on that port, free it yourself first, or explicitly configure another allowed origin in both Google Cloud and backend. HTTPS or localhost is required by Google Identity Services. This work did not change CORS or stop the existing web application.

## Commands

```powershell
npm run typecheck
npm run lint
npm run test:auth
npm run test:google
npm run test:listings
```

Live service smoke check (uses an existing account; no token logging): set `HLRCS_TEST_EMAIL` and `HLRCS_TEST_PASSWORD`, optionally `HLRCS_TEST_API_URL`, then run `node scripts/check-auth-backend.cjs` in an environment that can reach the host backend.

Backend verification: `.\mvnw.cmd -Dtest=GoogleAuthTests test` from the repository root. Logs from this run are in `logs/mobile-google-auth-tests.log`.

## Files changed

- `src/services/auth.ts`: Google exchange and Google AuthSession action.
- `src/context/auth-context.tsx`: shared signInWithGoogle method.
- `src/services/google-sign-in.ts`: native credential acquisition, Expo Go/config guards, cancellation/error handling and local SDK sign-out.
- `src/components/auth/login-view.tsx`: Google option, shared error and submission guards.
- `src/components/auth/google-sign-in-button.tsx`, `.web.tsx`, `google-sign-in.types.ts`: native/Expo Go status and official web identity button.
- `app.config.ts`: optional real iOS scheme and native identifiers.
- `.env.local`, `.env.example`: public OAuth configuration.
- `package.json`, `package-lock.json`: native SDK and test command.
- `tests/auth.test.ts`, `tests/google-sign-in.test.ts`: API/session and native guard regression tests.
- `scripts/check-auth-backend.cjs`: real backend smoke check without exposing credentials or JWTs in output.

No private Google account was used, no Google account was created/linked, and no real OAuth client configuration was invented.

Sources: https://docs.expo.dev/guides/google-authentication/ and https://react-native-google-signin.github.io/docs/setting-up/expo .


Development-build prerequisite: install Expo Dev Client with `npx expo install expo-dev-client` before following the Expo development-build guide. It has not been added to the current Expo Go setup. The current task installed the Google SDK and prepared conditional configuration only; no signed native build was created.

Verification totals: 22 auth tests + 4 Google native/config guard tests + 7 listing tests passed. The existing backend GoogleAuthTests passed 3/3 against H2. Typecheck, lint and Expo public config resolution passed. Real mobile-service HTTP smoke test passed against the existing backend, including rejected invalid Google token. No actual Google account login on a device has been verified.


Final bundle verification: `npx expo export --platform all --output-dir .expo/google-build-review` completed successfully for Android, iOS and web. This verifies bundling, not Google Cloud setup or native account sign-in. The Hermes compiler needed host execution because sandbox temp-file permissions prevented bytecode output; application source did not need a workaround.

