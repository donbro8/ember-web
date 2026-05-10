"use client";

import { useCallback } from "react";
import type { CandidateResult } from "@/lib/types";

interface CsvExportProps {
  results: CandidateResult[];
  filename?: string;
}

/** Escape a CSV value: wrap in quotes if it contains commas, quotes, or newlines. */
function escapeCsv(value: string): string {
  if (
    value.includes(",") ||
    value.includes('"') ||
    value.includes("\n") ||
    value.includes("\r")
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Build a pipe-separated jurisdiction string like "US:2026-08|EP:2027-01". */
function buildJurisdictionCsv(result: CandidateResult): string {
  const byCountry = new Map<string, string>();

  for (const p of result.patents) {
    if (!p.expiry_date) continue;
    const existing = byCountry.get(p.country_code);
    if (!existing || p.expiry_date < existing) {
      byCountry.set(p.country_code, p.expiry_date.slice(0, 7));
    }
  }

  return Array.from(byCountry.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([code, date]) => `${code}:${date}`)
    .join("|");
}

function generateCsv(results: CandidateResult[]): string {
  const headers = [
    "Display Label",
    "Category",
    "Score",
    "Trial Count",
    "Latest Trial Phase",
    "Patent Count",
    "Earliest Patent Expiry",
    "Patent Jurisdictions",
    "Revenue ($M)",
    "Biosimilar Competitor Count",
  ];

  const rows = results.map((r) =>
    [
      r.display_label,
      r.category ?? "",
      r.overall_score != null ? r.overall_score.toFixed(2) : "",
      String(r.trial_count),
      r.latest_trial_phase ?? "",
      String(r.patents.length),
      r.earliest_patent_expiry ?? "",
      buildJurisdictionCsv(r),
      r.annual_revenue_usd_millions != null
        ? String(r.annual_revenue_usd_millions)
        : "",
      String(r.biosimilar_competitor_count),
    ].map(escapeCsv),
  );

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

export default function CsvExport({
  results,
  filename = "ember-results.csv",
}: CsvExportProps) {
  const handleExport = useCallback(() => {
    const csv = generateCsv(results);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [results, filename]);

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={results.length === 0}
      className="inline-flex items-center gap-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      <svg
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
        />
      </svg>
      Export CSV
    </button>
  );
}
