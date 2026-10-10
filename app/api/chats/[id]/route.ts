import { prisma } from "@/lib/prisma";
import { checkDatabaseConnection, getOrCreateUser } from "@/lib/db";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const dbConnected = await checkDatabaseConnection();
    if (!dbConnected) {
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 503 }
      );
    }

    const dbUser = await getOrCreateUser();

    const { title } = await req.json();

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    const chat = await prisma.chat.findFirst({
      where: {
        id,
        userId: dbUser.id,
      },
    });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    const updatedChat = await prisma.chat.update({
      where: { id },
      data: { title: title.trim() },
    });

    revalidatePath(`/chats/${id}`);
    revalidatePath("/chats");

    return NextResponse.json({ chat: updatedChat });
  } catch (error) {
    console.error("Error updating chat:", error);
    return NextResponse.json(
      { error: "Failed to update chat" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const dbConnected = await checkDatabaseConnection();
    if (!dbConnected) {
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 503 }
      );
    }

    const dbUser = await getOrCreateUser();

    const chat = await prisma.chat.findFirst({
      where: {
        id,
        userId: dbUser.id,
      },
    });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    await prisma.chat.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting chat:", error);
    return NextResponse.json(
      { error: "Failed to delete chat" },
      { status: 500 }
    );
  }
}
