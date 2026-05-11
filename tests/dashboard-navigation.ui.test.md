# Dashboard Navigation UI Tests (TASK-145)

## Scope

Covers aggregate default behavior for `/dashboard` and regression coverage for run-scoped/ad-hoc navigation.

## Test Cases

1. Aggregate default renders with no query params.
- Given navigation to `/dashboard` with no `watch_id` and no `run_id`
- Then the page title is `Dashboard Overview`
- And the results tab shows an `Aggregate Overview` summary block instead of the legacy empty state prompt.

2. Aggregate default does not render run-scoped empty-state copy.
- Given navigation to `/dashboard` with no params
- Then copy like `Provide a run_id or watch_id to view results.` is not shown.

3. Ad-hoc query redirect preserves run-scoped loading.
- Given `QueryBuilder` submission succeeds with `run_id=<id>`
- Then `router.push` targets `/dashboard?run_id=<id>` (and includes `synthesis_overview` only when provided)
- And `/dashboard?run_id=<id>` loads results in Results tab.

4. Run-only dashboard loading remains supported.
- Given direct navigation to `/dashboard?run_id=<id>` without `watch_id`
- Then run results load and render in the table
- And the header remains `Ad-hoc Results`.

5. Watch-scoped dashboard remains compatible.
- Given navigation to `/dashboard?watch_id=<watch>`
- Then watch metadata and runs load
- And when `last_run_id` exists, that run is loaded by default.

6. Changes tab behavior remains unchanged for non-watch contexts.
- Given `/dashboard?run_id=<id>&tab=changes` or aggregate `/dashboard?tab=changes`
- Then the tab shows `No watch selected` guidance (requires `watch_id`).

7. Same-component navigation from aggregate to run-scoped loads results.
- Given the dashboard is already mounted at `/dashboard`
- When navigation updates URL to `/dashboard?run_id=<id>` without full remount
- Then aggregate summary is replaced by run-backed results content.

8. Same-component navigation from run-scoped to aggregate reloads aggregate digest.
- Given the dashboard is already mounted at `/dashboard?run_id=<id>`
- When navigation updates URL to `/dashboard`
- Then run-backed results are cleared
- And aggregate overview summary content is shown.

## Regression Checks

- Existing dashboard navigation from watch list links (`/dashboard?watch_id=...`) continues to function.
- Existing ad-hoc query flow from the home page continues to function.
- Run selector + CSV export controls appear only for run-backed result contexts.
