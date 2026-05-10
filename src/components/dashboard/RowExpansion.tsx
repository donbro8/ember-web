"use client";

import type { CandidateResult } from "@/lib/types";
import Badge from "@/components/ui/Badge";

interface RowExpansionProps {
  result: CandidateResult;
}

/** Map patent status to Badge variant. */
function statusVariant(
  status: string,
): "default" | "success" | "warning" | "danger" | "info" {
  switch (status) {
    case "active":
      return "success";
    case "expired":
      return "danger";
    case "pending":
      return "warning";
    default:
      return "default";
  }
}

/** Render a score bar (0-1 scale). */
function ScoreBar({ label, value }: { label: string; value: number | null }) {
  if (value == null) {
    return (
      <div className="flex items-center gap-3">
        <span className="w-32 text-sm text-gray-600 dark:text-gray-400">
          {label}
        </span>
        <span className="text-sm text-gray-400 dark:text-gray-500">&mdash;</span>
      </div>
    );
  }
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 shrink-0 text-sm text-gray-600 dark:text-gray-400">
        {label}
      </span>
      <div className="h-2.5 w-48 rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className="h-2.5 rounded-full bg-blue-500 dark:bg-blue-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm tabular-nums text-gray-700 dark:text-gray-300">
        {value.toFixed(2)}
      </span>
    </div>
  );
}

export default function RowExpansion({ result }: RowExpansionProps) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800/40 px-6 py-5 space-y-6 border-t border-gray-200 dark:border-gray-700">
      {/* Patent Jurisdictions */}
      {result.patents.length > 0 && (
        <section>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Patent Jurisdictions
          </h4>
          <div className="overflow-x-auto rounded border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Country</th>
                  <th scope="col" className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Publication #</th>
                  <th scope="col" className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Filing Date</th>
                  <th scope="col" className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Grant Date</th>
                  <th scope="col" className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Expiry Date</th>
                  <th scope="col" className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Status</th>
                  <th scope="col" className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                {result.patents.map((p, i) => (
                  <tr key={`${p.publication_number}-${i}`}>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {p.country_name} ({p.country_code})
                    </td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {p.publication_number}
                    </td>
                    <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {p.filing_date ?? "\u2014"}
                    </td>
                    <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {p.grant_date ?? "\u2014"}
                    </td>
                    <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {p.expiry_date
                        ? `${p.expiry_date_approximate ? "\u2248" : ""}${p.expiry_date}`
                        : "\u2014"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <Badge label={p.status} variant={statusVariant(p.status)} />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Google Patents
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Clinical Trials */}
      {result.trials.length > 0 && (
        <section>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Clinical Trials
          </h4>
          <ul className="space-y-2">
            {result.trials.map((t, i) => (
              <li
                key={`${t.nct_id}-${i}`}
                className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <a
                    href={`https://clinicaltrials.gov/study/${t.nct_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {t.nct_id}
                  </a>
                  {t.phase && (
                    <span className="text-gray-600 dark:text-gray-400">
                      Phase: {t.phase}
                    </span>
                  )}
                  {t.status && (
                    <span className="text-gray-600 dark:text-gray-400">
                      Status: {t.status}
                    </span>
                  )}
                </div>
                {(t.indication || t.sponsor) && (
                  <div className="mt-1 flex flex-wrap gap-x-3 text-gray-500 dark:text-gray-400">
                    {t.indication && <span>Indication: {t.indication}</span>}
                    {t.sponsor && <span>Sponsor: {t.sponsor}</span>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Articles */}
      {result.articles.length > 0 && (
        <section>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Articles
          </h4>
          <ul className="space-y-2">
            {result.articles.map((a, i) => (
              <li
                key={`${a.pmid ?? a.doi ?? i}`}
                className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              >
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {a.title}
                </p>
                <div className="mt-1 flex flex-wrap gap-x-3 text-gray-500 dark:text-gray-400">
                  {a.journal && <span>{a.journal}</span>}
                  {a.year != null && <span>{a.year}</span>}
                  {a.doi && (
                    <a
                      href={`https://doi.org/${a.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      DOI
                    </a>
                  )}
                  {a.pmid && (
                    <a
                      href={`https://pubmed.ncbi.nlm.nih.gov/${a.pmid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      PubMed
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Score Breakdown */}
      <section>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Score Breakdown
        </h4>
        <div className="space-y-2">
          <ScoreBar label="Structured" value={result.structured_score} />
          <ScoreBar label="Semantic" value={result.semantic_score} />
          <ScoreBar label="Evidence" value={result.evidence_score} />
        </div>
      </section>

      {/* Synthesis Summary */}
      {result.synthesis_summary && (
        <section>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Synthesis Summary
          </h4>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {result.synthesis_summary}
          </p>
        </section>
      )}

      {/* Sources */}
      {result.sources_contributed.length > 0 && (
        <section>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Sources
          </h4>
          <ul className="space-y-1">
            {result.sources_contributed.map((source, i) => {
              const url = result.source_urls[i] ?? null;
              return (
                <li key={`${source}-${i}`} className="text-sm text-gray-700 dark:text-gray-300">
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {source}
                    </a>
                  ) : (
                    source
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
