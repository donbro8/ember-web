---
task_ref: TASK-145
plan_ref: PLAN-012
review_type: quality
verdict: PASS
reviewed_at: 2026-05-11T15:40:28Z
reviewed_by: SMA
---

# TASK-145 Quality Review: ember-web

## Verdict

PASS

## Findings

### Resolved: run-scoped dashboard navigation can remain stuck in aggregate mode

`src/app/dashboard/page.tsx` stores `watch_id` and `run_id` in state only once from the initial `useSearchParams()` values:

- `watchId` is initialized at line 107 and never updated.
- `runId` is initialized at line 108 and only changed by the run selector / watch fallback path.
- `isAggregateMode` at line 110 is derived from those state values instead of the current URL params.

Impact: navigating within the same mounted dashboard component from `/dashboard` to `/dashboard?run_id=<id>` can leave `runId` as `null`, so `isAggregateMode` remains `true`. `fetchData()` then takes the aggregate branch at lines 135-145 and never loads the run results. This directly conflicts with the TASK-145 acceptance criteria that `/dashboard?run_id=...` remains supported and query-page redirect/run-only dashboard loading are covered.

Required revision:

- Derive the active `watch_id` / `run_id` from current `searchParams`, or synchronize state whenever search params change.
- Ensure `/dashboard`, `/dashboard?run_id=<id>`, and `/dashboard?watch_id=<id>` transitions work without relying on a full remount.
- Add or update executable or documented regression coverage for aggregate-to-run and run-to-aggregate navigation.

Revision completed:

- `src/app/dashboard/page.tsx` now derives active `watch_id`, `run_id`, `tab`, and `synthesis_overview` from current `searchParams`.
- Local state is synchronized when URL params change.
- Non-run contexts clear stale run results during transitions.
- `tests/dashboard-navigation.ui.test.md` includes aggregate-to-run and run-to-aggregate same-component navigation scenarios.

## Verification Evidence Reviewed

- Child reported `npm run lint` passed.
- Child reported `npm run build` passed.
- Review inspected the implementation diff for `src/app/dashboard/page.tsx` and `tests/dashboard-navigation.ui.test.md`.
- Revision dispatch `0001N03Y6ARVB2DA` reported `npm run lint` passed.
- Revision dispatch `0001N03Y6ARVB2DA` reported `npm run build` passed.
