"use client";

import type { RunSummary } from "@/lib/types";

interface RunSelectorProps {
  runs: RunSummary[];
  currentRunId: string | null;
  onRunSelect: (runId: string) => void;
}

/** Format an ISO timestamp to a human-readable string. */
function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function RunSelector({
  runs,
  currentRunId,
  onRunSelect,
}: RunSelectorProps) {
  if (runs.length === 0) {
    return null;
  }

  return (
    <div className="inline-flex items-center gap-2">
      <label
        htmlFor="run-selector"
        className="text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        Run:
      </label>
      <select
        id="run-selector"
        value={currentRunId ?? ""}
        onChange={(e) => {
          if (e.target.value) {
            onRunSelect(e.target.value);
          }
        }}
        className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
      >
        {runs.map((run) => (
          <option key={run.run_id} value={run.run_id}>
            {formatTimestamp(run.created_at)} &mdash; {run.result_count} result
            {run.result_count !== 1 ? "s" : ""}
            {run.cached ? " (cached)" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
