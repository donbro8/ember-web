"use client";

import { useEffect, useMemo, useState } from "react";
import type { CandidateResult, PatentJurisdiction } from "@/lib/types";
import SortableHeader from "@/components/ui/SortableHeader";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";

const PAGE_SIZE = 50;

type SortKey =
  | "display_label"
  | "category"
  | "overall_score"
  | "trial_count"
  | "patent_count"
  | "annual_revenue_usd_millions"
  | "biosimilar_competitor_count";

interface SortState {
  key: string;
  direction: "asc" | "desc";
}

interface ResultsTableProps {
  results: CandidateResult[];
  onRowClick?: (result: CandidateResult) => void;
  expandedId?: string | null;
}

/** Map category strings to Badge variants. */
function categoryVariant(
  category: string | null,
): "default" | "success" | "warning" | "danger" | "info" {
  if (!category) return "default";
  const lower = category.toLowerCase();
  if (lower.includes("biologic") || lower.includes("biosimilar"))
    return "info";
  if (lower.includes("small")) return "success";
  if (lower.includes("gene") || lower.includes("cell")) return "warning";
  return "default";
}

/**
 * Build a jurisdiction summary string from a patents array.
 * Groups by country_code, picks the earliest expiry per country,
 * formats as "US: 2026-08 | EP: 2027-01".
 * Returns null when no expiry dates are available.
 */
function buildJurisdictionSummary(
  patents: PatentJurisdiction[],
): { summary: string; earliestExpiry: string | null; earliestApproximate: boolean } {
  const byCountry = new Map<
    string,
    { expiry: string; approximate: boolean }
  >();

  for (const p of patents) {
    if (!p.expiry_date) continue;
    const existing = byCountry.get(p.country_code);
    if (!existing || p.expiry_date < existing.expiry) {
      byCountry.set(p.country_code, {
        expiry: p.expiry_date,
        approximate: p.expiry_date_approximate,
      });
    }
  }

  if (byCountry.size === 0) {
    return { summary: "", earliestExpiry: null, earliestApproximate: false };
  }

  // Sort countries alphabetically for stable display
  const entries = Array.from(byCountry.entries()).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );

  // Find the global earliest expiry
  let earliestExpiry: string | null = null;
  let earliestApproximate = false;
  for (const [, val] of entries) {
    if (!earliestExpiry || val.expiry < earliestExpiry) {
      earliestExpiry = val.expiry;
      earliestApproximate = val.approximate;
    }
  }

  const parts = entries.map(([code, val]) => {
    const prefix = val.approximate ? "≈" : "";
    // Show YYYY-MM
    const dateStr = val.expiry.slice(0, 7);
    return `${code}: ${prefix}${dateStr}`;
  });

  return {
    summary: parts.join(" | "),
    earliestExpiry,
    earliestApproximate,
  };
}

/** Format revenue in $M with one decimal. */
function formatRevenue(val: number | null): string {
  if (val == null) return "\u2014";
  return `$${val.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 1 })}M`;
}

/** Compare helper that handles nulls (nulls sort last). */
function compareValues(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
  direction: "asc" | "desc",
): number {
  const aNull = a == null;
  const bNull = b == null;
  if (aNull && bNull) return 0;
  if (aNull) return 1;
  if (bNull) return -1;

  let cmp: number;
  if (typeof a === "string" && typeof b === "string") {
    cmp = a.localeCompare(b);
  } else {
    cmp = (a as number) - (b as number);
  }
  return direction === "asc" ? cmp : -cmp;
}

