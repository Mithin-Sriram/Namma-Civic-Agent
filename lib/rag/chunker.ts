/**
 * Text chunking for RAG ingestion.
 *
 * Splits long text into overlapping chunks that preserve sentence boundaries.
 * Keeps chunks small enough to stay within embedding model limits and large
 * enough to retain useful context.
 */

/** Target chunk size in characters */
const CHUNK_SIZE = 600;
/** Overlap between consecutive chunks */
const CHUNK_OVERLAP = 120;
/** Minimum characters for a chunk to be worth indexing */
const MIN_CHUNK_SIZE = 50;

/**
 * Split text into overlapping chunks, trying to break at sentence boundaries.
 * Returns an array of text strings.
 */
export function splitIntoChunks(text: string): string[] {
  const cleaned = cleanText(text);
  if (cleaned.length <= CHUNK_SIZE) {
    return cleaned.length >= MIN_CHUNK_SIZE ? [cleaned] : [];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < cleaned.length) {
    const end = Math.min(start + CHUNK_SIZE, cleaned.length);
    let chunkEnd = end;

    // Try to break at a sentence boundary if not at the end of string
    if (chunkEnd < cleaned.length) {
      const searchWindow = cleaned.slice(start, chunkEnd);
      // Look for last sentence-ending punctuation in the window
      const lastPunct = Math.max(
        searchWindow.lastIndexOf(". "),
        searchWindow.lastIndexOf(".\n"),
        searchWindow.lastIndexOf("! "),
        searchWindow.lastIndexOf("? "),
        searchWindow.lastIndexOf("\n\n")
      );
      if (lastPunct > CHUNK_SIZE / 2) {
        chunkEnd = start + lastPunct + 1;
      }
    }

    const chunk = cleaned.slice(start, chunkEnd).trim();
    if (chunk.length >= MIN_CHUNK_SIZE) {
      chunks.push(chunk);
    }

    if (chunkEnd >= cleaned.length) {
      break;
    }

    // Move forward with overlap, ensuring strictly positive progress
    const nextStart = chunkEnd - CHUNK_OVERLAP;
    start = nextStart > start ? nextStart : chunkEnd;
  }

  return chunks;
}

/**
 * Build a comprehensive text representation of a seed "links" record
 * that includes all fields useful for semantic search.
 */
export function buildLinkText(record: {
  id: string;
  name: string;
  url: string;
  category: string;
  description: string;
  jurisdiction?: string;
  source_status?: string;
}): string {
  return [
    `Service: ${record.name}`,
    `Category: ${record.category}`,
    record.jurisdiction ? `Jurisdiction: ${record.jurisdiction}` : "",
    `Description: ${record.description}`,
    `Official URL: ${record.url}`,
    record.source_status ? `Status: ${record.source_status}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Build a comprehensive text representation of a seed "schemes_and_services" record.
 */
export function buildSchemeText(record: {
  id: string;
  name: string;
  category: string;
  benefit?: string;
  eligibility?: string;
  application_process?: string;
  documents_reported_by_source?: string[];
  official_application_url?: string;
  source_urls?: string[];
  freshness_note?: string;
  confidence?: string;
}): string {
  return [
    `Scheme/Service: ${record.name}`,
    `Category: ${record.category}`,
    record.benefit ? `Benefit: ${record.benefit}` : "",
    record.eligibility ? `Eligibility: ${record.eligibility}` : "",
    record.application_process
      ? `Application Process: ${record.application_process}`
      : "",
    record.documents_reported_by_source?.length
      ? `Required Documents: ${record.documents_reported_by_source.join(", ")}`
      : "",
    record.official_application_url
      ? `Apply at: ${record.official_application_url}`
      : "",
    record.freshness_note ? `Note: ${record.freshness_note}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Clean fetched HTML-extracted text for indexing.
 * Removes excessive whitespace while preserving paragraph structure.
 */
export function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")     // Collapse horizontal whitespace
    .replace(/\n{3,}/g, "\n\n")  // Collapse multiple blank lines
    .replace(/^\s+|\s+$/g, "")   // Trim leading/trailing
    .slice(0, 50_000);           // Safety cap
}

/**
 * Compute a simple SHA-256 hex hash of a string.
 * Used for incremental ingestion to skip unchanged chunks.
 */
export async function hashContent(text: string): Promise<string> {
  // Node.js crypto (available in Next.js API routes)
  const { createHash } = await import("crypto");
  return createHash("sha256").update(text, "utf8").digest("hex");
}
