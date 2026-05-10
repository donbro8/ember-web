"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

import type { CandidateResult, RunSummary, WatchConfig } from "@/lib/types";
import { getResults, getRuns, getWatch } from "@/lib/api";

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

  // Read initial URL params
  const initialWatchId = searchParams.get("watch_id");
  const initialRunId = searchParams.get("run_id");
  const initialTab = (searchParams.get("tab") as TabKey) || "results";
  const initialSynthesisOverview = searchParams.get("synthesis_overview");

  // Core state
  const [watchId] = useState<string | null>(initialWatchId);
  const [runId, setRunId] = useState<string | null>(initialRunId);
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  // Data state
  const [watch, setWatch] = useState<WatchConfig | null>(null);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [results, setResults] = useState<CandidateResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<CandidateResult[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [synthesisOverview, setSynthesisOverview] = useState<string | null>(initialSynthesisOverview);

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
      let effectiveRunId = initialRunId;

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
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
  const pageTitle = watch?.name ?? "Ad-hoc Results";

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
                {runs.length > 0 && (
                  <RunSelector
                    runs={runs}
                    currentRunId={runId}
                    onRunSelect={handleRunSelect}
                  />
                )}
              </div>
              <CsvExport results={filteredResults} />
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
            {!loading && !error && (
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
            {!loading && !error && results.length === 0 && (
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