export default function ResultsTable({
  results,
  onRowClick,
  expandedId,
}: ResultsTableProps) {
  const [sort, setSort] = useState<SortState>({
    key: "overall_score",
    direction: "desc",
  });
  const [page, setPage] = useState(0);

  // Reset to first page when results change (e.g. new run selected or filters applied)
  const resultsLength = results.length;
  useEffect(() => {
    setPage(0);
  }, [resultsLength]);

  const handleSort = (key: string) => {
    setSort((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "desc" };
    });
    setPage(0);
  };

  const sorted = useMemo(() => {
    const copy = [...results];
    copy.sort((a, b) => {
      const k = sort.key as SortKey;
      switch (k) {
        case "display_label":
          return compareValues(a.display_label, b.display_label, sort.direction);
        case "category":
          return compareValues(a.category, b.category, sort.direction);
        case "overall_score":
          return compareValues(a.overall_score, b.overall_score, sort.direction);
        case "trial_count":
          return compareValues(a.trial_count, b.trial_count, sort.direction);
        case "patent_count":
          return compareValues(a.patents.length, b.patents.length, sort.direction);
        case "annual_revenue_usd_millions":
          return compareValues(
            a.annual_revenue_usd_millions,
            b.annual_revenue_usd_millions,
            sort.direction,
          );
        case "biosimilar_competitor_count":
          return compareValues(
            a.biosimilar_competitor_count,
            b.biosimilar_competitor_count,
            sort.direction,
          );
        default:
          return 0;
      }
    });
    return copy;
  }, [results, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageResults = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  /** Compute aria-sort for a given column key. */
  function ariaSort(key: string): "ascending" | "descending" | "none" {
    if (sort.key !== key) return "none";
    return sort.direction === "asc" ? "ascending" : "descending";
  }

  if (results.length === 0) {
    return (
      <EmptyState
        title="No results"
        description="Run a query to see candidate results here."
      />
    );
  }

  return (
    <div className="w-full">
      {/* Table with horizontal scroll on mobile */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800/60">
            <tr>
              <th scope="col" aria-sort={ariaSort("display_label")} className="px-4 py-3 text-left">
                <SortableHeader
                  label="Drug / Target"
                  sortKey="display_label"
                  currentSort={sort}
                  onSort={handleSort}
                />
              </th>
              <th scope="col" aria-sort={ariaSort("category")} className="px-4 py-3 text-left">
                <SortableHeader
                  label="Category"
                  sortKey="category"
                  currentSort={sort}
                  onSort={handleSort}
                />
              </th>
              <th scope="col" aria-sort={ariaSort("overall_score")} className="px-4 py-3 text-left">
                <SortableHeader
                  label="Score"
                  sortKey="overall_score"
                  currentSort={sort}
                  onSort={handleSort}
                />
              </th>
              <th scope="col" aria-sort={ariaSort("trial_count")} className="px-4 py-3 text-left">
                <SortableHeader
                  label="Trials"
                  sortKey="trial_count"
                  currentSort={sort}
                  onSort={handleSort}
                />
              </th>
              <th scope="col" aria-sort={ariaSort("patent_count")} className="px-4 py-3 text-left">
                <SortableHeader
                  label="Patents"
                  sortKey="patent_count"
                  currentSort={sort}
                  onSort={handleSort}
                />
              </th>
              <th scope="col" aria-sort={ariaSort("annual_revenue_usd_millions")} className="px-4 py-3 text-left">
                <SortableHeader
                  label="Revenue"
                  sortKey="annual_revenue_usd_millions"
                  currentSort={sort}
                  onSort={handleSort}
                />
              </th>
              <th scope="col" aria-sort={ariaSort("biosimilar_competitor_count")} className="px-4 py-3 text-left">
                <SortableHeader
                  label="Biosimilars"
                  sortKey="biosimilar_competitor_count"
                  currentSort={sort}
                  onSort={handleSort}
                />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
            {pageResults.map((r) => {
              const jurisdiction = buildJurisdictionSummary(r.patents);
              const isExpanded = expandedId === r.canonical_id;

              return (
                <tr
                  key={r.canonical_id}
                  onClick={() => onRowClick?.(r)}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onRowClick(r);
                          }
                        }
                      : undefined
                  }
                  tabIndex={onRowClick ? 0 : undefined}
                  role={onRowClick ? "button" : undefined}
                  aria-expanded={onRowClick ? isExpanded : undefined}
                  aria-label={onRowClick ? `${r.display_label}, click to ${isExpanded ? "collapse" : "expand"} details` : undefined}
                  className={`transition-colors ${
                    onRowClick ? "cursor-pointer" : ""
                  } ${
                    isExpanded
                      ? "bg-blue-50 dark:bg-blue-900/20"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800/40"
                  }`}
                >
                  {/* Drug / Target */}
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                    {r.display_label}
                  </td>

                  {/* Category */}
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    {r.category ? (
                      <Badge
                        label={r.category}
                        variant={categoryVariant(r.category)}
                      />
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">
                        &mdash;
                      </span>
                    )}
                  </td>

                  {/* Score */}
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    {r.overall_score != null ? (
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 rounded-full bg-gray-200 dark:bg-gray-700">
                          <div
                            className="h-2 rounded-full bg-blue-500 dark:bg-blue-400"
                            style={{
                              width: `${Math.round(r.overall_score * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="tabular-nums text-gray-700 dark:text-gray-300">
                          {r.overall_score.toFixed(2)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">
                        &mdash;
                      </span>
                    )}
                  </td>

                  {/* Trials */}
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    <span className="tabular-nums">{r.trial_count}</span>
                    {r.latest_trial_phase && (
                      <span className="ml-1 text-gray-500 dark:text-gray-400">
                        ({r.latest_trial_phase})
                      </span>
                    )}
                  </td>

                  {/* Patents */}
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    <div className="flex flex-col gap-0.5">
                      <span className="tabular-nums whitespace-nowrap">
                        {r.patents.length} patent{r.patents.length !== 1 ? "s" : ""}
                        {jurisdiction.earliestExpiry && (
                          <span className="ml-1 text-gray-500 dark:text-gray-400">
                            (exp.{" "}
                            {jurisdiction.earliestApproximate ? "≈" : ""}
                            {jurisdiction.earliestExpiry.slice(0, 7)})
                          </span>
                        )}
                      </span>
                      {jurisdiction.summary && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {jurisdiction.summary}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Revenue */}
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {formatRevenue(r.annual_revenue_usd_millions)}
                    {r.revenue_year && (
                      <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">
                        ({r.revenue_year})
                      </span>
                    )}
                  </td>

                  {/* Biosimilar Competitors */}
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {r.biosimilar_competitor_count}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {sorted.length > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between px-1">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {page + 1} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
