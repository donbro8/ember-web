---
task_ref: TASK-146
plan_ref: PLAN-012
review_type: quality
verdict: PASS
reviewed_at: 2026-05-11T15:40:28Z
reviewed_by: SMA
---

# TASK-146 Quality Review: ember-web

## Verdict

PASS

## Findings

### Resolved: source-link URLs are not normalized or scheme-limited

`src/components/dashboard/ResultsTable.tsx` accepts `verified_source_links[].url` and `source_urls[]` directly into table links, and `src/components/dashboard/RowExpansion.tsx` accepts multiple dynamic link arrays directly into expanded evidence links.

Impact: the feature depends on source-link metadata being safe and URL-like, but the frontend currently accepts any non-empty string. The code should normalize and validate links before rendering them, at minimum limiting rendered `href` values to `http:` / `https:` URLs. This is also required for deterministic source-link behavior because malformed links should not participate in top-link scoring.

Required revision:

- Add a shared URL normalization helper for dashboard evidence links.
- Drop or render as non-clickable any URL with an unsupported scheme or parse failure.
- Apply the helper in both `ResultsTable` and `RowExpansion`.
- Add regression coverage for unsafe schemes and malformed URLs.

Revision completed:

- Added `src/components/dashboard/linkSafety.ts` with `normalizeSafeHttpUrl()`.
- `ResultsTable` and `RowExpansion` now normalize source/evidence URLs before rendering anchors.
- Patent-row URLs in `RowExpansion` render as `Unavailable` when rejected.
- Regression coverage artifact includes unsafe scheme and malformed URL cases.

### Non-blocking: URL filter params are not validated against known expiry modes

`FilterBar` casts `exp` directly to `ExpiryWindow`. Unknown values can flow into `EXPIRY_WINDOW_MONTHS[f.expiryWindow]`.

Impact: malformed query params can produce inconsistent expiry filtering behavior. This is a narrow URL-state robustness issue, not the main task path.

Recommended revision:

- Validate `exp` against the known `ExpiryWindow` values and fall back to `all` for unknown values.

Revision completed:

- `FilterBar` now validates `exp` against known expiry window values and falls back to `all`.

## Verification Evidence Reviewed

- Child reported `npm run lint` passed.
- Child reported `npm run build` passed.
- Review inspected the implementation diff for `FilterBar.tsx`, `ResultsTable.tsx`, `RowExpansion.tsx`, and `tests/dashboard-source-and-expiry.ui.test.md`.
- Revision dispatch `0001N03YFSWDZWP7` reported `npm run lint` passed.
- Revision dispatch `0001N03YFSWDZWP7` reported `npm run build` passed.
