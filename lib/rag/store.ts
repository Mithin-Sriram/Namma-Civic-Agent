/**
 * MongoDB vector store for RAG chunks.
 *
 * Uses Atlas Vector Search ($vectorSearch aggregation stage).
 * Falls back to a keyword-based text search if vector search is unavailable
 * (e.g. during local development against a non-Atlas MongoDB instance).
 *
 * Collection: rag_chunks
 * Required Atlas Vector Search index name: "rag_embedding_index"
 * Index definition: { fields: [{ type: "vector", path: "embedding", numDimensions: 1536, similarity: "cosine" }] }
 */

import { MongoClient, Collection, Document } from "mongodb";
import type { RagChunk, RagSearchResult } from "./types";
import { EMBEDDING_DIMS } from "./embeddings";

const COLLECTION_NAME = "rag_chunks";
const ATLAS_INDEX_NAME = "rag_embedding_index";
const MAX_RESULTS = 6;

let mongoClient: MongoClient | null = null;

function getMongoClient(): MongoClient {
  if (mongoClient) return mongoClient;

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  mongoClient = new MongoClient(url);
  return mongoClient;
}

async function getCollection(): Promise<Collection<Document>> {
  const client = getMongoClient();
  await client.connect();
  const dbName = new URL(
    // MongoDB Atlas connection strings use mongodb+srv:// which URL doesn't parse directly
    // Extract the database name from the path segment
    process.env.DATABASE_URL!.replace("mongodb+srv://", "https://")
      .replace("mongodb://", "https://")
  ).pathname.slice(1).split("?")[0] || "namma-civic-agent";

  return client.db(dbName).collection(COLLECTION_NAME);
}

/**
 * Ensure required indexes exist on the collection.
 * The Atlas vector search index must be created via the Atlas UI or API separately.
 * This creates supporting metadata indexes only.
 */
export async function ensureIndexes(): Promise<void> {
  try {
    const col = await getCollection();
    await col.createIndex({ "metadata.sourceId": 1, chunkIndex: 1 }, { unique: true, background: true });
    await col.createIndex({ "metadata.category": 1 });
    await col.createIndex({ "metadata.contentHash": 1 });
    await col.createIndex({ "metadata.ingestedAt": 1 });
    console.log("[RAG] MongoDB indexes ensured on rag_chunks.");

    // Check if Atlas vector search index already exists; create if not
    try {
      const searchIndexes = await col.listSearchIndexes().toArray();
      const hasVectorIndex = searchIndexes.some((idx) => idx.name === ATLAS_INDEX_NAME);
      if (!hasVectorIndex) {
        console.log(`[RAG] Creating Atlas Vector Search index '${ATLAS_INDEX_NAME}'...`);
        await col.createSearchIndex({
          name: ATLAS_INDEX_NAME,
          type: "vectorSearch",
          definition: {
            fields: [
              {
                type: "vector",
                path: "embedding",
                numDimensions: EMBEDDING_DIMS,
                similarity: "cosine",
              },
              {
                type: "filter",
                path: "metadata.category",
              },
            ],
          },
        });
        console.log(`[RAG] Created Atlas Vector Search index '${ATLAS_INDEX_NAME}'.`);
      }
    } catch (searchIndexErr) {
      // Non-fatal if cluster permissions or tier restrict programmatic index creation
      console.warn("[RAG] Search index auto-creation notice:", searchIndexErr);
    }
  } catch (error) {
    console.error("[RAG] Failed to ensure indexes:", error);
  }
}

/**
 * Upsert a chunk: insert if new, replace if content hash changed.
 * Returns true if the chunk was inserted/updated, false if unchanged.
 */
export async function upsertChunk(chunk: RagChunk): Promise<boolean> {
  const col = await getCollection();

  const existing = await col.findOne({
    "metadata.sourceId": chunk.metadata.sourceId,
    chunkIndex: chunk.chunkIndex,
  });

  if (existing && existing["metadata"]?.contentHash === chunk.metadata.contentHash) {
    return false; // Unchanged
  }

  await col.replaceOne(
    {
      "metadata.sourceId": chunk.metadata.sourceId,
      chunkIndex: chunk.chunkIndex,
    },
    chunk as unknown as Document,
    { upsert: true }
  );
  return true;
}

/**
 * Delete all chunks for a given sourceId.
 * Used when a record is removed from the seed dataset.
 */
export async function deleteChunksBySourceId(sourceId: string): Promise<void> {
  const col = await getCollection();
  await col.deleteMany({ "metadata.sourceId": sourceId });
}

/**
 * Count total stored chunks.
 */
export async function countChunks(): Promise<number> {
  const col = await getCollection();
  return col.countDocuments();
}

/**
 * Get a summary of what is currently in the store (sourceIds and their hashes).
 * Used to detect what needs to be updated during incremental ingestion.
 */
export async function getStoredSourceSummary(): Promise<
  Map<string, { hashes: Set<string>; chunkCount: number }>
