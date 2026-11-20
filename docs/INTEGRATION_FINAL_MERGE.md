# Final integration checkpoint — 2026-11-20

Branch: `integration/final-merge`, created from `origin/main` (`7e6ad876`).
Approved feature branches: DuongND, DungDT, NingDD, MaiNTT, VietNV.
Main and the remote feature branches have not been modified.

## Safety backups

- Main backup stash: `f24c2decdfe82498a82d15716fae0cd52fdd644b`, named `backup-before-final-integration-2026-11-20`.
- Separate stash: `backup-integration-vite-cache-2026-11-20`.
- Original older stash retained. Do not pop any backup into this branch during integration.
- The pnpm cache had a junction into frontend. Stash cleanup traversed it; tracked files were recovered from HEAD, ignored `.env.local` recovered from the saved stash, and the junction itself removed without recursively deleting its target. Dependencies were reinstalled. Cache directories are now ignored to prevent another traversal.

## Merge order and current state

1. **origin/DuongND** (`3038405c`): merged with `--no-ff`; no merge conflicts. Community reporting and mobile moderation retained.
2. origin/DungDT (`f7bd2f6c`): not merged yet.
3. origin/NingDD (`4fac7f0c`): not merged yet; foundational availability, reverification, maps/onboarding/mobile work before the dependent AI/search branch.
4. origin/MaiNTT (`9325b949`): not merged yet.
5. origin/VietNV (`4aea39ea`): not merged yet.

`origin/DuongND-service-ui` is already an ancestor of origin/main and does not need a separate merge.

## Validation after DuongND

- Tracked source scanned for actual conflict markers (`<<<<<<<`, a standalone `=======`, `>>>>>>>`): none.
- Frontend tests: **212 passed / 212**.
- Frontend Vite production build: **passed**; existing large-chunk warning remains.
- No frontend lint script is configured in package.json.
- Backend: **179 passed / 179**, no skipped tests, after the user authorized execution outside the sandbox. H2 only; the earlier loopback restriction is resolved for validation.
- First checkpoint now satisfies build/test/conflict checks. Continuing the remaining approved branches.

## Compatibility fixes made before the next merge

- Regenerated npm package-lock.json using npm install because the pre-existing lockfile did not match package.json; no package.json dependency declarations were removed.
- Updated the routing migration inventory assertion to include the three later host-registration pages and the existing `merged` integration status; retained role, legacy-target and unsafe-HTML checks.
- Profile logout test now checks both the delegated runtime handler and the actual prototype template containing the button.
- GoogleMapCanvas creates its static SVG marker with SVG DOM APIs instead of innerHTML; marker functionality retained.
- Disabled footer placeholders with no destination are rendered as disabled link spans instead of navigation to `#`; existing real links retained.
- Ignored pnpm/Vite/Python caches. No application secrets or environment overrides were committed.

## Resume

Backend integration tests with local loopback access are authorized. Continue the remaining branches in order. Inspect overlapping files and resolve both sides' business logic at each merge; regenerate conflicting lockfiles from the combined package.json. Run build/tests/conflict scan after each branch and record results here. No force push, no merge into main, and no automatic publication of this integration branch.
