import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: Request) {
  try {
    const { user_query } = await req.json();

    if (!user_query || typeof user_query !== "string") {
      return NextResponse.json(
        { error: "user_query is required and must be a string" },
        { status: 400 }
      );
    }

    const kestraUrl = process.env.KESTRA_URL || "http://localhost:8080";

    const namespace = "namma-civic-agent";
    const workflowId = "autocomplete-suggestions";
    const webhookKey = "autocomplete-suggestions-key";

    const webhookUrl = `${kestraUrl}/api/v1/executions/webhook/${namespace}/${workflowId}/${webhookKey}`;

    const kestraResponse = await axios.post(
      webhookUrl,
      {
        user_query,
      },
      {
        timeout: 30000,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const suggestions = kestraResponse.data.value;
    const executionId = kestraResponse.data.id;

    return NextResponse.json({
      success: true,
      executionId,
      data: suggestions,
      message: "Autocomplete suggestions generated successfully",
    });
  } catch (error: any) {
    console.error("Kestra webhook error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to generate autocomplete suggestions",
      },
      { status: error.response?.status || 500 }
    );
  }
}
