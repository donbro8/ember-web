"use client";

import type { CandidateResult } from "@/lib/types";
import Badge from "@/components/ui/Badge";
import {
  clinicalTrialsStudyUrl,
  doiUrl,
  normalizeSafeHttpUrl,
  pubMedUrl,
} from "@/components/dashboard/linkSafety";

interface RowExpansionProps {
  result: CandidateResult;
}

interface VerifiedLink {
  label: string;
  url: string | null;
  verified: boolean;
}

function normalizeLinks(value: unknown, fallbackLabel: string): VerifiedLink[] {
  if (!Array.isArray(value)) return [];
  const links: VerifiedLink[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const map = item as Record<string, unknown>;
    const safeUrl = normalizeSafeHttpUrl(map.url);
    links.push({
      label:
        typeof map.label === "string" && map.label.trim().length > 0
          ? map.label.trim()
          : fallbackLabel,
      url: safeUrl,
      verified: Boolean(map.verified ?? map.is_verified ?? false),
    });
  }
  return links;
}

function dedupeLinks(links: VerifiedLink[]): VerifiedLink[] {
  const seen = new Map<string, VerifiedLink>();
  const rejected: VerifiedLink[] = [];
  for (const link of links) {
    if (!link.url) {
      rejected.push(link);
      continue;
    }
    const existing = seen.get(link.url);
    if (!existing || link.verified) {
      seen.set(link.url, link);
    }
  }
  return Array.from(seen.values()).concat(rejected);
}

function toStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item : null))
      .filter((item): item is string => Boolean(item));
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    const truthyKeys = entries
      .filter(([, flag]) => {
        if (typeof flag === "boolean") {
          return flag;
        }
        if (typeof flag === "number") {
          return flag > 0;
        }
        if (typeof flag === "string") {
          return flag.trim().length > 0;
        }
        return flag != null;
      })
      .map(([key]) => key)
      .filter(Boolean);
    if (truthyKeys.length > 0) {
      return truthyKeys;
    }
    return entries.map(([key]) => key).filter(Boolean);
  }

  return [];
}

