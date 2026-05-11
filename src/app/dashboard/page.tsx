"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

import type {
  CandidateResult,
  DigestOutput,
  RunSummary,
  WatchConfig,
} from "@/lib/types";
import { getDigest, getResults, getRuns, getWatch, getWatches } from "@/lib/api";

import ResultsTable from "@/components/dashboard/ResultsTable";
import FilterBar from "@/components/dashboard/FilterBar";
import RowExpansion from "@/components/dashboard/RowExpansion";
import ChangesFeed from "@/components/dashboard/ChangesFeed";
import CsvExport from "@/components/dashboard/CsvExport";
import RunSelector from "@/components/dashboard/RunSelector";
import SynthesisOverview from "@/components/dashboard/SynthesisOverview";
import EmptyState from "@/components/ui/EmptyState";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabKey = "results" | "changes";

function isTabKey(value: string | null): value is TabKey {
  return value === "results" || value === "changes";
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function TableSkeleton() {
  return (
    <div className="w-full animate-pulse space-y-3">
      <div className="h-10 rounded-lg bg-gray-200 dark:bg-gray-700" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-8 rounded bg-gray-100 dark:bg-gray-800"
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab bar
// ---------------------------------------------------------------------------

function TabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}) {
  const tabs: { key: TabKey; label: string }[] = [
    { key: "results", label: "Results" },
    { key: "changes", label: "Changes" },
  ];

  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <div className="-mb-px flex gap-6" role="tablist" aria-label="Dashboard tabs">
        {tabs.map((t) => {
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${t.key}`}
              id={`tab-${t.key}`}
              onClick={() => onTabChange(t.key)}
              className={`whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium transition-colors ${
                isActive
                  ? "border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard content (reads search params, must be inside Suspense)
// ---------------------------------------------------------------------------

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Read active URL params (these can change without remount)
  const watchId = searchParams.get("watch_id");
  const runIdFromParams = searchParams.get("run_id");
  const tabFromParamsRaw = searchParams.get("tab");
  const tabFromParams: TabKey = isTabKey(tabFromParamsRaw)
    ? tabFromParamsRaw
    : "results";
  const synthesisOverviewFromParams = searchParams.get("synthesis_overview");

  // Core state
  const [runId, setRunId] = useState<string | null>(runIdFromParams);
  const [activeTab, setActiveTab] = useState<TabKey>(tabFromParams);
  const isAggregateMode = !watchId && !runIdFromParams;

  // Data state
  const [watch, setWatch] = useState<WatchConfig | null>(null);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [results, setResults] = useState<CandidateResult[]>([]);
  const [digest, setDigest] = useState<DigestOutput | null>(null);
  const [watches, setWatches] = useState<WatchConfig[]>([]);
  const [filteredResults, setFilteredResults] = useState<CandidateResult[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [synthesisOverview, setSynthesisOverview] = useState<string | null>(synthesisOverviewFromParams);

  // Loading / error state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (isAggregateMode) {
        setWatch(null);
        setRuns([]);
        const [digestData, watchesData] = await Promise.all([
          getDigest(7),
          getWatches(),
        ]);
        setDigest(digestData);
        setWatches(watchesData);
        setResults([]);
        setFilteredResults([]);
        return;
      }

      setDigest(null);
      setWatches([]);
      if (!watchId) {
        setWatch(null);
        setRuns([]);
      }

      let effectiveRunId = runIdFromParams;

      // If we have a watch_id, fetch watch details and runs
      if (watchId) {
        const [watchData, runsData] = await Promise.all([
          getWatch(watchId),
          getRuns(watchId),
        ]);
        setWatch(watchData.watch);
        setRuns(runsData);

        // If no run_id specified, use the watch's last_run_id
        if (!effectiveRunId && watchData.watch.last_run_id) {
          effectiveRunId = watchData.watch.last_run_id;
          setRunId(effectiveRunId);
        }
      }

      // If we have a run_id, fetch results
      if (effectiveRunId) {
        const resultsData = await getResults(effectiveRunId);
        setResults(resultsData);
        setFilteredResults(resultsData);
      } else {
        setResults([]);
        setFilteredResults([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [isAggregateMode, runIdFromParams, watchId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Keep local state in sync with URL param transitions.
  useEffect(() => {
    setRunId(runIdFromParams);
    setExpandedId(null);
  }, [runIdFromParams]);

  useEffect(() => {
    setActiveTab(tabFromParams);
  }, [tabFromParams]);

  useEffect(() => {
    setSynthesisOverview(synthesisOverviewFromParams);
  }, [synthesisOverviewFromParams]);

  // -----------------------------------------------------------------------
  // Results fetching for run switching
  // -----------------------------------------------------------------------

  const fetchResultsForRun = useCallback(async (newRunId: string) => {
    setLoading(true);
    setError(null);
    setExpandedId(null);
    setSynthesisOverview(null);

    try {
      const resultsData = await getResults(newRunId);
      setResults(resultsData);
      setFilteredResults(resultsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load results");
    } finally {
      setLoading(false);
    }
  }, []);

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const handleTabChange = useCallback(
    (tab: TabKey) => {
      setActiveTab(tab);
      // Update URL with tab param while preserving other params
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      router.replace(`/dashboard?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const handleRunSelect = useCallback(
    (newRunId: string) => {
      setRunId(newRunId);
      // Update URL with new run_id
      const params = new URLSearchParams(searchParams.toString());
      params.set("run_id", newRunId);
      router.replace(`/dashboard?${params.toString()}`, { scroll: false });
      fetchResultsForRun(newRunId);
    },
    [router, searchParams, fetchResultsForRun],
  );

  const handleRowClick = useCallback((result: CandidateResult) => {
    setExpandedId((prev) =>
      prev === result.canonical_id ? null : result.canonical_id,
    );
  }, []);

  const handleFilter = useCallback((filtered: CandidateResult[]) => {
    setFilteredResults(filtered);
  }, []);

  // Find the expanded result for RowExpansion
  const expandedResult = useMemo(
    () =>
      expandedId
        ? results.find((r) => r.canonical_id === expandedId) ?? null
        : null,
    [expandedId, results],
  );

  // Derive change_summary for the current run
  const currentRunChangeSummary = useMemo(
    () => runs.find((r) => r.run_id === runId)?.change_summary ?? null,
    [runs, runId],
  );

  // Page title
  const pageTitle = watch?.name ?? (isAggregateMode ? "Dashboard Overview" : "Ad-hoc Results");

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {pageTitle}
        </h1>
        {watch?.query && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Query: {watch.query}
          </p>
        )}
      </div>

      {/* Tabs */}
      <TabBar activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Tab content */}
      <div className="mt-6">
        {activeTab === "results" && (
          <div className="space-y-4" role="tabpanel" id="tabpanel-results" aria-labelledby="tab-results">
            {/* Toolbar: RunSelector + CsvExport */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {!isAggregateMode && runs.length > 0 && (
                  <RunSelector
                    runs={runs}
                    currentRunId={runId}
                    onRunSelect={handleRunSelect}
                  />
                )}
              </div>
              {!isAggregateMode && <CsvExport results={filteredResults} />}
            </div>

            {/* Error state */}
            {error && (
              <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-red-700 dark:text-red-400">
                    {error}
                  </p>
                  <button
                    type="button"
                    onClick={fetchData}
                    className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            {/* Loading state */}
            {loading && <TableSkeleton />}

            {/* Results content */}
            {!loading && !error && isAggregateMode && (
              <div className="space-y-6">
                <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                    Aggregate Overview
                  </p>
                  <p className="mt-1 text-sm text-blue-900 dark:text-blue-100 leading-relaxed">
                    {digest?.summary ?? "No aggregate summary is available yet."}
                  </p>
                  <p className="mt-2 text-xs text-blue-700/80 dark:text-blue-300/80">
                    Based on {watches.length} configured watches over the last 7 days.
                  </p>
                </div>

                {(digest?.top_opportunities?.length ?? 0) > 0 && (
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Top Opportunities
                    </h2>
                    <ul className="mt-3 space-y-2">
                      {digest?.top_opportunities.map((item) => (
                        <li
                          key={`${item.watch_name}-${item.display_label}`}
                          className="rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2"
                        >
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {item.display_label}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-300">
                            {item.reason}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Watch: {item.watch_name}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {(digest?.per_watch?.length ?? 0) > 0 && (
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Watch Highlights
                    </h2>
                    <ul className="mt-3 space-y-3">
                      {digest?.per_watch.map((watchDigest) => (
                        <li key={watchDigest.watch_name} className="border-b border-gray-100 dark:border-gray-800 pb-3 last:border-0 last:pb-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {watchDigest.watch_name}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-300">
                            {watchDigest.summary}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Changes: {watchDigest.change_count}
                            {watchDigest.highlight ? ` • ${watchDigest.highlight}` : ""}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {((digest?.dashboard?.per_watch_latest_results?.length ?? 0) > 0 || watches.length > 0) && (
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Latest Watch Results
                    </h2>
                    {(digest?.per_watch?.length ?? 0) === 0 && (
                      <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                        No changes detected in the selected period. Latest watch run counts are shown below.
                      </p>
                    )}
                    {(digest?.dashboard?.per_watch_latest_results?.length ?? 0) > 0 ? (
                      <ul className="mt-3 space-y-3">
                        {digest?.dashboard?.per_watch_latest_results.map((item) => (
                          <li
                            key={`${item.watch_id}-${item.latest_run_id ?? "no-run"}`}
                            className="rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2"
                          >
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <Link
                                href={`/dashboard?watch_id=${encodeURIComponent(item.watch_id)}`}
                                className="text-sm font-medium text-blue-700 hover:underline dark:text-blue-300"
                              >
                                {item.watch_name}
                              </Link>
                              <span className="text-xs text-gray-500 dark:text-gray-400">•</span>
                              {item.latest_run_id ? (
                                <Link
                                  href={`/dashboard?run_id=${encodeURIComponent(item.latest_run_id)}`}
                                  className="text-xs text-blue-700 hover:underline dark:text-blue-300"
                                >
                                  {item.latest_run_id}
                                </Link>
                              ) : (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  No run yet
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                              Results: {item.result_count}
                              {item.latest_status ? ` • Status: ${item.latest_status}` : ""}
                              {item.suppressed_count > 0 ? ` • Suppressed: ${item.suppressed_count}` : ""}
                            </p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-xs text-gray-600 dark:text-gray-300">
                        Latest per-watch run details are not available yet.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {!loading && !error && !isAggregateMode && (
              <>
                {/* Synthesis overview */}
                <SynthesisOverview overview={synthesisOverview} />

                {/* FilterBar */}
                <FilterBar results={results} onFilter={handleFilter} />

                {/* ResultsTable */}
                <ResultsTable
                  results={filteredResults}
                  onRowClick={handleRowClick}
                  expandedId={expandedId}
                />

                {/* Row expansion panel (rendered below table) */}
                {expandedResult && (
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 px-4 py-2">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {expandedResult.display_label}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setExpandedId(null)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        aria-label="Close details"
                      >
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                    <RowExpansion result={expandedResult} />
                  </div>
                )}
              </>
            )}

            {/* Empty state when no results and not loading */}
            {!loading && !error && !isAggregateMode && results.length === 0 && (
              <EmptyState
                title="No results available"
                description={
                  runId
                    ? "This run produced no results."
                    : "Provide a run_id or watch_id to view results."
                }
              />
            )}
          </div>
        )}

        {activeTab === "changes" && (
          <div role="tabpanel" id="tabpanel-changes" aria-labelledby="tab-changes">
            {watchId ? (
              <ChangesFeed watchId={watchId} changeSummary={currentRunChangeSummary} />
            ) : (
              <EmptyState
                title="No watch selected"
                description="The Changes tab requires a watch_id. Navigate here from a watch to see changes between runs."
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page (wrapped in Suspense for useSearchParams)
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-10 rounded-lg bg-gray-200 dark:bg-gray-700" />
            <TableSkeleton />
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
