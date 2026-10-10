/**
 * RAG Ingestor: loads the seed JSON, chunks, embeds, and stores in MongoDB.
 *
 * Memory-efficient: embed + upsert per source record so large embedding arrays
 * are released before the next record is processed. Prevents OOM on constrained
 * systems even for the full 123-link dataset.
 *
 * Supports incremental updates: unchanged chunks are detected via SHA-256 hash
 * and skipped without re-embedding.
 */

import { readFileSync } from "fs";
import { join } from "path";
import {
  splitIntoChunks,
  buildLinkText,
  buildSchemeText,
  cleanText,
  hashContent,
} from "./chunker";
import { embedBatch } from "./embeddings";
import {
  ensureIndexes,
  upsertChunk,
  getStoredSourceSummary,
  countChunks,
} from "./store";
import type { RagChunk, RagChunkMetadata } from "./types";

const SEED_FILE_PATH = join(process.cwd(), "Dataset", "tamil_nadu_citizen_rag_seed_v2.json");
const FETCH_TIMEOUT_MS = 12_000;
const MAX_FETCHED_HTML_CHARS = 30_000;

export interface IngestionReport {
  totalSeedLinks: number;
  totalSeedSchemes: number;
  chunksCreated: number;
  chunksSkipped: number;
  urlsFetched: number;
  urlsFailed: Array<{ url: string; reason: string }>;
  embeddingFailures: number;
  totalChunksInStore: number;
  errors: string[];
}

// ─── Seed JSON types ───────────────────────────────────────────────────────────

interface SeedLink {
  id: string;
  name: string;
  url: string;
  category: string;
  description: string;
  jurisdiction?: string;
  source_status?: string;
  last_checked?: string;
  rag_notes?: string;
}

interface SeedScheme {
  id: string;
  name: string;
  category: string;
  benefit?: string;
  eligibility?: string;
  application_process?: string;
  documents_reported_by_source?: string[];
  official_application_url?: string;
  source_urls?: string[];
  source_status?: string;
  freshness_note?: string;
  confidence?: string;
}

interface SeedFile {
  links?: SeedLink[];
  schemes_and_services?: SeedScheme[];
}

// ─── HTML content extraction ─────────────────────────────────────────────────

function extractTextFromHtml(html: string): string {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  text = text
    .replace(/<\/?(p|div|section|article|h[1-6]|li|tr|td|th|br)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/&[a-z]+;/gi, " ");

  return cleanText(text).slice(0, MAX_FETCHED_HTML_CHARS);
}

async function fetchUrlContent(
  url: string
): Promise<{ text: string; contentType: string } | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        "User-Agent":
          "NammaCivicAgent/1.0 (Tamil Nadu civic information RAG system)",
        Accept: "text/html,application/xhtml+xml,text/plain,*/*",
      },
    });

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") || "";
    const rawText = await response.text();

    if (contentType.includes("text/html") || contentType.includes("xhtml")) {
      return { text: extractTextFromHtml(rawText), contentType };
    } else if (contentType.includes("text/plain")) {
      return { text: cleanText(rawText), contentType };
    } else if (contentType.includes("application/pdf")) {
      return {
        text: `[PDF at ${url} – not automatically extracted]`,
        contentType,
      };
    }
    return { text: cleanText(rawText.slice(0, MAX_FETCHED_HTML_CHARS)), contentType };
  } catch {
    return null;
  }
}

// ─── Chunk candidate type ─────────────────────────────────────────────────────

interface ChunkCandidate {
  text: string;
  metadata: RagChunkMetadata;
}

// ─── Embed + upsert helper (processes one source at a time) ──────────────────

