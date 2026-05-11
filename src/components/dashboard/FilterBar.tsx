"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { CandidateResult } from "@/lib/types";
import FilterChip from "@/components/ui/FilterChip";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BiosimilarFilter = "all" | "has" | "none";
type ExpiryWindow = "6mo" | "1yr" | "2yr" | "5yr" | "unknown" | "invalid" | "all";

interface FilterState {
  search: string;
  scoreMin: number;
  scoreMax: number;
  categories: string[];
  expiryWindow: ExpiryWindow;
  jurisdictions: string[];
  biosimilar: BiosimilarFilter;
  trialPhases: string[];
}

interface FilterBarProps {
  results: CandidateResult[];
  onFilter: (filtered: CandidateResult[]) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EXPIRY_WINDOW_LABELS: Record<ExpiryWindow, string> = {
  "6mo": "Next 6 months",
  "1yr": "Next 1 year",
  "2yr": "Next 2 years",
  "5yr": "Next 5 years",
  unknown: "Unknown expiry",
  invalid: "Invalid expiry date",
  all: "All",
};

const EXPIRY_WINDOW_MONTHS: Record<Exclude<ExpiryWindow, "all" | "unknown" | "invalid">, number> = {
  "6mo": 6,
  "1yr": 12,
  "2yr": 24,
  "5yr": 60,
};

const EXPIRY_WINDOWS: ExpiryWindow[] = [
  "6mo",
  "1yr",
  "2yr",
  "5yr",
  "unknown",
  "invalid",
  "all",
];

function isExpiryWindow(value: string | null): value is ExpiryWindow {
  return value != null && EXPIRY_WINDOWS.includes(value as ExpiryWindow);
}

const DEFAULT_FILTER: FilterState = {
  search: "",
  scoreMin: 0,
  scoreMax: 1,
  categories: [],
  expiryWindow: "all",
  jurisdictions: [],
  biosimilar: "all",
  trialPhases: [],
};

const FILTER_PARAM_KEYS = new Set([
  "q",
  "smin",
  "smax",
  "cat",
  "exp",
  "jur",
  "bio",
  "phase",
]);

// ---------------------------------------------------------------------------
// URL param helpers
// ---------------------------------------------------------------------------

function filtersToParams(f: FilterState): URLSearchParams {
  const p = new URLSearchParams();
  if (f.search) p.set("q", f.search);
  if (f.scoreMin > 0) p.set("smin", String(f.scoreMin));
  if (f.scoreMax < 1) p.set("smax", String(f.scoreMax));
  if (f.categories.length) p.set("cat", f.categories.join(","));
  if (f.expiryWindow !== "all") p.set("exp", f.expiryWindow);
  if (f.jurisdictions.length) p.set("jur", f.jurisdictions.join(","));
  if (f.biosimilar !== "all") p.set("bio", f.biosimilar);
  if (f.trialPhases.length) p.set("phase", f.trialPhases.join(","));
  return p;
}

function paramsToFilters(p: URLSearchParams): FilterState {
  const smin = parseFloat(p.get("smin") ?? "0");
  const smax = parseFloat(p.get("smax") ?? "1");
  const exp = p.get("exp");
  return {
    search: p.get("q") ?? "",
    scoreMin: Number.isFinite(smin) ? Math.max(0, Math.min(1, smin)) : 0,
    scoreMax: Number.isFinite(smax) ? Math.max(0, Math.min(1, smax)) : 1,
    categories: p.get("cat")?.split(",").filter(Boolean) ?? [],
    expiryWindow: isExpiryWindow(exp) ? exp : "all",
    jurisdictions: p.get("jur")?.split(",").filter(Boolean) ?? [],
    biosimilar: (p.get("bio") as BiosimilarFilter) ?? "all",
    trialPhases: p.get("phase")?.split(",").filter(Boolean) ?? [],
  };
}

// ---------------------------------------------------------------------------
// Filter logic
// ---------------------------------------------------------------------------

function parseExpiryDate(expiry: string | null | undefined): Date | null {
  if (!expiry) return null;
  const parsed = new Date(expiry);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function applyFilters(
  results: CandidateResult[],
  f: FilterState,
): CandidateResult[] {
  const now = new Date();

  return results.filter((r) => {
    // Text search
    if (f.search) {
      const q = f.search.toLowerCase();
      const haystack = [
        r.display_label,
        r.target,
        r.indication?.join(" "),
        r.category,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    // Score range
    if (r.overall_score != null) {
      if (r.overall_score < f.scoreMin || r.overall_score > f.scoreMax)
        return false;
    } else {
      // If no score, exclude when user has narrowed the range
      if (f.scoreMin > 0 || f.scoreMax < 1) return false;
    }

    // Category
    if (f.categories.length > 0) {
      if (!r.category || !f.categories.includes(r.category)) return false;
    }

    // Patent expiry window
    if (f.expiryWindow !== "all") {
      const rawExpiry = r.earliest_patent_expiry;
      const expiry = parseExpiryDate(rawExpiry);
      if (f.expiryWindow === "unknown") {
        return rawExpiry == null || rawExpiry.trim().length === 0;
      }
      if (f.expiryWindow === "invalid") {
        return rawExpiry != null && rawExpiry.trim().length > 0 && expiry == null;
      }
      if (!rawExpiry || !expiry) return false;
      const cutoff = new Date(now);
      cutoff.setMonth(
        cutoff.getMonth() + EXPIRY_WINDOW_MONTHS[f.expiryWindow],
      );
      if (expiry > cutoff) return false;
    }

    // Jurisdiction
    if (f.jurisdictions.length > 0) {
      const codes = new Set(r.patents.map((p) => p.country_code));
      if (!f.jurisdictions.some((j) => codes.has(j))) return false;
    }

    // Biosimilar
    if (f.biosimilar === "has" && !r.has_approved_biosimilar) return false;
    if (f.biosimilar === "none" && r.has_approved_biosimilar) return false;

    // Trial phase
    if (f.trialPhases.length > 0) {
      const phases = new Set(r.trials.map((t) => t.phase));
      if (!f.trialPhases.some((p) => phases.has(p))) return false;
    }

    return true;
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FilterBar({ results, onFilter }: FilterBarProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [expanded, setExpanded] = useState(false);
  const [filters, setFilters] = useState<FilterState>(() =>
    paramsToFilters(searchParams),
  );
  const expiryImpact = useMemo(() => {
    const withoutExpiry = results.filter((r) => {
      const raw = r.earliest_patent_expiry;
      return raw == null || raw.trim().length === 0;
    }).length;
    const invalidExpiry = results.filter((r) => {
      const raw = r.earliest_patent_expiry;
      return raw != null && raw.trim().length > 0 && parseExpiryDate(raw) == null;
    }).length;
    const filtered = applyFilters(results, filters);
    return {
      withoutExpiry,
      invalidExpiry,
      hidden: Math.max(0, results.length - filtered.length),
    };
  }, [filters, results]);

  // Prevent re-applying URL update when we triggered it ourselves
  const selfUpdate = useRef(false);

  // Derive available options from results
  const availableCategories = useMemo(() => {
    const s = new Set<string>();
    for (const r of results) {
      if (r.category) s.add(r.category);
    }
    return Array.from(s).sort();
  }, [results]);

  const availableJurisdictions = useMemo(() => {
    const s = new Set<string>();
    for (const r of results) {
      for (const p of r.patents) {
        s.add(p.country_code);
      }
    }
    return Array.from(s).sort();
  }, [results]);

  const availableTrialPhases = useMemo(() => {
    const s = new Set<string>();
    for (const r of results) {
      for (const t of r.trials) {
        if (t.phase) s.add(t.phase);
      }
    }
    return Array.from(s).sort();
  }, [results]);

  // Sync URL -> state when navigating (back/forward)
  useEffect(() => {
    if (selfUpdate.current) {
      selfUpdate.current = false;
      return;
    }
    setFilters(paramsToFilters(searchParams));
  }, [searchParams]);

  // Apply filters and sync state -> URL
  useEffect(() => {
    const filtered = applyFilters(results, filters);
    onFilter(filtered);

    const currentParams = new URLSearchParams(searchParams.toString());
    const filterParams = filtersToParams(filters);

    for (const key of FILTER_PARAM_KEYS) {
      currentParams.delete(key);
    }
    for (const [key, value] of filterParams.entries()) {
      currentParams.set(key, value);
    }

    const qs = currentParams.toString();
    const target = qs ? `${pathname}?${qs}` : pathname;
    const currentUrl = searchParams.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname;

    if (target === currentUrl) return;

    selfUpdate.current = true;
    router.replace(target, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, results, pathname, searchParams]);

  // Update helpers
  const update = useCallback((patch: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const toggleInList = useCallback(
    (key: "categories" | "jurisdictions" | "trialPhases", value: string) => {
      setFilters((prev) => {
        const list = prev[key];
        return {
          ...prev,
          [key]: list.includes(value)
            ? list.filter((v) => v !== value)
            : [...list, value],
        };
      });
    },
    [],
  );

  const clearAll = useCallback(() => {
    setFilters(DEFAULT_FILTER);
  }, []);

  // Active filter chips
  const chips: { label: string; onRemove: () => void }[] = [];

  if (filters.search) {
    chips.push({
      label: `Search: "${filters.search}"`,
      onRemove: () => update({ search: "" }),
    });
  }
  if (filters.scoreMin > 0 || filters.scoreMax < 1) {
    chips.push({
      label: `Score: ${filters.scoreMin}–${filters.scoreMax}`,
      onRemove: () => update({ scoreMin: 0, scoreMax: 1 }),
    });
  }
  for (const cat of filters.categories) {
    chips.push({
      label: `Category: ${cat}`,
      onRemove: () => toggleInList("categories", cat),
    });
  }
  if (filters.expiryWindow !== "all") {
    chips.push({
      label: `Expiry: ${EXPIRY_WINDOW_LABELS[filters.expiryWindow]}`,
      onRemove: () => update({ expiryWindow: "all" }),
    });
  }
  for (const jur of filters.jurisdictions) {
    chips.push({
      label: `Jurisdiction: ${jur}`,
      onRemove: () => toggleInList("jurisdictions", jur),
    });
  }
  if (filters.biosimilar !== "all") {
    chips.push({
      label: filters.biosimilar === "has" ? "Has biosimilar" : "No biosimilar",
      onRemove: () => update({ biosimilar: "all" }),
    });
  }
  for (const ph of filters.trialPhases) {
    chips.push({
      label: `Phase: ${ph}`,
      onRemove: () => toggleInList("trialPhases", ph),
    });
  }

  const hasActive = chips.length > 0;

  // Shared styles
  const inputCls =
    "rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors";
  const labelCls =
    "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1";
  const checkboxCls =
    "h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800";

  return (
    <div className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 transition-colors">
      {/* Header row: search + toggle */}
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Text search */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            placeholder="Search drug, target, indication, category..."
            className={`${inputCls} w-full pl-9`}
            aria-label="Text search"
          />
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
        </div>

        <div className="flex items-center gap-2">
          {hasActive && (
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              Clear all
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded((p) => !p)}
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            aria-expanded={expanded}
          >
            <svg
              className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 8.25l-7.5 7.5-7.5-7.5"
              />
            </svg>
            Filters
            {hasActive && (
              <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-xs font-semibold text-blue-700 dark:text-blue-300">
                {chips.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Active filter chips */}
      {hasActive && (
        <div className="flex flex-wrap gap-2 px-4 pb-3">
          {chips.map((chip) => (
            <FilterChip
              key={chip.label}
              label={chip.label}
              onRemove={chip.onRemove}
            />
          ))}
        </div>
      )}

      {/* Collapsible filter controls */}
      {expanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {/* Score range */}
            <div>
              <label className={labelCls}>Score range</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.1}
                  value={filters.scoreMin}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (Number.isFinite(v))
                      update({ scoreMin: Math.max(0, Math.min(1, v)) });
                  }}
                  className={`${inputCls} w-20 tabular-nums`}
                  aria-label="Minimum score"
                />
                <span className="text-gray-400 dark:text-gray-500">to</span>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.1}
                  value={filters.scoreMax}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (Number.isFinite(v))
                      update({ scoreMax: Math.max(0, Math.min(1, v)) });
                  }}
                  className={`${inputCls} w-20 tabular-nums`}
                  aria-label="Maximum score"
                />
              </div>
            </div>

            {/* Category */}
            {availableCategories.length > 0 && (
              <div>
                <label className={labelCls}>Category</label>
                <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
                  {availableCategories.map((cat) => (
                    <label
                      key={cat}
                      className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={filters.categories.includes(cat)}
                        onChange={() => toggleInList("categories", cat)}
                        className={checkboxCls}
                      />
                      {cat}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Patent expiry window */}
            <div>
              <label className={labelCls}>Patent expiry window</label>
              <select
                value={filters.expiryWindow}
                onChange={(e) =>
                  update({ expiryWindow: e.target.value as ExpiryWindow })
                }
                className={inputCls}
                aria-label="Patent expiry window"
              >
                {(
                  Object.entries(EXPIRY_WINDOW_LABELS) as [
                    ExpiryWindow,
                    string,
                  ][]
                ).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Hidden: {expiryImpact.hidden} rows. Unknown expiry: {expiryImpact.withoutExpiry}. Invalid expiry: {expiryImpact.invalidExpiry}.
              </p>
            </div>

            {/* Jurisdiction */}
            {availableJurisdictions.length > 0 && (
              <div>
                <label className={labelCls}>Jurisdiction</label>
                <div className="flex flex-wrap gap-x-3 gap-y-1 max-h-36 overflow-y-auto">
                  {availableJurisdictions.map((jur) => (
                    <label
                      key={jur}
                      className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={filters.jurisdictions.includes(jur)}
                        onChange={() => toggleInList("jurisdictions", jur)}
                        className={checkboxCls}
                      />
                      {jur}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Biosimilar toggle */}
            <div>
              <label className={labelCls}>Biosimilar status</label>
              <div className="flex gap-1">
                {(
                  [
                    ["all", "All"],
                    ["has", "Has biosimilar"],
                    ["none", "No biosimilar"],
                  ] as [BiosimilarFilter, string][]
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => update({ biosimilar: value })}
                    aria-pressed={filters.biosimilar === value}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      filters.biosimilar === value
                        ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700"
                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Trial phase */}
            {availableTrialPhases.length > 0 && (
              <div>
                <label className={labelCls}>Trial phase</label>
                <div className="flex flex-wrap gap-x-3 gap-y-1 max-h-36 overflow-y-auto">
                  {availableTrialPhases.map((ph) => (
                    <label
                      key={ph}
                      className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={filters.trialPhases.includes(ph)}
                        onChange={() => toggleInList("trialPhases", ph)}
                        className={checkboxCls}
                      />
                      {ph}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
