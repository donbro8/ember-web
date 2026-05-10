"use client";

interface FilterChipProps {
  label: string;
  onRemove: () => void;
}

export default function FilterChip({ label, onRemove }: FilterChipProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/40 px-3 py-1 text-sm text-blue-800 dark:text-blue-300 transition-colors hover:bg-blue-200 dark:hover:bg-blue-900/60">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="ml-0.5 inline-flex items-center justify-center rounded-full w-4 h-4 text-blue-600 dark:text-blue-400 hover:bg-blue-300 dark:hover:bg-blue-800 hover:text-blue-900 dark:hover:text-blue-200 transition-colors"
      >
        &times;
      </button>
    </span>
  );
}
