# DIR-007 Dashboard Verification (TASK-153)

## Scope

End-to-end UI verification coverage across aggregate dashboard rendering, run/ad-hoc navigation, patent filters, source affordances, evidence grouping, jurisdiction gaps, derivation metadata, regulatory context labels, and unsafe URL handling.

## Verification Matrix

1. Aggregate dashboard default renders for `/dashboard` without `watch_id` or `run_id`.
- Header shows `Dashboard Overview`.
- Results tab shows `Aggregate Overview` summary and digest sections when populated.
- Legacy run-scoped empty prompt is not shown.
- When `per_watch` is empty but watches exist, aggregate view still shows latest watch result rows from `digest.dashboard.per_watch_latest_results`.
- Latest watch result rows use `latest_run_id`, `latest_status`, and `suppressed_count` from the digest API payload. Rows with null `latest_run_id` do not render broken run links.

2. Run and watch navigation compatibility remains intact.
- `/dashboard?run_id=<id>` renders run-scoped results and `Ad-hoc Results`.
- `/dashboard?watch_id=<id>` loads watch metadata and defaults to `last_run_id` when available.
- Same-component transitions between aggregate, run-scoped, and watch-scoped URLs refresh context correctly.
- Same-component watch-to-aggregate transition clears stale watch context (`watch`, `runs`) so header, run selector, CSV export, and results section reflect aggregate mode only.
- Same-component watch-to-run transition (`watch_id` removed, `run_id` present) clears stale watch context (`watch`, `runs`) and stale aggregate context (`digest`, `watches`) so ad-hoc mode reflects run-only URL state.

3. Changes tab behavior for non-watch contexts remains unchanged.
- `/dashboard?tab=changes` without `watch_id` renders `No watch selected` guidance.
- Unknown `tab` values fall back to `results`.

4. Patent expiry filters handle unknown and invalid expiry values.
- `Unknown expiry` includes only rows with null/blank `earliest_patent_expiry`.
- `Invalid expiry date` includes only rows with non-empty invalid expiry strings.
- Window filters (`6mo`, `1yr`, `2yr`, `5yr`) exclude unknown/invalid expiry values.
- Unknown `exp` query values default to `all`.

10. FilterBar URL synchronization preserves non-filter context params.
- Starting from `/dashboard?run_id=<id>` with default filter state does not rewrite URL to bare `/dashboard`.
- Starting from `/dashboard?watch_id=<id>&tab=results` keeps `watch_id` and `tab` while syncing only filter-owned params (`q`, `smin`, `smax`, `cat`, `exp`, `jur`, `bio`, `phase`).

5. Filter impact counters are present.
- Filter panel displays hidden row count, unknown expiry count, and invalid expiry count.

6. Main table source affordances are deterministic and safe.
- Sources column shows count badge for extracted links.
- Deterministic top source link renders only when a unique best-scored source exists.
- Tie cases render non-link fallback text.
- Unsafe/malformed source URLs are not clickable.

7. Expanded evidence grouping renders by source type with metadata labels.
- Evidence groups render independently for populated categories:
  - Patent links
  - Trial links
  - Article links
  - Target links
  - Drug database links
  - Source links
- Rendered entries include `verified` or `unverified` metadata badges.

8. Rejected evidence URLs are non-clickable in grouped evidence.
- Non-HTTP(S) or malformed URLs render as plain text with `(Unavailable)` and no anchor.

9. Jurisdiction and regulatory context continuity remains intact.
- Populated, missing, and unknown jurisdictions render in separate sections.
- Missing/unknown notes do not imply no patent exists.
- `earliest_patent_expiry_derivation_method` renders when present.
- Approximate expiry dates keep `≈` prefix while verified dates do not.
- Framework-level and product-level regulatory context labels render according to verification flags.
