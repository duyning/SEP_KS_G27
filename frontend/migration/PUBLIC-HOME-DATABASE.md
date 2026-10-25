# Home with published database listings

HomePage delegates to HomeLandingPage. Layout and colors follow the supplied teal/navy design. Cards, photos, prices, area counts, room counts and availability are read from `GET /api/public/properties`; there is no fixture fallback or database seeding.

Publication requires an ACTIVE property linked to an APPROVED registration with a readable submission and accepted terms. Pending/rejected/inactive registrations are not published. The public DTO omits account data, contact phone, registration JSON, identity documents and moderation history. Photo routes permit only `PHOTO_n` listing images or room-type images belonging to an eligible published property, with a JPEG/PNG/WEBP content-type allowlist. Revoking publication also revokes public image access.

Home filters the returned listings by area, price, property type and amenities. Cards load six at a time. Detail opens the same real property's photos, amenities, rules and room-type prices in a modal. Favorites on Home are explicitly saved on the current device, separate from account wishlist APIs. Unknown prices/photos display an explicit empty state. Numeric banners aggregate database records; fabricated testimonial cards were replaced with a three-step finding-a-room section.

Only the Home route gets the full-width layout, section navigation and redesigned footer; other public pages retain their existing layouts.

Checks: backend integration test covers anonymous reads, real vacant-room custom pricing, unapproved/inactive exclusions and denial of private documents; frontend unit tests cover filters and anonymous API requests; `scripts/check-public-home.cjs` covers pagination, filters, detail modal, local favorites, empty/error/retry states and desktop/mobile overflow. All browser fixtures are intercepted test responses, never inserted into MySQL.
