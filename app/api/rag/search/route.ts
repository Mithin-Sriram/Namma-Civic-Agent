/**
 * GET /api/rag/search?q=<query>[&limit=<n>]
 *
 * Test endpoint for RAG retrieval. Returns retrieved chunks and formatted
 * context for a given query. Useful for testing without chat overhead.
 *
 * Protected by RAG_INGEST_SECRET (same as ingest route).
 */

import { NextResponse } from "next/server";
import { retrieveRagContext } from "@/lib/rag/retriever";

function isAuthorised(req: Request): boolean {
  const secret = process.env.RAG_INGEST_SECRET;
  if (!secret) return process.env.NODE_ENV === "development";
  const provided =
    req.headers.get("x-rag-secret") ||
    req.headers.get("authorization")?.replace("Bearer ", "");
  return provided === secret;
}

export async function GET(req: Request) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const url = new URL(req.url);
  const query = url.searchParams.get("q") || "";

  if (!query.trim()) {
    return NextResponse.json(
      { error: "Provide a query via ?q=<your question>" },
      { status: 400 }
    );
  }

  try {
    const result = await retrieveRagContext(query);

    if (!result) {
      return NextResponse.json({
        query,
        message:
          "No relevant chunks found, or query is not a Tamil Nadu civic question.",
        chunks: [],
        sources: [],
        promptContext: null,
      });
    }

    return NextResponse.json({
      query,
      chunks: result.chunks.map((r) => ({
        sourceId: r.chunk.metadata.sourceId,
        title: r.chunk.metadata.title,
        category: r.chunk.metadata.category,
        score: r.score,
        text: r.chunk.text.slice(0, 400),
        sourceUrl: r.chunk.metadata.sourceUrl,
      })),
      sources: result.sources,
      promptContextPreview: result.promptContext.slice(0, 1000),
    });
  } catch (error) {
    console.error("[RAG Search API] Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
