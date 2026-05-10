"use client";

import { useEffect, useRef, useState } from "react";
import type { WatchConfig } from "@/lib/types";
import { createWatch, updateWatch } from "@/lib/api";

const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

interface WatchFormProps {
  onClose: () => void;
  onSaved: () => void;
  editWatch?: WatchConfig;
}

export default function WatchForm({
  onClose,
  onSaved,
  editWatch,
}: WatchFormProps) {
  const [name, setName] = useState(editWatch?.name ?? "");
  const [query, setQuery] = useState(editWatch?.query ?? "");
  const [schedule, setSchedule] = useState<"weekly" | "monthly">(
    editWatch?.schedule ?? "weekly",
  );
  const [scheduleDay, setScheduleDay] = useState<number>(
    editWatch?.schedule_day ?? (editWatch?.schedule === "monthly" ? 1 : 0),
  );
  const [notifyOnChange, setNotifyOnChange] = useState(
    editWatch?.notify_on_change ?? true,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const overlayRef = useRef<HTMLDivElement>(null);

  // Reset day when schedule type changes (unless editing)
  useEffect(() => {
    if (!editWatch) {
      setScheduleDay(schedule === "weekly" ? 0 : 1);
    }
  }, [schedule, editWatch]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !query.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        query: query.trim(),
        schedule,
        schedule_day: scheduleDay,
        notify_on_change: notifyOnChange,
      };

      if (editWatch) {
        await updateWatch(editWatch.watch_id, payload);
      } else {
        await createWatch(payload);
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save watch",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isEdit = !!editWatch;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="watch-form-title"
    >
      <div className="w-full max-w-lg rounded-xl bg-white dark:bg-gray-800 shadow-xl">
        <form onSubmit={handleSubmit}>
          <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <h2 id="watch-form-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {isEdit ? "Edit Watch" : "Create Watch"}
            </h2>
          </div>

          <div className="space-y-4 px-6 py-4">
            {/* Name */}
            <div>
              <label
                htmlFor="watch-name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Name <span className="text-red-500">*</span>
              </label>
              <input
                id="watch-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. GLP-1 patent monitor"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Query */}
            <div>
              <label
                htmlFor="watch-query"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Query <span className="text-red-500">*</span>
              </label>
              <textarea
                id="watch-query"
                required
                rows={3}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Find biosimilar candidates for adalimumab with expiring patents"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Schedule type */}
            <div>
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Schedule
              </span>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="radio"
                    name="schedule"
                    value="weekly"
                    checked={schedule === "weekly"}
                    onChange={() => setSchedule("weekly")}
                    className="accent-blue-600"
                  />
                  Weekly
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="radio"
                    name="schedule"
                    value="monthly"
                    checked={schedule === "monthly"}
                    onChange={() => setSchedule("monthly")}
                    className="accent-blue-600"
                  />
                  Monthly
                </label>
              </div>
            </div>

            {/* Day selector */}
            <div>
              <label
                htmlFor="watch-day"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                {schedule === "weekly" ? "Day of week" : "Day of month"}
              </label>
              {schedule === "weekly" ? (
                <select
                  id="watch-day"
                  value={scheduleDay}
                  onChange={(e) => setScheduleDay(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {DAY_NAMES.map((day, i) => (
                    <option key={day} value={i}>
                      {day}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="watch-day"
                  type="number"
                  min={1}
                  max={28}
                  value={scheduleDay}
                  onChange={(e) => setScheduleDay(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              )}
            </div>

            {/* Notify on change */}
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={notifyOnChange}
                onChange={(e) => setNotifyOnChange(e.target.checked)}
                className="accent-blue-600"
              />
              Notify on change
            </label>

            {error && (
              <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim() || !query.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Saving..." : isEdit ? "Save Changes" : "Create Watch"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
