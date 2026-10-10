import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ executionId: string }> }
) {
  try {
    const { executionId } = await context.params;

    if (!executionId) {
      return NextResponse.json(
        { error: "executionId is required" },
        { status: 400 }
      );
    }

    const kestraUrl = process.env.KESTRA_URL || "http://localhost:8080";
    const kestraAuth = process.env.KESTRA_AUTH;

    if (!kestraAuth) {
      return NextResponse.json(
        { error: "Kestra not configured" },
        { status: 503 }
      );
    }

    const response = await axios.get(
      `${kestraUrl}/api/v1/executions/${executionId}`,
      {
        headers: {
          Authorization: `Basic ${kestraAuth}`,
        },
      }
    );

    return NextResponse.json({
      success: true,
      execution: response.data,
    });
  } catch (error: any) {
    console.error("Kestra status check error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch execution status",
      },
      { status: error.response?.status || 500 }
    );
  }
}
