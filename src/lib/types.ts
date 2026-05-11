/**
 * TypeScript interfaces mirroring ember-data Pydantic models and API response shapes.
 *
 * Source models:
 *   - ember-data/src/ember_data/models/result.py
 *   - ember-data/src/ember_data/bigquery/change_detector.py
 *   - ember-data/src/ember_data/bigquery/watch_schema.py
 *   - ember-api/src/ember_api/routes/health.py
 */

// ---------------------------------------------------------------------------
// Patent & evidence sub-models
// ---------------------------------------------------------------------------

export interface PatentJurisdiction {
  country_code: string;
  country_name: string;
  publication_number: string;
  filing_date: string | null;
  grant_date: string | null;
  expiry_date: string | null;
  expiry_date_approximate: boolean;
  status: 'active' | 'expired' | 'pending';
  title: string | null;
  url: string;
}

export interface RegulatoryContext {
  data_exclusivity_framework_note: string | null;
  data_exclusivity_verified_product: boolean | null;
  data_exclusivity_verified_note: string | null;
  regulatory_summary: string | null;
}

export interface TrialSummary {
  nct_id: string;
  phase: string;
  status: string;
  indication: string | null;
  sponsor: string | null;
  url: string | null;
}

export interface ArticleSummary {
  pmid: string | null;
  title: string;
  journal: string | null;
  year: number | null;
  doi: string | null;
  url: string | null;
}

// ---------------------------------------------------------------------------
// CandidateResult
// ---------------------------------------------------------------------------

export interface CandidateResult {
  // Core identity
  drug_name: string | null;
  fda_generic_name: string | null;
  target: string | null;

  // Computed fields
  result_type: 'DRUG' | 'TARGET';
  canonical_id: string;
  display_label: string;

  // Patent data
  patents: PatentJurisdiction[];
  earliest_patent_expiry: string | null;
  earliest_expiry_jurisdiction: string | null;
  jurisdictions?: string[] | Record<string, unknown> | null;
  missing_jurisdictions?: string[] | Record<string, unknown> | null;
  unknown_jurisdictions?: string[] | Record<string, unknown> | null;
  earliest_patent_expiry_derivation_method?: string | null;
  earliest_patent_expiry_verified_date?: string | null;
  data_exclusivity_expiry?: string | null;
  data_exclusivity_regime?: string | null;
  framework_regulatory_context?: string | Record<string, unknown> | null;
  jurisdictions_populated?: string[] | Record<string, unknown> | null;
  jurisdictions_missing?: string[] | Record<string, unknown> | null;
  expiry_derivation_method?: string | null;
  regulatory_context?: RegulatoryContext | null;

  // Scoring
  overall_score: number | null;

  // Provenance
  sources_contributed: string[];
  source_urls: string[];

  // Optional enrichment fields
  indication: string[];
  mechanism_of_action: string | null;
  clinical_stage: string | null;
  risk_flags: string[];
  synthesis_summary: string | null;

  // Score breakdown
  structured_score: number | null;
  semantic_score: number | null;
  evidence_score: number | null;

  // Identity enrichment
  brand_names: string[];
  originator: string | null;
  target_aliases: string[];
  modality: string | null;
  category: string | null;

  // Evidence
  trials: TrialSummary[];
  trial_count: number;
  latest_trial_phase: string | null;
  articles: ArticleSummary[];
  article_count: number;

  // Commercial
  annual_revenue_usd_millions: number | null;
  revenue_year: number | null;
  biosimilar_competitors: string[];
  biosimilar_competitor_count: number;
  has_approved_biosimilar: boolean;

  // FDA
  fda_brand_name: string | null;
  fda_manufacturer: string | null;
  fda_therapeutic_area: string | null;
}

// ---------------------------------------------------------------------------
// Change detection
// ---------------------------------------------------------------------------

export interface ChangeEntry {
  change_id: string;
  watch_id: string;
  run_id: string;
  previous_run_id: string;
  change_type: string;
  canonical_id: string;
  display_label: string;
  detail: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Watch configuration
// ---------------------------------------------------------------------------

export interface WatchConfig {
  watch_id: string;
  name: string;
  query: string;
  schedule: 'weekly' | 'monthly';
  schedule_day: number | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  last_run_id: string | null;
  last_run_at: string | null;
  notify_on_change: boolean;
}

// ---------------------------------------------------------------------------
// Run summary
// ---------------------------------------------------------------------------

export interface RunSummary {
  run_id: string;
  watch_id: string;
  created_at: string;
  query: string;
  result_count: number;
  cached: boolean;
  change_summary: string | null;
}

// ---------------------------------------------------------------------------
// Digest
// ---------------------------------------------------------------------------

export interface OpportunityHighlight {
  display_label: string;
  reason: string;
  watch_name: string;
}

export interface WatchDigestSection {
  watch_name: string;
  summary: string;
  change_count: number;
  highlight: string | null;
}

export interface DigestOutput {
  period_start: string;
  period_end: string;
  summary: string;
  per_watch: WatchDigestSection[];
  top_opportunities: OpportunityHighlight[];
  stable_watches: string[];
}

// ---------------------------------------------------------------------------
// Changes response
// ---------------------------------------------------------------------------

export interface ChangesResponse {
  changes: ChangeEntry[];
  change_summary: string | null;
}

// ---------------------------------------------------------------------------
// Health endpoint
// ---------------------------------------------------------------------------

export interface HealthResponse {
  status: 'ok' | 'degraded';
  agent_ready: boolean;
  services: Record<string, string>;
  env: string;
  degraded_reason?: string;
}
