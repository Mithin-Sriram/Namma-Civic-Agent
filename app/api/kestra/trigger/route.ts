import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { workflowId, namespace = "namma-civic-agent", inputs } = await req.json();

    if (!workflowId) {
      return NextResponse.json(
        { error: "workflowId is required" },
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

    const response = await fetch(
      `${kestraUrl}/api/v1/executions/${namespace}/${workflowId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${kestraAuth}`,
        },
        body: JSON.stringify({ inputs: inputs || {} }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `Kestra API error: ${error}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ execution: data });
  } catch (error) {
    console.error("Kestra trigger error:", error);
    return NextResponse.json(
      { error: "Failed to trigger workflow" },
      { status: 500 }
    );
  }
}
