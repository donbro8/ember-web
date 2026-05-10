"use client";

import { useCallback, useEffect, useState } from "react";

import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { getChanges } from "@/lib/api";
import type { ChangeEntry } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

function dotColor(changeType: string): string {
  switch (changeType) {
    case "new_candidate":
      return "bg-green-500";
    case "removed_candidate":
      return "bg-red-500";
    case "score_change":
      return "bg-amber-500";
    case "new_jurisdiction":
    case "new_trial":
    case "new_biosimilar_competitor":
    case "patent_expiry_update":
      return "bg-blue-500";
    default:
      return "bg-gray-400";
  }
}

function badgeVariant(changeType: string): BadgeVariant {
  switch (changeType) {
    case "new_candidate":
      return "success";
    case "removed_candidate":
      return "danger";
    case "score_change":
      return "warning";
    case "new_jurisdiction":
    case "new_trial":
    case "new_biosimilar_competitor":
    case "patent_expiry_update":
      return "info";
    default:
      return "default";
  }
}

/** Format a change_type string for display (e.g. "new_candidate" -> "New Candidate"). */
function formatChangeType(changeType: string): string {
  return changeType
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Group date key from an ISO timestamp. */
function dateKey(iso: string): string {
  const d = new Date(iso);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Format a date group key to a human-readable header. */
function formatDateHeader(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

/** Produce a relative timestamp string such as "2 hours ago". */
function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffSeconds = Math.round((then - now) / 1000);

  const units: { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] = [
    { unit: "year", seconds: 60 * 60 * 24 * 365 },
    { unit: "month", seconds: 60 * 60 * 24 * 30 },
    { unit: "week", seconds: 60 * 60 * 24 * 7 },
    { unit: "day", seconds: 60 * 60 * 24 },
    { unit: "hour", seconds: 60 * 60 },
    { unit: "minute", seconds: 60 },
  ];

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  for (const { unit, seconds } of units) {
    if (Math.abs(diffSeconds) >= seconds) {
      const value = Math.round(diffSeconds / seconds);
      return rtf.format(value, unit);
    }
  }
  return rtf.format(diffSeconds, "second");
}

/** Group changes by date, preserving chronological order (most recent first). */
function groupByDate(
  changes: ChangeEntry[],
): { date: string; entries: ChangeEntry[] }[] {
  const map = new Map<string, ChangeEntry[]>();
  // Changes are assumed sorted by created_at descending from the API.
  for (const entry of changes) {
    const key = dateKey(entry.created_at);
    const list = map.get(key);
    if (list) {
      list.push(entry);
    } else {
      map.set(key, [entry]);
    }
  }
  return Array.from(map.entries()).map(([date, entries]) => ({ date, entries }));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ChangesFeedProps {
  watchId: string;
}

export default function ChangesFeed({ watchId }: ChangesFeedProps) {
  const [changes, setChanges] = useState<ChangeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChanges = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getChanges(watchId);
      setChanges(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load changes");
    } finally {
      setLoading(false);
    }
  }, [watchId]);

  useEffect(() => {
    fetchChanges();
  }, [fetchChanges]);

  // -- Loading state --
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <svg
          className="h-6 w-6 animate-spin text-gray-400 dark:text-gray-500"
          xmlns="http://www.w3.org/2000/svg"
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
        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
          Loading changes...
        </span>
      </div>
    );
  }

  // -- Error state --
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <button
          type="button"
          onClick={fetchChanges}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // -- Empty state --
  if (changes.length === 0) {
    return (
      <EmptyState
        title="No changes detected"
        description="Changes will appear here after multiple runs have been compared."
      />
    );
  }

  // -- Feed --
  const groups = groupByDate(changes);

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.date}>
          <h3 className="mb-3 text-sm font-semibold text-gray-500 dark:text-gray-400">
            {formatDateHeader(group.date)}
          </h3>
          <ul className="space-y-3">
            {group.entries.map((entry) => (
              <li
                key={entry.change_id}
                className="flex items-start gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3"
              >
                {/* Colored dot */}
                <span
                  className={`mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${dotColor(entry.change_type)}`}
                  aria-hidden="true"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      label={formatChangeType(entry.change_type)}
                      variant={badgeVariant(entry.change_type)}
                    />
                    <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                      {entry.display_label}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {relativeTime(entry.created_at)}
                    </span>
                  </div>
                  {entry.detail && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      {entry.detail}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
