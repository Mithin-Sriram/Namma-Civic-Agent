import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { FILE_CONFIG } from "@/config/files";

export async function POST(req: Request) {
  try {
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

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const messageId = formData.get("messageId") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (file.size > FILE_CONFIG.maxSize) {
      return NextResponse.json(
        { error: `File size exceeds ${FILE_CONFIG.maxSizeMB}MB limit` },
        { status: 400 }
      );
    }

    if (!(FILE_CONFIG.allowedMimeTypes as readonly string[]).includes(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed. Allowed types: PDF, images, Word documents, text files" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");

    const storageType = file.size > FILE_CONFIG.gridfsThreshold ? FILE_CONFIG.storageTypes.gridfs : FILE_CONFIG.storageTypes.mongodb;

    const fileRecord = await prisma.file.create({
      data: {
        userId: dbUser.id,
        messageId: messageId || null,
        filename: `${Date.now()}-${file.name}`,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        storageType,
        data: storageType === "mongodb" ? base64Data : null,
      },
    });

    return NextResponse.json({
      file: {
        id: fileRecord.id,
        filename: fileRecord.filename,
        originalName: fileRecord.originalName,
        mimeType: fileRecord.mimeType,
        size: fileRecord.size,
        url: `/api/files/${fileRecord.id}`,
      },
    });
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
