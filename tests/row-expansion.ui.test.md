# RowExpansion UI Tests (TASK-149)

## Scope

Covers jurisdiction gaps, expiry derivation method, and regulatory context rendering in `RowExpansion`.

## Test Cases

1. Populated and missing jurisdictions render separately.
- Given `jurisdictions=["US","EP"]` and `missing_jurisdictions=["JP"]`
- Then section shows populated list and missing gaps list in distinct blocks.

2. Missing jurisdiction gaps do not imply no patent exists.
- Given `missing_jurisdictions=[]` or missing field
- Then UI displays: "No explicit gap list is provided. Missing entries do not imply no patent exists."

3. Unknown jurisdiction gaps render separately and do not imply absence.
- Given `unknown_jurisdictions=["BR"]`
- Then section shows "Unknown jurisdiction coverage" with `BR` and no "no patent exists" implication.

4. Approximate vs verified expiry dates are visually distinct.
- Given one patent with `expiry_date_approximate=true` and one with `false`
- Then approximate date is prefixed with `≈`; verified date is not.

5. Expiry derivation method is shown when provided.
- Given `earliest_patent_expiry_derivation_method="Earliest family member + statutory term"`
- Then section includes this exact method text.

6. Regulatory context is framework-level unless verified per product.
- Given `framework_regulatory_context="EU 8+2+1 baseline"` and `regulatory_context.data_exclusivity_verified_product=false`
- Then UI shows framework-level note and a non-verified product disclaimer.

7. Product-level verification text appears when verified.
- Given `regulatory_context.data_exclusivity_verified_product=true` and `data_exclusivity_verified_note`
- Then UI renders product-level verification message.

8. Canonical exclusivity fields render when present.
- Given `data_exclusivity_regime="NCE"` and `data_exclusivity_expiry="2031-01-01"`
- Then section shows regime and data exclusivity expiry values.

9. Jurisdictions map payload normalizes safely.
- Given `jurisdictions={"US": true, "EP": true}` (object/map, not array)
- Then section renders `US, EP` without runtime errors and without calling array methods on an object.

10. Framework regulatory context map payload renders readable text.
- Given `framework_regulatory_context={"summary":"EU baseline framework","window_years":10}`
- Then section renders a readable framework context string (summary-preferred, otherwise stable key/value text), not a raw object.

## Regression Checks

- Existing patent, trial, article, score, synthesis, and source sections continue rendering.
- Row expansion remains compatible with records that do not include new optional fields.
