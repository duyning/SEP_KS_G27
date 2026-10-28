# UI/UX guidance for HL_RCS

For frontend UI work, read `../design-system/hl-rcs/MASTER.md` before choosing layout,
colors, typography, or interaction patterns. Read `../docs/ui-ux-review.md` for the
source review, existing strengths, evidence, and improvement priorities.

These project-specific decisions adapt UI UX Pro Max to the existing application.
They do not imply that the upstream skill or Python search tool is installed.

## Working rules

- Detect the actual stack from `package.json`: React, Vite, React Router, plain
  CSS, and Lucide. Keep the current stack unless the task requires a change.
- Extend existing components and the teal/slate visual language. Check imports
  and callers before changing a shared component; similarly named components may
  have different contracts. Avoid introducing another component or icon system.
- Prioritize task completion, truthful data, accessibility, and mobile usability
  before decorative effects. Public discovery and operational portals need
  different information density, with shared visual foundations.
- Use existing CSS variables where appropriate. For new UI, introduce semantic
  tokens in the relevant shared stylesheet when needed, then reuse them. Avoid
  duplicating raw colors and static inline styles across screens. Migrate legacy
  styles incrementally within the requested scope.
- Check foreground/background pairs. Small white text on the existing teal
  `#0d9488` is about 3.74:1; use an appropriate darker action surface or text color
  for normal text. A matching brand color alone does not establish accessibility.
- Use native buttons, links, and inputs; visible labels; named icon controls;
  visible keyboard focus; and text for status. Dialogs need initial focus,
  contained focus, Escape behavior, and focus restoration. Test the actual modal
  implementation used by the changed screen.
- Keep loading, empty, error/retry, unavailable, and success states distinct.
  Preserve entered values after recoverable errors. Announce async outcomes
  appropriately. Confirm success only after the real operation succeeds.
- Keep API-backed data and labeled prototype fixtures distinct. Never invent
  ratings, verification claims, counts, fees, distances, booking success, or
  endpoints. `APPROVED` means the recorded approval state, not a guarantee about
  all property details. Preserve backend authorization and public-data policies.
- Preserve URL filters, pagination, deep links, and browser Back behavior.
  Reuse the existing request cancellation and debounce where applicable.
- Support narrow screens, long Vietnamese content, zoom, keyboard interaction,
  and reduced motion. Larger touch targets are a project usability goal;
  44px is not the universal WCAG 2.2 AA minimum for web targets.
- Treat upstream recommendations as context-dependent references. Check their
  platform, product fit, and actual API support. Never present an unexecuted
  search or an unverified result as a generated recommendation.

## Verification

For changed UI, inspect the affected route and states at relevant widths
(baseline: 375, 768, 1024, 1440 CSS px), and check 200% zoom and keyboard use.
Run the relevant existing tests and `pnpm build` when runtime code changes.
Add behavior tests for meaningful changed behavior where appropriate; do not add
tests that merely assert the presence of CSS classes or copy the implementation.
Report exactly what was checked and any unavailable browser/API validation.
Documentation-only changes need link/path checks and diff review, not UI tests.