> {
  const col = await getCollection();
  const cursor = col.find(
    {},
    { projection: { "metadata.sourceId": 1, "metadata.contentHash": 1, chunkIndex: 1 } }
  );

  const map = new Map<string, { hashes: Set<string>; chunkCount: number }>();
  for await (const doc of cursor) {
    const id = doc["metadata"]?.sourceId as string;
    if (!id) continue;
    if (!map.has(id)) map.set(id, { hashes: new Set(), chunkCount: 0 });
    const entry = map.get(id)!;
    entry.hashes.add(doc["metadata"]?.contentHash as string);
    entry.chunkCount++;
  }
  return map;
}

/**
 * Semantic vector search using Atlas Vector Search.
 * Falls back to keyword search for local (non-Atlas) MongoDB.
 */
export async function semanticSearch(
  queryEmbedding: number[],
  options: {
    limit?: number;
    categoryFilter?: string;
  } = {}
): Promise<RagSearchResult[]> {
  const col = await getCollection();
  const limit = options.limit ?? MAX_RESULTS;

  // Try Atlas Vector Search first
  try {
    const pipeline: Document[] = [
      {
        $vectorSearch: {
          index: ATLAS_INDEX_NAME,
          path: "embedding",
          queryVector: queryEmbedding,
          numCandidates: limit * 10,
          limit,
          ...(options.categoryFilter
            ? {
                filter: {
                  "metadata.category": options.categoryFilter,
                },
              }
            : {}),
        },
      },
      {
        $addFields: {
          score: { $meta: "vectorSearchScore" },
        },
      },
      {
        $project: {
          embedding: 0, // Don't return large embedding arrays
        },
      },
    ];

    const results = await col.aggregate(pipeline).toArray();
    return results.map((doc) => ({
      chunk: {
        _id: doc["_id"]?.toString(),
        chunkIndex: doc["chunkIndex"] as number,
        text: doc["text"] as string,
        metadata: doc["metadata"] as RagChunk["metadata"],
      },
      score: doc["score"] as number,
    }));
  } catch (vectorSearchError) {
    const errMsg = String(vectorSearchError);
    // Check if this is an "index not found" or "command not supported" error
    const isAtlasError =
      errMsg.includes("$vectorSearch") ||
      errMsg.includes("index") ||
      errMsg.includes("command not found") ||
      errMsg.includes("no such command");

    if (isAtlasError) {
      console.warn(
        "[RAG] Atlas Vector Search unavailable, falling back to text search. " +
          "Create the Atlas vector search index for semantic retrieval."
      );
      return keywordFallbackSearch(col, limit);
    }

    console.error("[RAG] Vector search error:", vectorSearchError);
    return [];
  }
}

/**
 * Keyword-based fallback search (for local MongoDB without Atlas Vector Search).
 * Searches across text field using MongoDB's $regex.
 */
async function keywordFallbackSearch(
  col: Collection<Document>,
  limit: number,
  keywords?: string[]
): Promise<RagSearchResult[]> {
  const query = keywords?.length
    ? { text: { $regex: keywords.join("|"), $options: "i" } }
    : {};

  const docs = await col
    .find(query, { projection: { embedding: 0 } })
    .limit(limit * 2)
    .toArray();

  const results = docs.map((doc) => {
    let score = 0.6;
    if (keywords && keywords.length > 0) {
      const textLower = ((doc["text"] as string) || "").toLowerCase();
      const matched = keywords.filter((k) => textLower.includes(k.toLowerCase())).length;
      score = Math.min(0.95, 0.6 + (matched / keywords.length) * 0.35);
    }
    return {
      chunk: {
        _id: doc["_id"]?.toString(),
        chunkIndex: doc["chunkIndex"] as number,
        text: doc["text"] as string,
        metadata: doc["metadata"] as RagChunk["metadata"],
      },
      score,
    };
  });

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

/**
 * Combined search: vector search with keyword fallback.
 * Extracts keywords from the query for the fallback.
 */
export async function searchChunks(
  queryEmbedding: number[] | null,
  queryText: string,
  options: { limit?: number; categoryFilter?: string } = {}
): Promise<RagSearchResult[]> {
  const col = await getCollection();
  const keywords = extractKeywords(queryText);

  if (queryEmbedding && queryEmbedding.length === EMBEDDING_DIMS) {
    const vectorResults = await semanticSearch(queryEmbedding, options);
    if (vectorResults.length > 0) {
      return vectorResults;
    }
  }

  // Pure keyword fallback when no embedding is available or vector search returns no results
  return keywordFallbackSearch(col, options.limit ?? MAX_RESULTS, keywords);
}

/**
 * Extract simple keywords from a query for keyword-based fallback.
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "can", "in", "on", "at", "for", "to", "of",
    "and", "or", "but", "if", "then", "how", "what", "which", "who", "when",
    "where", "why", "i", "me", "my", "we", "our", "you", "your",
  ]);

  return text
    .toLowerCase()
    .split(/[\s,?.!;:()]+/)
    .filter((w) => w.length > 2 && !stopWords.has(w))
    .slice(0, 8); // Limit keywords
}
