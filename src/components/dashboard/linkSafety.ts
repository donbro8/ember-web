export function normalizeSafeHttpUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function clinicalTrialsStudyUrl(nctId: unknown): string | null {
  if (typeof nctId !== "string") return null;
  const trimmed = nctId.trim().toUpperCase();
  if (!/^NCT\d{8}$/.test(trimmed)) return null;
  return normalizeSafeHttpUrl(`https://clinicaltrials.gov/study/${trimmed}`);
}

export function doiUrl(doi: unknown): string | null {
  if (typeof doi !== "string") return null;
  const trimmed = doi.trim();
  if (!/^10\.\S+\/\S+$/.test(trimmed)) return null;
  return normalizeSafeHttpUrl(`https://doi.org/${encodeURI(trimmed)}`);
}

export function pubMedUrl(pmid: unknown): string | null {
  if (typeof pmid !== "string") return null;
  const trimmed = pmid.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return normalizeSafeHttpUrl(`https://pubmed.ncbi.nlm.nih.gov/${trimmed}`);
}
