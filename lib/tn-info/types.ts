export type TNInfoCategory =
  | "district"
  | "schemes"
  | "election"
  | "tnea-counselling"
  | "events";

export type TNInfoStatus = "success" | "empty" | "unavailable" | "unsupported";

export interface TNInfoSource {
  label: string;
  url: string;
}

export interface TNInfoAttribution {
  provider: "TN-Info";
  category: TNInfoCategory;
  status: TNInfoStatus;
  apiUrl: string | null;
  retrievedAt: string;
  updatedAt?: string;
  sources: TNInfoSource[];
  note: string;
}

export interface TNInfoResult {
  attribution: TNInfoAttribution;
  promptContext: string;
}

export function parseTNInfoAttribution(
  metadata: string | null | undefined
): TNInfoAttribution | undefined {
  if (!metadata) return undefined;

  try {
    const parsed: unknown = JSON.parse(metadata);
    if (parsed == null || typeof parsed !== "object") return undefined;
    const tnInfo = (parsed as { tnInfo?: unknown }).tnInfo;
    if (tnInfo == null || typeof tnInfo !== "object") return undefined;

    const value = tnInfo as Partial<TNInfoAttribution>;
    if (
      value.provider !== "TN-Info" ||
      typeof value.category !== "string" ||
      typeof value.status !== "string" ||
      typeof value.retrievedAt !== "string" ||
      !Array.isArray(value.sources)
    ) {
      return undefined;
    }

    return value as TNInfoAttribution;
  } catch {
    return undefined;
  }
}
