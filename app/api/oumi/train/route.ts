import { NextResponse } from "next/server";
import { OUMI_CONFIG } from "@/config/oumi";

export async function POST(req: Request) {
  try {
    const { configPath } = await req.json().catch(() => ({}));
    const configFile = configPath || OUMI_CONFIG.configPath;

    const fs = await import("fs/promises");
    try {
      await fs.access(configFile);
    } catch {
      return NextResponse.json(
        { error: `Config file not found: ${configFile}` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Training instructions",
      configFile,
      command: `${OUMI_CONFIG.training.command} train -c ${configFile}`,
      instructions: [
        "1. Install Oumi: pip install oumi[gpu]",
        "2. Run training command (see 'command' field above)",
        "3. Training takes 30-60 minutes",
        "4. Model will be saved to: ./models/namma-civic-agent-finetuned",
        "5. Start model server: oumi serve --model ./models/namma-civic-agent-finetuned --port 8000",
        "6. Set OUMI_MODEL_URL=http://localhost:8000 in .env.local",
      ],
      note: "For production, use a job queue or separate training service. This endpoint provides instructions only.",
    });
  } catch (error: any) {
    console.error("Oumi training trigger error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to get training instructions",
      },
      { status: 500 }
    );
  }
}
