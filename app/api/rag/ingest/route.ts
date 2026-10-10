/**
 * POST /api/rag/ingest
 *
 * Triggers the RAG ingestion pipeline from the seed JSON file.
 * Protected by a shared secret (RAG_INGEST_SECRET env var).
 *
 * Body (JSON, all optional):
 *   {
 *     fetchLiveContent?: boolean,   // fetch live gov pages (slow, default false)
 *     idPrefix?: string,            // only process IDs starting with this
 *     maxLinks?: number,            // cap on link records
 *     maxSchemes?: number           // cap on scheme records
 *   }
 */

import { NextResponse } from "next/server";
import { runIngestion } from "@/lib/rag/ingestor";
import type { IngestionOptions } from "@/lib/rag/ingestor";

function isAuthorised(req: Request): boolean {
  const secret = process.env.RAG_INGEST_SECRET;
  if (!secret) {
    // No secret configured – allow only in development
    return process.env.NODE_ENV === "development";
  }
  const provided =
    req.headers.get("x-rag-secret") || req.headers.get("authorization")?.replace("Bearer ", "");
  return provided === secret;
}

export async function POST(req: Request) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  let options: IngestionOptions = {};
  try {
    const body = await req.json().catch(() => ({}));
    options = {
      fetchLiveContent: body.fetchLiveContent === true,
      idPrefix: typeof body.idPrefix === "string" ? body.idPrefix : undefined,
      maxLinks: typeof body.maxLinks === "number" ? body.maxLinks : undefined,
      maxSchemes: typeof body.maxSchemes === "number" ? body.maxSchemes : undefined,
    };
  } catch {
    // Proceed with defaults
  }

  try {
    console.log("[RAG Ingest API] Starting ingestion with options:", options);
    const report = await runIngestion(options);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error("[RAG Ingest API] Ingestion failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: String(error),
      },
      { status: 500 }
    );
  }
}

/** GET returns current store stats */
export async function GET(req: Request) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const { countChunks, getStoredSourceSummary } = await import("@/lib/rag/store");
    const [total, summary] = await Promise.all([
      countChunks(),
      getStoredSourceSummary(),
    ]);

    return NextResponse.json({
      totalChunks: total,
      totalSources: summary.size,
      seedFile: "Dataset/tamil_nadu_citizen_rag_seed_v2.json",
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