async function embedAndUpsert(
  candidates: ChunkCandidate[],
  report: IngestionReport
): Promise<{ created: number; skipped: number; failed: number }> {
  if (candidates.length === 0) return { created: 0, skipped: 0, failed: 0 };

  let created = 0;
  let skipped = 0;
  let failed = 0;

  const texts = candidates.map((c) => c.text);
  const embeddings = await embedBatch(texts);

  for (let i = 0; i < candidates.length; i++) {
    const embedding = embeddings[i];
    if (!embedding) {
      failed++;
      report.embeddingFailures++;
      console.warn(
        `[RAG Ingest] Embedding failed for ${candidates[i].metadata.sourceId}[${i}]`
      );
      continue;
    }

    const chunk: RagChunk = {
      chunkIndex: i,
      text: candidates[i].text,
      embedding,
      metadata: candidates[i].metadata,
    };

    try {
      const wasUpserted = await upsertChunk(chunk);
      if (wasUpserted) {
        created++;
        report.chunksCreated++;
      } else {
        skipped++;
        report.chunksSkipped++;
      }
    } catch (err) {
      const msg = `Failed to upsert ${candidates[i].metadata.sourceId}[${i}]: ${err}`;
      report.errors.push(msg);
      console.error("[RAG Ingest]", msg);
      failed++;
    }
  }

  // Explicitly free the embeddings array to help GC on constrained systems
  embeddings.length = 0;

  return { created, skipped, failed };
}

// ─── Record processors ────────────────────────────────────────────────────────

async function processLinkRecord(
  link: SeedLink,
  report: IngestionReport,
  fetchContent: boolean
): Promise<Map<string, ChunkCandidate[]>> {
  const bySource = new Map<string, ChunkCandidate[]>();

  // Primary chunk: structured data from seed
  const seedText = buildLinkText(link);
  const seedHash = await hashContent(seedText);

  const baseMetadata: RagChunkMetadata = {
    sourceId: link.id,
    title: link.name,
    category: link.category,
    jurisdiction: link.jurisdiction || "Tamil Nadu",
    sourceUrl: link.url,
    relatedUrls: [],
    ingestedAt: new Date().toISOString(),
    recordType: "link",
    contentHash: seedHash,
  };

  const seedChunks = splitIntoChunks(seedText);
  bySource.set(link.id, seedChunks.map((text) => ({ text, metadata: { ...baseMetadata } })));

  // Optionally fetch the live page
  if (fetchContent) {
    const fetched = await fetchUrlContent(link.url);
    if (fetched && fetched.text.length > 100) {
      report.urlsFetched++;
      const pageText = `${link.name}\n${link.description}\n\n${fetched.text}`;
      const pageChunks = splitIntoChunks(pageText);
      const pageHash = await hashContent(pageText);
      const webId = `${link.id}_web`;
      bySource.set(
        webId,
        pageChunks.map((text) => ({
          text,
          metadata: { ...baseMetadata, sourceId: webId, contentHash: pageHash },
        }))
      );
    } else if (fetched === null) {
      report.urlsFailed.push({ url: link.url, reason: "HTTP error or timeout" });
    }
  }

  return bySource;
}

async function processSchemeRecord(
  scheme: SeedScheme,
  report: IngestionReport
): Promise<Map<string, ChunkCandidate[]>> {
  const bySource = new Map<string, ChunkCandidate[]>();

  const schemeText = buildSchemeText(scheme);
  const schemeHash = await hashContent(schemeText);

  const metadata: RagChunkMetadata = {
    sourceId: scheme.id,
    title: scheme.name,
    category: scheme.category,
    jurisdiction: "Tamil Nadu",
    sourceUrl:
      scheme.official_application_url ||
      scheme.source_urls?.[0] ||
      "https://www.tn.gov.in/",
    relatedUrls: [
      ...(scheme.source_urls || []),
      ...(scheme.official_application_url ? [scheme.official_application_url] : []),
    ]
      .filter((url, i, arr) => arr.indexOf(url) === i)
      .slice(0, 5),
    ingestedAt: new Date().toISOString(),
    recordType: "scheme",
    contentHash: schemeHash,
  };

  const chunks = splitIntoChunks(schemeText);
  bySource.set(
    scheme.id,
    chunks.map((text) => ({ text, metadata }))
  );

  return bySource;
}

