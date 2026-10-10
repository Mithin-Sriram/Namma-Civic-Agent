/**
 * Embedding generation for RAG.
 *
 * Uses OpenRouter's embedding endpoint via the existing `openai` package.
 * Model: text-embedding-3-small (1536 dims, available via OpenRouter).
 * Falls back gracefully if the key is absent.
 */

import OpenAI from "openai";

const EMBEDDING_MODEL = "openai/text-embedding-3-small";
/** Dimensionality of text-embedding-3-small */
export const EMBEDDING_DIMS = 1536;
/** Maximum characters we send per embedding call (API limit safety) */
const MAX_CHARS_PER_TEXT = 8_000;
/** How many texts we batch per API call */
const BATCH_SIZE = 16;
/** Delay between batches to avoid rate-limiting */
const BATCH_DELAY_MS = 500;

let embeddingClient: OpenAI | null = null;

function getEmbeddingClient(): OpenAI {
  if (embeddingClient) return embeddingClient;

  const apiKey =
    process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is required for RAG embeddings. Set it in .env.local."
    );
  }

  embeddingClient = new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer":
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "Namma-Civic-Agent",
    },
  });
  return embeddingClient;
}

/**
 * Generate a single embedding vector for a text string.
 * Returns null if an error occurs so callers can skip failed chunks.
 */
export async function embedText(text: string): Promise<number[] | null> {
  const truncated = text.slice(0, MAX_CHARS_PER_TEXT);
  try {
    const client = getEmbeddingClient();
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: truncated,
    });
    return response.data[0]?.embedding ?? null;
  } catch (error) {
    console.error("Embedding generation failed:", error);
    return null;
  }
}

/**
 * Embed a batch of texts efficiently using batched API calls.
 * Returns an array of embeddings in the same order; null where generation failed.
 */
export async function embedBatch(
  texts: string[]
): Promise<(number[] | null)[]> {
  const results: (number[] | null)[] = new Array(texts.length).fill(null);

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const truncatedBatch = batch.map((t) => t.slice(0, MAX_CHARS_PER_TEXT));

    try {
      const client = getEmbeddingClient();
      const response = await client.embeddings.create({
        model: EMBEDDING_MODEL,
        input: truncatedBatch,
      });

      for (const item of response.data) {
        if (item.index !== undefined && item.embedding) {
          results[i + item.index] = item.embedding;
        }
      }
    } catch (error) {
      console.error(`Embedding batch ${i}–${i + batch.length - 1} failed:`, error);
      // Leave nulls for this batch; ingestion will skip them
    }

    // Throttle between batches
    if (i + BATCH_SIZE < texts.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  return results;
}
