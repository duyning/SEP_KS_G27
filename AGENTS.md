# HL-RCS — project context

Read [docs/PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md) for the current architecture,
business context, implemented modules, API boundaries and known documentation gaps.
Read [docs/ENTITY_CATALOG.md](docs/ENTITY_CATALOG.md) for all JPA entities, fields,
relationships, enum values and differences from the reference SQL schema.
Read [docs/ERD.md](docs/ERD.md) for the ERD derived from the current JPA mappings.
Read [docs/SERVICE_MANAGEMENT.md](docs/SERVICE_MANAGEMENT.md) for the 2026-11-08
multi-service/image/change-review extension: owner changes are proposals; the
approved public snapshot changes only after staff approval.

These files are a source-based snapshot dated 2026-11-05. Recheck the relevant
implementation before changes; the snapshot is not a live database inspection.

Key context to preserve:

- React/Vite frontend and Spring Boot REST backend; MySQL for the application,
  isolated H2 for backend tests.
- Roles: USER, ROOM_HOST, STAFF, ADMIN. Service Owner is the independent
  MANAGE_SERVICE capability; granting it does not change the account role.
- Every active STAFF and ADMIN may review service applications without assignment.
  Applicants may not review their own applications. Legacy assignment columns are
  retained as historical data and do not restrict review access.
- Public services require approved capability/listing decisions, an ACTIVE service,
  an ACTIVE provider and an ACTIVE MANAGE_SERVICE capability.
- Host ownership comes from the authenticated account, not client-supplied owner IDs.
- sql/schema.sql and the original migration report lag behind current entities/APIs.
  An entity or routed page alone does not establish that a workflow is implemented.
