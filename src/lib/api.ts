import type {
  CandidateResult,
  ChangeEntry,
  HealthResponse,
  RunSummary,
  WatchConfig,
} from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function assertOk(res: Response, endpoint: string): Promise<void> {
  if (!res.ok) {
    throw new Error(
      `API error ${res.status} on ${endpoint}: ${res.statusText}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

export async function queryAgent(
  query: string,
): Promise<{ response: string; run_id: string; cached: boolean }> {
  const endpoint = "/query";
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  await assertOk(res, endpoint);
  return res.json();
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

export async function getResults(run_id: string): Promise<CandidateResult[]> {
  const endpoint = `/results?run_id=${encodeURIComponent(run_id)}`;
  const res = await fetch(`${API_URL}${endpoint}`);
  await assertOk(res, endpoint);
  const data = await res.json();
  return data.results;
}

// ---------------------------------------------------------------------------
// Runs
// ---------------------------------------------------------------------------

export async function getRuns(
  watch_id: string,
  limit?: number,
): Promise<RunSummary[]> {
  const params = new URLSearchParams({ watch_id });
  if (limit !== undefined) params.set("limit", String(limit));
  const endpoint = `/runs?${params.toString()}`;
  const res = await fetch(`${API_URL}${endpoint}`);
  await assertOk(res, endpoint);
  const data = await res.json();
  return data.runs;
}

// ---------------------------------------------------------------------------
// Watches
// ---------------------------------------------------------------------------

export async function getWatches(): Promise<WatchConfig[]> {
  const endpoint = "/watches";
  const res = await fetch(`${API_URL}${endpoint}`);
  await assertOk(res, endpoint);
  const data = await res.json();
  return data.watches;
}

export async function getWatch(
  id: string,
): Promise<{ watch: WatchConfig; recent_runs: RunSummary[] }> {
  const endpoint = `/watches/${encodeURIComponent(id)}`;
  const res = await fetch(`${API_URL}${endpoint}`);
  await assertOk(res, endpoint);
  return res.json();
}

export async function createWatch(data: {
  name: string;
  query: string;
  schedule: string;
  schedule_day: number;
  notify_on_change?: boolean;
}): Promise<WatchConfig> {
  const endpoint = "/watches";
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  await assertOk(res, endpoint);
  const json = await res.json();
  return json.watch;
}

export async function updateWatch(
  id: string,
  data: Partial<{
    name: string;
    query: string;
    schedule: string;
    schedule_day: number;
    enabled: boolean;
    notify_on_change: boolean;
  }>,
): Promise<WatchConfig> {
  const endpoint = `/watches/${encodeURIComponent(id)}`;
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  await assertOk(res, endpoint);
  const json = await res.json();
  return json.watch;
}

export async function deleteWatch(id: string): Promise<void> {
  const endpoint = `/watches/${encodeURIComponent(id)}`;
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: "DELETE",
  });
  await assertOk(res, endpoint);
}

// ---------------------------------------------------------------------------
// Watch actions
// ---------------------------------------------------------------------------

export async function triggerRun(
  watch_id: string,
): Promise<{ run_id: string; cached: boolean }> {
  const endpoint = `/watches/${encodeURIComponent(watch_id)}/run`;
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: "POST",
  });
  await assertOk(res, endpoint);
  return res.json();
}

export async function getChanges(
  watch_id: string,
  limit?: number,
): Promise<ChangeEntry[]> {
  const params = new URLSearchParams();
  if (limit !== undefined) params.set("limit", String(limit));
  const qs = params.toString();
  const endpoint = `/watches/${encodeURIComponent(watch_id)}/changes${qs ? `?${qs}` : ""}`;
  const res = await fetch(`${API_URL}${endpoint}`);
  await assertOk(res, endpoint);
  const data = await res.json();
  return data.changes;
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export async function getHealth(): Promise<HealthResponse> {
  const endpoint = "/health";
  const res = await fetch(`${API_URL}${endpoint}`);
  await assertOk(res, endpoint);
  return res.json();
}
