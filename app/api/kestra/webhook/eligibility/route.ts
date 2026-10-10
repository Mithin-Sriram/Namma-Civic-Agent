import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: Request) {
  try {
    const { pdf_url, scheme_name, country } = await req.json();

    if (!pdf_url || !scheme_name) {
      return NextResponse.json(
        { error: "pdf_url and scheme_name are required" },
        { status: 400 }
      );
    }

    const kestraUrl = process.env.KESTRA_URL || "http://localhost:8080";

    const namespace = "namma-civic-agent";
    const workflowId = "eligibility-rule-extractor";
    const webhookKey = "eligibility-extractor-key";

    const webhookUrl = `${kestraUrl}/api/v1/executions/webhook/${namespace}/${workflowId}/${webhookKey}`;

    const kestraResponse = await axios.post(
      webhookUrl,
      {
        pdf_url,
        scheme_name,
        country: country || "Unknown",
      },
      {
        timeout: 30000,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const outputUri = kestraResponse.data.value;
    const executionId = kestraResponse.data.id;

    return NextResponse.json({
      success: true,
      executionId,
      outputUri,
      message: "Eligibility extraction workflow triggered successfully",
    });
  } catch (error: any) {
    console.error("Kestra webhook error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to trigger eligibility extraction workflow",
      },
      { status: error.response?.status || 500 }
    );
  }
}
