---
task_ref: TASK-146
plan_ref: PLAN-012
review_type: security
verdict: PASS
reviewed_at: 2026-05-11T15:40:28Z
reviewed_by: SMA
---

# TASK-146 Security Review: ember-web

## Verdict

PASS

## Findings

### Resolved: untrusted source-link metadata is rendered directly as `href`

The new source affordances render URLs from API/data payloads directly:

- `src/components/dashboard/ResultsTable.tsx` uses `verified_source_links[].url` and `source_urls[]`.
- `src/components/dashboard/RowExpansion.tsx` uses `target_links`, `target_source_links`, `drug_database_links`, `drug_links`, `verified_source_links`, and fallback source URLs.

React escapes link text, but it does not make arbitrary `href` schemes safe. A `javascript:` or other unsupported scheme in source metadata could become a clickable link in the dashboard.

Required revision:

- Normalize URLs with the platform URL parser before rendering.
- Allow only `http:` and `https:` schemes for clickable evidence/source links.
- Treat rejected links as absent or render their label as plain text.
- Cover rejected unsafe schemes in the TASK-146 UI test artifact or executable tests.

Revision completed:

- `normalizeSafeHttpUrl()` rejects malformed URLs and non-HTTP(S) schemes.
- Source/evidence link extraction in `ResultsTable` and `RowExpansion` uses the sanitizer before rendering clickable anchors.
- Unsafe patent URLs render as unavailable instead of clickable links.
- Regression coverage artifact includes unsafe and malformed URL cases.

## Notes

- Existing links correctly use `target="_blank"` with `rel="noopener noreferrer"`, which mitigates tabnabbing but does not address unsafe URL schemes.
- No secrets or command-execution paths were introduced by this task.
