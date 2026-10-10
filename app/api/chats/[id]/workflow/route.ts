import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkDatabaseConnection, getOrCreateUser } from "@/lib/db";
import { parseCivicWorkflowMetadata } from "@/lib/chat-workflow/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const { id: chatId } = await params;
    const body: unknown = await req.json();
    if (body == null || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid workflow update" }, { status: 400 });
    }

    const { messageId, stepId, completed } = body as {
      messageId?: unknown;
      stepId?: unknown;
      completed?: unknown;
    };
    if (
      typeof messageId !== "string" ||
      typeof stepId !== "string" ||
      typeof completed !== "boolean"
    ) {
      return NextResponse.json({ error: "Invalid workflow update" }, { status: 400 });
    }

    if (!(await checkDatabaseConnection())) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 503 });
    }

    const dbUser = await getOrCreateUser();
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId: dbUser.id },
      select: { id: true },
    });
    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    const message = await prisma.message.findFirst({
      where: { id: messageId, chatId },
      select: { id: true, metadata: true },
    });
    if (!message) {
      return NextResponse.json({ error: "Workflow message not found" }, { status: 404 });
    }

    const workflow = parseCivicWorkflowMetadata(message.metadata);
    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    const step = workflow.steps.find((item) => item.id === stepId);
    if (!step) {
      return NextResponse.json({ error: "Workflow step not found" }, { status: 404 });
    }

    const stepIndex = workflow.steps.findIndex((item) => item.id === stepId);
    if (completed && workflow.steps.slice(0, stepIndex).some((item) => !item.completed)) {
      return NextResponse.json(
        { error: "Complete the previous workflow step first" },
        { status: 409 }
      );
    }

    if (completed) {
      step.completed = true;
    } else {
      workflow.steps.slice(stepIndex).forEach((item) => {
        item.completed = false;
      });
    }
    const metadata = JSON.parse(message.metadata ?? "{}") as Record<string, unknown>;
    await prisma.message.update({
      where: { id: message.id },
      data: { metadata: JSON.stringify({ ...metadata, workflow }) },
    });

    return NextResponse.json({ workflow });
  } catch (error) {
    console.error("Workflow progress update failed:", error);
    return NextResponse.json(
      { error: "Failed to update workflow progress" },
      { status: 500 }
    );
  }
}
