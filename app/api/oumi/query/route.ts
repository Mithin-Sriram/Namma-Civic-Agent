import { NextResponse } from "next/server";
import { queryOumiModel } from "@/lib/oumi/service";

export async function POST(req: Request) {
  try {
    const { query, conversationHistory, useFineTuned } = await req.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query is required and must be a string" },
        { status: 400 }
      );
    }

    const result = await queryOumiModel({
      query,
      conversationHistory: conversationHistory || [],
      useFineTuned: useFineTuned || false,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("Oumi query error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to query model",
      },
      { status: 500 }
    );
  }
}
