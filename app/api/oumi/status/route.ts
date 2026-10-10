import { NextResponse } from "next/server";
import { checkOumiModelStatus } from "@/lib/oumi/service";

export async function GET(req: Request) {
  try {
    const status = await checkOumiModelStatus();

    return NextResponse.json({
      success: true,
      ...status,
    });
  } catch (error: any) {
    console.error("Oumi status check error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to check Oumi status",
      },
      { status: 500 }
    );
  }
}
