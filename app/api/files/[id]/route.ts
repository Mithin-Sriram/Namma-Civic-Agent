import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    let dbUser;
    try {
      dbUser = await getOrCreateUser();
    } catch (error) {
      console.error("Error getting or creating user:", error);
      return NextResponse.json(
        { error: "Failed to access user data" },
        { status: 500 }
      );
    }

    const file = await prisma.file.findFirst({
      where: {
        id,
        userId: dbUser.id,
      },
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    if (file.storageType === "mongodb" && file.data) {
      const buffer = Buffer.from(file.data, "base64");
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": file.mimeType,
          "Content-Disposition": `inline; filename="${file.originalName}"`,
          "Content-Length": buffer.length.toString(),
        },
      });
    }

    return NextResponse.json(
      { error: "File storage type not supported" },
      { status: 501 }
    );
  } catch (error) {
    console.error("File retrieval error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve file" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    let dbUser;
    try {
      dbUser = await getOrCreateUser();
    } catch (error) {
      console.error("Error getting or creating user:", error);
      return NextResponse.json(
        { error: "Failed to access user data" },
        { status: 500 }
      );
    }

    const file = await prisma.file.findFirst({
      where: {
        id,
        userId: dbUser.id,
      },
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    await prisma.file.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("File deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
