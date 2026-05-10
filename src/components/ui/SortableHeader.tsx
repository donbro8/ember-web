"use client";

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  currentSort: { key: string; direction: "asc" | "desc" } | null;
  onSort: (key: string) => void;
}

export default function SortableHeader({
  label,
  sortKey,
  currentSort,
  onSort,
}: SortableHeaderProps) {
  const isActive = currentSort?.key === sortKey;
  const direction = isActive ? currentSort.direction : null;

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      aria-label={`Sort by ${label}${isActive ? `, currently ${direction === "asc" ? "ascending" : "descending"}` : ""}`}
      className={`inline-flex items-center gap-1 text-left text-sm font-semibold select-none transition-colors ${
        isActive
          ? "text-blue-600 dark:text-blue-400"
          : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
      }`}
    >
      {label}
      <span className="inline-flex flex-col text-[10px] leading-none">
        <span
          className={
            direction === "asc"
              ? "text-blue-600 dark:text-blue-400"
              : "text-gray-300 dark:text-gray-600"
          }
        >
          ▲
        </span>
        <span
          className={
            direction === "desc"
              ? "text-blue-600 dark:text-blue-400"
              : "text-gray-300 dark:text-gray-600"
          }
        >
          ▼
        </span>
      </span>
    </button>
  );
}
