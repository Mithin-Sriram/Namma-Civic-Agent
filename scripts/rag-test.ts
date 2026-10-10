/**
 * RAG test script: tests ingestion, retrieval, and citation for several queries.
 *
 * Run with:
 *   npx tsx scripts/rag-test.ts
 *
 * Requires the ingestion to have run first:
 *   npm run rag:test   (quick: 3 links + 3 schemes)
 *   npm run rag:ingest (full ingestion)
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import { retrieveRagContext, isRagEligibleQuery } from "../lib/rag/retriever";
import { countChunks, getStoredSourceSummary } from "../lib/rag/store";

const TEST_QUERIES = [
  // Scheme queries
  "How do I apply for the Tamil Pudhalvan Scheme?",
  "What is the eligibility for old age pension in Tamil Nadu?",
  "How to get a community certificate in Tamil Nadu?",
  "Documents required for income certificate application",
  // Civic service queries
  "How to file a grievance with Tamil Nadu government?",
  "Tamil Nadu e-Sevai services list",
  // Election / district
  "Chennai district administration website",
  // Non-civic (should return null / skip)
  "What is the capital of France?",
];

async function runTests() {
  console.log("\n=== Namma Civic Agent – RAG Retrieval Test ===\n");

  // 1. Store stats
  try {
    const [total, summary] = await Promise.all([
      countChunks(),
      getStoredSourceSummary(),
    ]);
    console.log(`📦  Store: ${total} chunks across ${summary.size} sources`);
  } catch (error) {
    console.error("❌  Could not connect to store:", error);
    console.error("Run 'npm run rag:test' first to ingest data.");
    process.exit(1);
  }

  console.log();

  // 2. Test each query
  let passed = 0;
  let failed = 0;
  const failedUrls: string[] = [];

  for (const query of TEST_QUERIES) {
    console.log(`\n🔍  Query: "${query}"`);
    const eligible = isRagEligibleQuery(query);
    console.log(`    RAG eligible: ${eligible}`);

    if (!eligible) {
      console.log("    ⏭   Skipped (not a Tamil Nadu civic query) — expected.");
      passed++;
      continue;
    }

    try {
      const result = await retrieveRagContext(query);

      if (!result) {
        console.log("    ℹ️   No relevant chunks found (store may be empty or query too specific).");
        continue;
      }

      console.log(`    ✅  Retrieved ${result.chunks.length} chunk(s):`);
      for (const r of result.chunks) {
        console.log(
          `       [score=${r.score.toFixed(3)}] ${r.chunk.metadata.title} (${r.chunk.metadata.category})`
        );
        console.log(`          URL: ${r.chunk.metadata.sourceUrl}`);
        console.log(`          Text preview: ${r.chunk.text.slice(0, 120).replace(/\n/g, " ")}…`);
      }

      console.log(`\n    📎  Sources (${result.sources.length}):`);
      for (const src of result.sources) {
        console.log(`       • ${src.title}: ${src.url}`);
      }

      passed++;
    } catch (error) {
      console.error(`    ❌  Error: ${error}`);
      failed++;
    }
  }

  console.log("\n=== Test Summary ===");
  console.log(`Passed: ${passed} / ${TEST_QUERIES.length}`);
  if (failed > 0) console.log(`Failed: ${failed}`);
  if (failedUrls.length > 0) {
    console.log("Failed URLs:");
    for (const url of failedUrls) console.log(`  - ${url}`);
  }
  console.log();

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((error) => {
  console.error("Fatal:", error);
  process.exit(1);
});
