"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { WatchConfig } from "@/lib/types";
import { deleteWatch, getWatches, triggerRun, updateWatch } from "@/lib/api";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";

const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

function ordinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatSchedule(watch: WatchConfig): string {
  if (watch.schedule === "weekly") {
    const day =
      watch.schedule_day !== null && watch.schedule_day >= 0 && watch.schedule_day <= 6
        ? DAY_NAMES[watch.schedule_day]
        : "Monday";
    return `Weekly on ${day}`;
  }
  const day = watch.schedule_day ?? 1;
  return `Monthly on the ${ordinalSuffix(day)}`;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return "1 month ago";
  return `${months} months ago`;
}

interface WatchListProps {
  onCreateClick: () => void;
  refreshKey?: number;
}

export default function WatchList({ onCreateClick, refreshKey }: WatchListProps) {
  const [watches, setWatches] = useState<WatchConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set());
  const [runErrors, setRunErrors] = useState<Record<string, string>>({});

  const fetchWatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getWatches();
      setWatches(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load watches");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWatches();
  }, [fetchWatches, refreshKey]);

  const handleToggle = async (watch: WatchConfig) => {
    try {
      const updated = await updateWatch(watch.watch_id, {
        enabled: !watch.enabled,
      });
      setWatches((prev) =>
        prev.map((w) => (w.watch_id === updated.watch_id ? updated : w)),
      );
    } catch {
      // Silently revert -- the UI stays in sync because we only update on success
    }
  };

  const handleRunNow = async (watchId: string) => {
    setRunningIds((prev) => new Set(prev).add(watchId));
    setRunErrors((prev) => {
      const next = { ...prev };
      delete next[watchId];
      return next;
    });
    try {
      await triggerRun(watchId);
    } catch (err) {
      const msg =
        err instanceof Error && err.message.includes("429")
          ? "Rate limit exceeded \u2014 max 3 runs per 24 hours"
          : "Failed to trigger run";
      setRunErrors((prev) => ({ ...prev, [watchId]: msg }));
    } finally {
      setRunningIds((prev) => {
        const next = new Set(prev);
        next.delete(watchId);
        return next;
      });
    }
  };

  const handleDelete = async (watch: WatchConfig) => {
    if (!confirm(`Delete watch "${watch.name}"? This cannot be undone.`)) return;
    try {
      await deleteWatch(watch.watch_id);
      setWatches((prev) => prev.filter((w) => w.watch_id !== watch.watch_id));
    } catch {
      // keep in list on failure
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <svg
          className="h-6 w-6 animate-spin text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
        <button
          type="button"
          onClick={fetchWatches}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (watches.length === 0) {
    return (
      <EmptyState
        title="No watches yet"
        description="Create a watch to monitor biotech data on a schedule."
        action={{ label: "Create Watch", onClick: onCreateClick }}
      />
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-end">
        <button
          type="button"
          onClick={onCreateClick}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Create Watch
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Name
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Schedule
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Last Run
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Status
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
            {watches.map((watch) => (
              <tr key={watch.watch_id}>
                <td className="whitespace-nowrap px-4 py-3">
                  <Link
                    href={`/dashboard?watch_id=${watch.watch_id}`}
                    className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {watch.name}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                  {formatSchedule(watch)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  {watch.last_run_at ? timeAgo(watch.last_run_at) : "Never"}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <Badge
                    label={watch.enabled ? "Enabled" : "Disabled"}
                    variant={watch.enabled ? "success" : "default"}
                  />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggle(watch)}
                      aria-label={`${watch.enabled ? "Disable" : "Enable"} ${watch.name}`}
                      className="rounded px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
                    >
                      {watch.enabled ? "Disable" : "Enable"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRunNow(watch.watch_id)}
                      disabled={runningIds.has(watch.watch_id)}
                      aria-label={`Run ${watch.name} now`}
                      className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 disabled:opacity-50 transition-colors"
                    >
                      {runningIds.has(watch.watch_id) ? (
                        <span className="flex items-center gap-1">
                          <svg
                            className="h-3 w-3 animate-spin"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                          </svg>
                          Running
                        </span>
                      ) : (
                        "Run now"
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(watch)}
                      aria-label={`Delete ${watch.name}`}
                      className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                  {runErrors[watch.watch_id] && (
                    <p className="mt-1 text-xs text-red-500 dark:text-red-400">
                      {runErrors[watch.watch_id]}
                    </p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
