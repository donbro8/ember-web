"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { queryAgent } from "@/lib/api";

export default function QueryBuilder() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || loading) return;

    setError(null);
    setLoading(true);

    try {
      const data = await queryAgent(trimmed);
      router.push(`/dashboard?run_id=${encodeURIComponent(data.run_id)}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again.",
      );
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Describe what you're looking for..."
            aria-label="Search query"
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-base font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading && (
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
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
            )}
            {loading ? "Searching..." : "Search"}
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => setError(null)}
              className="mt-1 text-sm font-medium text-red-600 dark:text-red-400 underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}
      </form>

      <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        Try: &ldquo;PD-1 inhibitors with expiring patents&rdquo; or
        &ldquo;adalimumab biosimilar landscape&rdquo;
      </p>
    </div>
  );
}
