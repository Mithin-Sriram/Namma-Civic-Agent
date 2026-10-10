import { NextResponse } from "next/server";
import { generateDocument } from "@/lib/ai/service";

export async function POST(req: Request) {
  try {
    const { type, params } = await req.json();

    if (!type || !["rti", "complaint", "eligibility_summary"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid document type" },
        { status: 400 }
      );
    }

    if (!params || typeof params !== "object") {
      return NextResponse.json(
        { error: "Params are required" },
        { status: 400 }
      );
    }

    const document = await generateDocument(type, params);

    return NextResponse.json({ document });
  } catch (error) {
    console.error("Document generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate document" },
      { status: 500 }
    );
  }
}
