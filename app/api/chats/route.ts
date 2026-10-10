import { prisma } from "@/lib/prisma";
import { checkDatabaseConnection, getOrCreateUser } from "@/lib/db";
import { NextResponse } from "next/server";
import { CHAT_CONFIG } from "@/config/chat";

export async function POST(req: Request) {
  try {
    const dbConnected = await checkDatabaseConnection();
    if (!dbConnected) {
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 503 }
      );
    }

    const dbUser = await getOrCreateUser();

    const chat = await prisma.chat.create({
      data: {
        userId: dbUser.id,
        title: CHAT_CONFIG.defaultChatTitle,
      },
    });

    return NextResponse.json({ chat });
  } catch (error) {
    console.error("Error creating chat:", error);
    return NextResponse.json(
      { error: "Failed to create chat" },
      { status: 500 }
    );
  }
}
