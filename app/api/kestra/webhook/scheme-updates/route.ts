import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: Request) {
  try {
    const kestraUrl = process.env.KESTRA_URL || "http://localhost:8080";

    const namespace = "namma-civic-agent";
    const workflowId = "weekly-scheme-updates";
    const webhookKey = "weekly-scheme-updates-key";

    const webhookUrl = `${kestraUrl}/api/v1/executions/webhook/${namespace}/${workflowId}/${webhookKey}`;

    const kestraResponse = await axios.post(
      webhookUrl,
      {},
      {
        timeout: 60000,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const executionId = kestraResponse.data.id;

    return NextResponse.json({
      success: true,
      executionId,
      message: "Scheme updates workflow triggered successfully",
      note: "This workflow may take several minutes to complete. Check Kestra UI for progress.",
    });
  } catch (error: any) {
    console.error("Kestra webhook error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to trigger scheme updates workflow",
      },
      { status: error.response?.status || 500 }
    );
  }
}

