# Dashboard Source + Expiry UI Tests (TASK-146)

Scope: `FilterBar`, `ResultsTable`, `RowExpansion`

## Patent Expiry Filter Hardening

1. Unknown expiry filter behavior.
- Given results where some rows have `earliest_patent_expiry = null` or empty string
- When user selects `Patent expiry window = Unknown expiry`
- Then only rows with missing expiry values remain visible.

2. Invalid expiry filter behavior.
- Given results where one or more rows have non-empty but invalid date strings in `earliest_patent_expiry`
- When user selects `Patent expiry window = Invalid expiry date`
- Then only rows with invalid expiry values remain visible.

3. Time-window filters exclude unknown/invalid dates.
- Given rows with valid, unknown, and invalid `earliest_patent_expiry`
- When user selects `Next 6 months`, `Next 1 year`, `Next 2 years`, or `Next 5 years`
- Then unknown/invalid rows are excluded and only valid dates within the selected cutoff remain.

4. Filter impact counts render.
- Given any non-empty result set
- When filters change
- Then filter area displays counts for:
  - hidden rows
  - unknown expiry rows
  - invalid expiry rows

5. Unknown `exp` query param falls back to `all`.
- Given URL query has `exp=bogus-mode`
- When dashboard loads and parses filters
- Then `Patent expiry window` defaults to `All` and no expiry-mode narrowing is applied.

## Main Table Source Affordances

6. Source count/icon display.
- Given a result row with linked source URLs
- Then Sources column shows a count affordance for linked sources.

7. Deterministic top source link.
- Given a row where one source link has highest deterministic score (verified or strongest domain priority)
- Then Sources column renders a direct link for that top source.

8. Non-deterministic tie fallback.
- Given a row where top source candidates tie under deterministic scoring
- Then Sources column shows fallback text indicating no deterministic top link.

9. Unsafe or malformed source URLs are not clickable.
- Given source links containing `javascript:`, `data:`, or malformed URL values
- Then those links are rejected from source extraction and no clickable anchor is rendered for them.

## Expanded Evidence Grouping + Verified Metadata

10. Evidence groups render independently when populated.
- Given expanded row data containing link metadata
- Then grouped sections can render for:
  - Patent links
  - Trial links
  - Article links
  - Target links
  - Drug database links
  - Source links

11. Verified/unverified badges are shown.
- Given mixed link metadata with verified and unverified links
- Then each rendered evidence link indicates `verified` or `unverified`.

12. Rejected evidence URLs render as non-clickable labels.
- Given patent or evidence groups contain non-HTTP(S) or malformed URLs
- Then affected entries render as plain text/Unavailable rather than clickable anchors.

13. Existing regulatory and jurisdiction context remains intact.
- Given canonical jurisdiction/regulatory fields from TASK-149 payloads
- Then jurisdiction gaps, derivation method, verified date, and framework/product-level regulatory context still render unchanged.
