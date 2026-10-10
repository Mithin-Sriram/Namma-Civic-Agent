/**
 * RAG (Retrieval-Augmented Generation) shared types.
 * Vector storage uses MongoDB Atlas Vector Search.
 */

export interface RagChunkMetadata {
  /** Unique identifier from the seed data (e.g. TN001, TNS003) */
  sourceId: string;
  /** Human-readable title of the source */
  title: string;
  /** Canonical category (e.g. "Citizen services", "Schemes") */
  category: string;
  /** Jurisdiction string from seed data */
  jurisdiction: string;
  /** The primary official URL this chunk was drawn from */
  sourceUrl: string;
  /** Additional related official URLs */
  relatedUrls: string[];
  /** ISO timestamp when this chunk was ingested / last updated */
  ingestedAt: string;
  /** "link" | "scheme" – which section of seed data */
  recordType: "link" | "scheme";
  /** Content hash (SHA-256 hex) used for incremental updates */
  contentHash: string;
}

export interface RagChunk {
  _id?: string;
  /** Chunk index within the same source document (0-based) */
  chunkIndex: number;
  /** The text content of this chunk */
  text: string;
  /** Vector embedding – stored in MongoDB as an array of numbers */
  embedding: number[];
  metadata: RagChunkMetadata;
}

export interface RagSearchResult {
  chunk: Omit<RagChunk, "embedding">;
  /** Cosine similarity score returned by Atlas Vector Search */
  score: number;
}

export interface RagRetrievalResult {
  chunks: RagSearchResult[];
  /** Pre-formatted context block to inject into the LLM prompt */
  promptContext: string;
  /** Source URLs deduplicated for citations */
  sources: Array<{ title: string; url: string }>;
}