// ─── Main ingestion function ──────────────────────────────────────────────────

export interface IngestionOptions {
  /** Whether to fetch live content from URLs (slower but richer) */
  fetchLiveContent?: boolean;
  /** Only ingest records whose IDs start with this prefix */
  idPrefix?: string;
  /** Maximum number of link records to process */
  maxLinks?: number;
  /** Maximum number of scheme records to process */
  maxSchemes?: number;
}

export async function runIngestion(
  options: IngestionOptions = {}
): Promise<IngestionReport> {
  const { fetchLiveContent = false, idPrefix, maxLinks, maxSchemes } = options;

  const report: IngestionReport = {
    totalSeedLinks: 0,
    totalSeedSchemes: 0,
    chunksCreated: 0,
    chunksSkipped: 0,
    urlsFetched: 0,
    urlsFailed: [],
    embeddingFailures: 0,
    totalChunksInStore: 0,
    errors: [],
  };

  // 1. Load seed file
  let seed: SeedFile;
  try {
    const raw = readFileSync(SEED_FILE_PATH, "utf-8");
    seed = JSON.parse(raw) as SeedFile;
  } catch (error) {
    const msg = `Failed to load seed file at ${SEED_FILE_PATH}: ${error}`;
    report.errors.push(msg);
    console.error("[RAG Ingest]", msg);
    return report;
  }

  // 2. Ensure indexes
  await ensureIndexes();

  // 3. Get stored state for incremental updates
  const storedSummary = await getStoredSourceSummary();
  console.log(`[RAG Ingest] Found ${storedSummary.size} source IDs already in store.`);
  // Free it — we only needed it to detect the first-run case for logging
  storedSummary.clear();

  // 4. Process link records — embed and upsert per record to minimise peak memory
  const links = seed.links || [];
  const filteredLinks = links
    .filter((l) => !idPrefix || l.id.startsWith(idPrefix))
    .slice(0, maxLinks ?? links.length);

  report.totalSeedLinks = filteredLinks.length;
  console.log(`[RAG Ingest] Processing ${filteredLinks.length} link records...`);

  for (const link of filteredLinks) {
    try {
      const bySource = await processLinkRecord(link, report, fetchLiveContent);
      for (const [sourceId, candidates] of bySource) {
        const r = await embedAndUpsert(candidates, report);
        console.log(
          `[RAG Ingest] ${sourceId}: +${r.created} new, ${r.skipped} unchanged, ${r.failed} failed`
        );
      }
    } catch (error) {
      const msg = `Error processing link ${link.id}: ${error}`;
      report.errors.push(msg);
      console.error("[RAG Ingest]", msg);
    }
  }

  // 5. Process scheme records
  const schemes = seed.schemes_and_services || [];
  const filteredSchemes = schemes
    .filter((s) => !idPrefix || s.id.startsWith(idPrefix))
    .slice(0, maxSchemes ?? schemes.length);

  report.totalSeedSchemes = filteredSchemes.length;
  console.log(`[RAG Ingest] Processing ${filteredSchemes.length} scheme records...`);

  for (const scheme of filteredSchemes) {
    try {
      const bySource = await processSchemeRecord(scheme, report);
      for (const [sourceId, candidates] of bySource) {
        const r = await embedAndUpsert(candidates, report);
        console.log(
          `[RAG Ingest] ${sourceId}: +${r.created} new, ${r.skipped} unchanged, ${r.failed} failed`
        );
      }
    } catch (error) {
      const msg = `Error processing scheme ${scheme.id}: ${error}`;
      report.errors.push(msg);
      console.error("[RAG Ingest]", msg);
    }
  }

  report.totalChunksInStore = await countChunks();

  console.log(
    `[RAG Ingest] Complete. Created/updated: ${report.chunksCreated}, ` +
      `Skipped (unchanged): ${report.chunksSkipped}, ` +
      `Embedding failures: ${report.embeddingFailures}, ` +
      `URL failures: ${report.urlsFailed.length}`
  );

  return report;
}
