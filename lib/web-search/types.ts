export type WebSearchStatus = "success" | "unavailable" | "no-results";

export interface WebSearchSource {
  title: string;
  url: string;
}

export interface WebSearchAttribution {
  status: WebSearchStatus;
  retrievedAt: string;
  sources: WebSearchSource[];
  note: string;
}

export interface WebSearchResult {
  attribution: WebSearchAttribution;
  answer: string;
  promptContext: string;
}

export function parseWebSearchAttribution(
  metadata: string | null | undefined
): WebSearchAttribution | undefined {
  if (!metadata) return undefined;

  try {
    const parsed: unknown = JSON.parse(metadata);
    if (parsed == null || typeof parsed !== "object") return undefined;
    const value = (parsed as { webSearch?: unknown }).webSearch;
    if (value == null || typeof value !== "object") return undefined;

    const attribution = value as Partial<WebSearchAttribution>;
    if (
      (attribution.status !== "success" &&
        attribution.status !== "unavailable" &&
        attribution.status !== "no-results") ||
      typeof attribution.retrievedAt !== "string" ||
      !Array.isArray(attribution.sources) ||
      !attribution.sources.every((source) =>
        isValidWebSource(source)
      ) ||
      typeof attribution.note !== "string"
    ) {
      return undefined;
    }

    return attribution as WebSearchAttribution;
  } catch {
    return undefined;
  }
}

export function isValidWebSource(value: unknown): value is WebSearchSource {
  if (value == null || typeof value !== "object") return false;
  const source = value as Partial<WebSearchSource>;
  if (typeof source.title !== "string" || typeof source.url !== "string") return false;
  try {
    const url = new URL(source.url);
    return url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (!url.port || url.port === "443") &&
      [".gov.in", ".nic.in"].some((suffix) => url.hostname.toLowerCase().endsWith(suffix));
  } catch {
    return false;
  }
}
