# Staff · Hồ sơ cung cấp dịch vụ

Extends MASTER.md with the existing Staff navigation, teal action surfaces and slate typography.

- List: four filterable summary cards, category/search/sort controls, status filters and eight records per page. Counts use the complete list response, independently of the active filters. Unavailable counts use a dash.
- Preserve list filters and page in URL parameters when opening and returning from a record. Mobile uses stacked record cards without horizontal page scrolling.
- Detail: submitted service, applicant, protected document downloads and real audit history in the main column. Decisions and recorded outcomes occupy the adjacent column on desktop.
- Keep capability approval and listing approval separate. Approval of capability alone never implies public visibility. Do not offer unsupported supplement actions or repeat decisions. Self-review remains blocked.
- Require a confirmation dialog before the existing review POST. Retain decisions and reason on recoverable errors. Success follows the API response. Use existing MotionButton and common Modal for press/focus/presence behavior and reduced motion.
- Do not populate runtime fixtures or change backend authorization, schema or API endpoints.

Verification: `frontend/scripts/check-staff-service-applications.cjs` intercepts API calls, exercises 375/768/1024/1440 widths, filtering, pagination, return navigation, document download, separate decisions, self-review, confirmation, failed retry, empty/error states and keyboard focus. No MySQL mutations. Pure view tests live in `frontend/tests/service-applications-view.test.js`.
