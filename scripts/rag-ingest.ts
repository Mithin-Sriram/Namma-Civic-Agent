/**
 * Standalone RAG ingestion script.
 *
 * Run with:
 *   npx tsx scripts/rag-ingest.ts
 *   npx tsx scripts/rag-ingest.ts --fetch-live   # Also fetch live government pages
 *   npx tsx scripts/rag-ingest.ts --prefix TN001  # Only process IDs starting with TN001
 *   npx tsx scripts/rag-ingest.ts --max-links 5 --max-schemes 5  # Limit for testing
 *
 * Requires:
 *   - DATABASE_URL set in .env.local or environment
 *   - OPENROUTER_API_KEY (or OPENAI_API_KEY) set in .env.local or environment
 *
 * This script can be run repeatedly. Unchanged chunks are skipped.
 */

// Load .env.local before anything else
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

// Verify required env vars
const requiredVars = ["DATABASE_URL", "OPENROUTER_API_KEY"];
const aliasVars: Record<string, string> = { OPENROUTER_API_KEY: "OPENAI_API_KEY" };
const missing: string[] = [];
for (const v of requiredVars) {
  if (!process.env[v] && !process.env[aliasVars[v] ?? ""]) {
    missing.push(v);
  }
}
if (missing.length > 0) {
  console.error(`\n[RAG Ingest] ❌  Missing required environment variables: ${missing.join(", ")}`);
  console.error("  Set them in .env.local and re-run.");
  process.exit(1);
}

import { runIngestion } from "../lib/rag/ingestor";
import type { IngestionOptions } from "../lib/rag/ingestor";

function parseArgs(): IngestionOptions {
  const args = process.argv.slice(2);
  const options: IngestionOptions = {
    fetchLiveContent: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--fetch-live":
        options.fetchLiveContent = true;
        break;
      case "--prefix":
        options.idPrefix = args[++i];
        break;
      case "--max-links":
        options.maxLinks = parseInt(args[++i], 10);
        break;
      case "--max-schemes":
        options.maxSchemes = parseInt(args[++i], 10);
        break;
    }
  }

  return options;
}

async function main() {
  const options = parseArgs();

  console.log("\n=== Namma Civic Agent – RAG Ingestion ===");
  console.log("Options:", JSON.stringify(options, null, 2));
  console.log("Seed file: Dataset/tamil_nadu_citizen_rag_seed_v2.json");
  console.log("Database: Atlas MongoDB (rag_chunks collection)");
  console.log("Embeddings: OpenRouter text-embedding-3-small (1536 dims)");
  console.log();

  const start = Date.now();
  const report = await runIngestion(options);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log("\n=== Ingestion Report ===");
  console.log(`Duration: ${elapsed}s`);
  console.log(`Seed links processed: ${report.totalSeedLinks}`);
  console.log(`Seed schemes processed: ${report.totalSeedSchemes}`);
  console.log(`Chunks created/updated: ${report.chunksCreated}`);
  console.log(`Chunks skipped (unchanged): ${report.chunksSkipped}`);
  console.log(`URLs fetched successfully: ${report.urlsFetched}`);
  console.log(`URL fetch failures: ${report.urlsFailed.length}`);
  console.log(`Embedding failures: ${report.embeddingFailures}`);
  console.log(`Total chunks now in store: ${report.totalChunksInStore}`);

  if (report.urlsFailed.length > 0) {
    console.log("\nFailed URLs:");
    for (const { url, reason } of report.urlsFailed) {
      console.log(`  ❌ ${url} — ${reason}`);
    }
  }

  if (report.errors.length > 0) {
    console.log("\nErrors:");
    for (const error of report.errors) {
      console.log(`  ⚠️  ${error}`);
    }
  }

  console.log("\n✅  Ingestion complete.");
  console.log(
    "\nNext step: Create the Atlas Vector Search index named 'rag_embedding_index'."
  );
  console.log(
    "See README or CLINE_GUIDE for index definition instructions.\n"
  );

  process.exit(0);
}

main().catch((error) => {
  console.error("\n[RAG Ingest] Fatal error:", error);
  process.exit(1);
});