function regulatoryContextText(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (value && typeof value === "object") {
    const map = value as Record<string, unknown>;
    const preferredFields = [
      "summary",
      "note",
      "description",
      "context",
      "framework",
      "regime",
    ];
    for (const field of preferredFields) {
      const candidate = map[field];
      if (typeof candidate === "string" && candidate.trim().length > 0) {
        return candidate.trim();
      }
    }
    const pairs = Object.entries(map)
      .filter(([, val]) => val != null)
      .map(([key, val]) => `${key}: ${String(val)}`);
    if (pairs.length > 0) {
      return pairs.join("; ");
    }
  }

  return null;
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
  const dynamic = result as CandidateResult & Record<string, unknown>;
  const populatedJurisdictions = toStringList(
    result.jurisdictions ??
    result.jurisdictions_populated ??
    Array.from(new Set(result.patents.map((p) => p.country_code))).sort()
  );
  const missingJurisdictions = toStringList(
    result.missing_jurisdictions ?? result.jurisdictions_missing ?? [],
  );
  const unknownJurisdictions = toStringList(result.unknown_jurisdictions ?? []);
  const expiryDerivationMethod =
    result.earliest_patent_expiry_derivation_method ??
    result.expiry_derivation_method;
  const hasVerifiedDate = Boolean(result.earliest_patent_expiry_verified_date);
  const frameworkRegulatoryContext = regulatoryContextText(
    result.framework_regulatory_context ??
      result.regulatory_context?.data_exclusivity_framework_note ??
      result.regulatory_context?.regulatory_summary,
  );
  const hasRegulatoryContext =
    result.regulatory_context != null ||
    frameworkRegulatoryContext != null ||
    result.data_exclusivity_regime != null ||
    result.data_exclusivity_expiry != null ||
    expiryDerivationMethod != null ||
    hasVerifiedDate ||
    populatedJurisdictions.length > 0 ||
    missingJurisdictions.length > 0 ||
    unknownJurisdictions.length > 0;
  const patentLinks = dedupeLinks(
    result.patents
      .map((p) => {
        const safeUrl = normalizeSafeHttpUrl(p.url);
        return {
          label: `${p.country_code} ${p.publication_number}`,
          url: safeUrl,
          verified: true,
        };
      })
      .filter((item): item is VerifiedLink => Boolean(item)),
  );
  const trialLinks = dedupeLinks(
    result.trials
      .map((t) => {
        const safeUrl = normalizeSafeHttpUrl(t.url) ?? clinicalTrialsStudyUrl(t.nct_id);
        return {
          label: t.nct_id,
          url: safeUrl,
          verified: true,
        };
      })
      .filter((item): item is VerifiedLink => Boolean(item)),
  );
  const articleLinks = dedupeLinks(
    result.articles.reduce<VerifiedLink[]>((acc, a) => {
        const safeArticleUrl = normalizeSafeHttpUrl(a.url);
        if (safeArticleUrl) {
          acc.push({ label: a.title, url: safeArticleUrl, verified: true });
          return acc;
        }
        const safeDoiUrl = doiUrl(a.doi);
        if (safeDoiUrl) {
          acc.push({ label: `${a.title} (DOI)`, url: safeDoiUrl, verified: true });
          return acc;
        }
        const safePubMedUrl = pubMedUrl(a.pmid);
        if (safePubMedUrl) {
          acc.push({ label: `${a.title} (PubMed)`, url: safePubMedUrl, verified: true });
          return acc;
        }
        return acc;
      }, []),
  );
  const targetLinks = dedupeLinks(
    normalizeLinks(dynamic.target_links, "Target reference").concat(
      normalizeLinks(dynamic.target_source_links, "Target reference"),
    ),
  );
  const drugDatabaseLinks = dedupeLinks(
    normalizeLinks(dynamic.drug_database_links, "Drug database").concat(
      normalizeLinks(dynamic.drug_links, "Drug database"),
    ),
  );
  const verifiedSourceLinks = dedupeLinks(
    normalizeLinks(dynamic.verified_source_links, "Verified source").concat(
      result.sources_contributed.map((source, i) => {
        const url = normalizeSafeHttpUrl(result.source_urls[i]);
        return { label: source, url, verified: false };
      }),
    ),
  );

  const groupedEvidence: { heading: string; links: VerifiedLink[] }[] = [
    { heading: "Patent links", links: patentLinks },
    { heading: "Trial links", links: trialLinks },
    { heading: "Article links", links: articleLinks },
    { heading: "Target links", links: targetLinks },
    { heading: "Drug database links", links: drugDatabaseLinks },
    { heading: "Source links", links: verifiedSourceLinks },
  ].filter((group) => group.links.length > 0);

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
                {result.patents.map((p, i) => {
                  const safePatentUrl = normalizeSafeHttpUrl(p.url);
                  return (
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
                          {safePatentUrl ? (
                            <a
                              href={safePatentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              Google Patents
                            </a>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">Unavailable</span>
                          )}
                        </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Jurisdiction Gaps + Regulatory Context */}
      {hasRegulatoryContext && (
        <section>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Jurisdiction Coverage &amp; Regulatory Context
          </h4>
          <div className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 space-y-3 text-sm">
            <div>
              <p className="font-medium text-gray-800 dark:text-gray-200">
                Jurisdictions with patent records
              </p>
              {populatedJurisdictions.length > 0 ? (
                <p className="text-gray-700 dark:text-gray-300">
                  {populatedJurisdictions.join(", ")}
                </p>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">
                  No populated jurisdiction list is available for this result.
                </p>
              )}
            </div>

            <div>
              <p className="font-medium text-gray-800 dark:text-gray-200">
                Missing jurisdiction data (gaps)
              </p>
              {missingJurisdictions.length > 0 ? (
                <p className="text-gray-700 dark:text-gray-300">
                  {missingJurisdictions.join(", ")}
                </p>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">
                  No explicit gap list is provided. Missing entries do not imply no patent exists.
                </p>
              )}
            </div>

            <div>
              <p className="font-medium text-gray-800 dark:text-gray-200">
                Unknown jurisdiction coverage
              </p>
              {unknownJurisdictions.length > 0 ? (
                <p className="text-gray-700 dark:text-gray-300">
                  {unknownJurisdictions.join(", ")}
                </p>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">
                  No unknown jurisdiction list is provided. Unknown entries also do not imply no patent exists.
                </p>
              )}
            </div>

            {expiryDerivationMethod && (
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-200">
                  Expiry derivation method
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  {expiryDerivationMethod}
                </p>
              </div>
            )}

            {result.earliest_patent_expiry_verified_date && (
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-200">
                  Earliest patent expiry (verified date)
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  {result.earliest_patent_expiry_verified_date}
                </p>
              </div>
            )}

            {(frameworkRegulatoryContext ||
              result.data_exclusivity_regime ||
              result.data_exclusivity_expiry ||
              result.regulatory_context) && (
              <div className="space-y-1">
                <p className="font-medium text-gray-800 dark:text-gray-200">
                  Data exclusivity and regulatory context
                </p>
                {result.data_exclusivity_regime && (
                  <p className="text-gray-700 dark:text-gray-300">
                    Regime: {result.data_exclusivity_regime}
                  </p>
                )}
                {result.data_exclusivity_expiry && (
                  <p className="text-gray-700 dark:text-gray-300">
                    Data exclusivity expiry: {result.data_exclusivity_expiry}
                  </p>
                )}
                {frameworkRegulatoryContext && (
                  <p className="text-gray-700 dark:text-gray-300">
                    Framework-level context: {frameworkRegulatoryContext}
                  </p>
                )}
                {result.regulatory_context?.data_exclusivity_verified_product ? (
                  <p className="text-gray-700 dark:text-gray-300">
                    Product-level verification:{" "}
                    {result.regulatory_context.data_exclusivity_verified_note ??
                      "verified for this product."}
                  </p>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">
                    Product-level verification is not confirmed; treat this as framework-level context.
                  </p>
                )}
              </div>
            )}

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Approximate dates are shown with the \u2248 prefix, while verified dates are shown without it.
            </p>
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
            {result.trials.map((t, i) => {
              const safeTrialUrl = clinicalTrialsStudyUrl(t.nct_id);
              return (
                <li
                  key={`${t.nct_id}-${i}`}
                  className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    {safeTrialUrl ? (
                      <a
                        href={safeTrialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {t.nct_id}
                      </a>
                    ) : (
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {t.nct_id}
                      </span>
                    )}
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
              );
            })}
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
            {result.articles.map((a, i) => {
              const safeDoiUrl = doiUrl(a.doi);
              const safePubMedUrl = pubMedUrl(a.pmid);
              return (
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
                    {safeDoiUrl && (
                      <a
                        href={safeDoiUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        DOI
                      </a>
                    )}
                    {safePubMedUrl && (
                      <a
                        href={safePubMedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        PubMed
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
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
      {groupedEvidence.length > 0 && (
        <section>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Evidence Links
          </h4>
          <div className="grid gap-3 md:grid-cols-2">
            {groupedEvidence.map((group) => (
              <div key={group.heading} className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                  {group.heading}
                </p>
                <ul className="space-y-1">
                  {group.links.map((link) => (
                    <li key={`${group.heading}-${link.url ?? `unavailable-${link.label}`}`} className="text-sm text-gray-700 dark:text-gray-300">
                      {link.url ? (
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">
                          {link.label} (Unavailable)
                        </span>
                      )}
                      <span className={`ml-2 text-xs ${link.verified ? "text-green-700 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}`}>
                        {link.verified ? "verified" : "unverified"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
