# Service listing and customer request handoff — 2026-11-14

Implemented on DungDT. This is source/test documentation, not a live MySQL inspection.

## Requirement audit

| Requirement | Implementation |
| --- | --- |
| View services / propose changes | `GET /api/service-registrations/services` returns the owner's approved snapshots; existing multipart changes enforce ownership, active capability and service revision. |
| Review listing changes | Staff detail includes `currentListing` for price, description, area and name comparison. Existing review applies a proposal atomically, records reason/history and rejects stale revisions. All active STAFF/ADMIN may review except their own applications; assignment is not required. |
| Edit / unpublish | My services uses the approved-service API and existing update/delete forms. DELETE remains a proposal: public content disappears only after approval. It is soft deletion, not a temporary pause/resume feature. |
| Listing lifecycle | Existing H2 tests cover update/rejection/delete, images, ownership, revoked capability and stale proposals. Added comparison and approved-service API checks. |
| Submit / read requests | Authenticated customers send contact name/phone, description, future offset timestamp and optional address. Owner IDs, status and handler are server-owned. Own-service requests are rejected. |
| Respond | Owners read their incoming queue, accept or reject PENDING only. Rejection requires 10–2000 trimmed characters; response stores actor/time/reason and increments version. Concurrent responses yield one success and one conflict. |
| Forms / results | Detail page has a request form. “Yêu cầu dịch vụ” on list/detail opens sent/incoming queues, confirmation and rejection reason. Loading, empty, errors and retry are explicit. |
| Integrated verification | H2 test updates price → approves → reads public price → submits → owner accepts → customer reads result. Tests cover revoked/disabled listings and private request access. |
| Handoff | Migration below, HTTP fixtures in `ServiceRegistrationTests`, frontend API/time tests in `service-requests.test.js`. |

## API

All `/api/service-requests` routes require authentication. Lists are scoped to the principal, with no client owner/customer ID.

| Method | Path | Result |
| --- | --- | --- |
| POST | `/api/service-requests` | 201 with saved PENDING request |
| GET | `/api/service-requests/mine` | Customer's requests |
| GET | `/api/service-requests/incoming` | Requests for services owned by current account |
| GET | `/api/service-requests/{id}` | Customer or service owner only; others 404 |
| POST | `/api/service-requests/{id}/response` | Owner-only response; body `{decision: "ACCEPTED" or "REJECTED", reason, revision}` |
| GET | `/api/service-registrations/services` | Current approved snapshots of own non-deleted services |

Create body example (choose a real future date and service ID):

```json
{"serviceId":1,"contactName":"Khách thử nghiệm","contactPhone":"0987654321","description":"Vệ sinh phòng và nhà tắm","address":"Hòa Lạc","scheduledAt":"2099-11-20T09:00:00+07:00"}
```

Responses use the standard ApiResponse envelope. Request results include requestId, serviceId/name, contact details, description, address, scheduledAt, status, createdAt, handledBy/At, responseReason, revision and canAccept. Validation is 400, unauthorized 401, inaccessible resources 404, stale/non-pending/unavailable acceptance 409.

## Lifecycle and time decisions

- PENDING → ACCEPTED or REJECTED; no payment, completion, cancellation or notification delivery is implied.
- Creation and acceptance require current public eligibility. Old records remain visible to customer and owner if listing/capability becomes inactive. An authenticated active owner may reject outstanding requests even after capability revocation, with a reason.
- Acceptance also checks the requested time is still future. Rejected requests cannot be reopened.
- Input requires an offset timestamp. The UI explicitly interprets datetime-local as UTC+7, independent of the browser timezone; persisted Java Instant values represent UTC. UI displays Asia/Ho_Chi_Minh.
- Request response uses pessimistic locking and revision checking; provider locking serializes with listing changes/reviews. A rejected listing proposal must not reactivate a revoked capability.
- An address is optional; enter one for work performed at a specific location. No category-specific address rule is assumed.

## Deployment and fixtures

Review `sql/migrations/20261114_service_requests.sql` before applying to MySQL. It adds one table with FK relationships to services and users and indexes for customer/service lookups. Do not import the older reference schema over an existing database. Hibernate update remains the existing development setup; no live migration was run here.

Deploy backend/frontend together because My services now reads the new endpoint. H2 integration tests create unique users, approved listings and customer requests, with no production seed or real contact data. The HTTP test helper `customerRequest` supplies future fixtures dynamically.

Run backend Maven tests, `npm test` and `npm run build` in frontend. Browser fixtures must intercept all `/api/**` requests; never use a real MySQL database for automated writes.

## Verification results

2026-11-14: full backend suite passed 59 tests on isolated H2 (19 service, 31 host/staff, 9 auth); frontend passed 72 tests and production Vite build. The build retains the existing large-chunk warning. Edge headless API fixtures exercised customer submission with UTC+7 payload, incoming rejection, result display and no horizontal overflow at 375/768/1024/1440px. Screenshot inspected. Browser fixtures are UI checks, not live database end-to-end tests. No live MySQL migration was performed.
