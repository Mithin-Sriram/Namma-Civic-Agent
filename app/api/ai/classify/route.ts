import { NextResponse } from "next/server";
import { classifyQuery } from "@/lib/ai/service";

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    const category = await classifyQuery(query);

    return NextResponse.json({ category });
  } catch (error) {
    console.error("Classification error:", error);
    return NextResponse.json(
      { error: "Failed to classify query" },
      { status: 500 }
    );
  }
}
