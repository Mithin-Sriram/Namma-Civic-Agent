import { prisma } from "@/lib/prisma";
import { checkDatabaseConnection, getOrCreateUser } from "@/lib/db";
import { NextResponse } from "next/server";
import { getChatStream } from "@/lib/ai/service";
import { generateChatTitle } from "@/lib/ai/title";
import { CHAT_CONFIG } from "@/config/chat";
import { extractMultipleFileContents, formatFileContentsForPrompt } from "@/lib/files/extract";
import { lookupTNInfo } from "@/lib/tn-info/service";
import { isTamilNaduCivicQuestion, searchTamilNaduGovernmentWeb } from "@/lib/web-search/service";
import { generateCivicWorkflowResponse } from "@/lib/chat-workflow/service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function* streamSingleAnswer(answer: string): AsyncGenerator<string, void, unknown> {
  yield answer;
}

export async function POST(req: Request, { params }: RouteParams) {
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
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: CHAT_CONFIG.messageHistoryLimit,
        },
      },
    });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    const { content, stream, fileIds } = await req.json();

    if (!content && (!fileIds || fileIds.length === 0)) {
      return NextResponse.json(
        { error: "Content or file attachments are required" },
        { status: 400 }
      );
    }

    let enhancedContent = content || "";
    if (fileIds && Array.isArray(fileIds) && fileIds.length > 0) {
      try {
        const fileContents = await extractMultipleFileContents(fileIds);
        enhancedContent = formatFileContentsForPrompt(fileContents, content || "");
      } catch (error) {
        console.error("Attached file extraction failed:", error);
      }
    }
    const tnInfoResult = typeof content === "string" && content.trim()
      ? await lookupTNInfo(content)
      : null;
    const webSearchResult =
      typeof content === "string" &&
      isTamilNaduCivicQuestion(content) &&
      tnInfoResult?.attribution.status !== "success"
        ? await searchTamilNaduGovernmentWeb(content)
        : null;
    const externalContext = [
      tnInfoResult?.promptContext,
      webSearchResult?.promptContext,
    ].filter(Boolean).join("\n\n");
    const workflowResponse = typeof content === "string" &&
      isTamilNaduCivicQuestion(content)
      ? await generateCivicWorkflowResponse(
          enhancedContent,
          externalContext,
          webSearchResult?.answer ?? "",
          chat.messages.map((msg) => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          }))
        )
      : null;
    const messageMetadata = tnInfoResult || webSearchResult || workflowResponse
      ? JSON.stringify({
          ...(tnInfoResult ? { tnInfo: tnInfoResult.attribution } : {}),
          ...(webSearchResult ? { webSearch: webSearchResult.attribution } : {}),
          ...(workflowResponse ? { workflow: workflowResponse.workflow } : {}),
        })
      : undefined;
    const userMessage = await prisma.message.create({
      data: {
        chatId: chat.id,
        role: "user",
        content: content || (fileIds && fileIds.length > 0 ? `[Attached ${fileIds.length} file(s)]` : ""),
      },
    });

    if (fileIds && Array.isArray(fileIds) && fileIds.length > 0) {
      await prisma.file.updateMany({
        where: {
          id: { in: fileIds },
          userId: dbUser.id,
        },
        data: {
          messageId: userMessage.id,
        },
      });
    }

    if (chat.title === CHAT_CONFIG.defaultChatTitle) {
      const titleText = content || (fileIds && fileIds.length > 0 ? `Files: ${fileIds.length}` : "");
      const title = generateChatTitle(titleText);
      await prisma.chat.update({
        where: { id: chat.id },
        data: { title },
      });
    }

    await prisma.chat.update({
      where: { id: chat.id },
      data: { updatedAt: new Date() },
    });

    const conversationHistory = chat.messages.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));

    if (stream) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          let fullContent = "";

          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ 
                type: 'userMessage',
                userMessage: {
                  id: userMessage.id,
                  role: userMessage.role,
                  content: userMessage.content,
                  createdAt: userMessage.createdAt.toISOString(),
                  attachments: fileIds && fileIds.length > 0 ? await prisma.file.findMany({
                    where: { id: { in: fileIds } },
                    select: {
                      id: true,
                      filename: true,
                      originalName: true,
                      mimeType: true,
                      size: true,
                    },
                  }) : undefined,
                }
              })}\n\n`)
            );

            const assistantMessage = await prisma.message.create({
              data: {
                chatId: chat.id,
                role: "assistant",
                content: "",
                metadata: messageMetadata,
              },
            });

            if (tnInfoResult) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  type: "tnInfo",
                  messageId: assistantMessage.id,
                  attribution: tnInfoResult.attribution,
                })}\n\n`)
              );
            }

            if (webSearchResult) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  type: "webSearch",
                  messageId: assistantMessage.id,
                  attribution: webSearchResult.attribution,
                })}\n\n`)
              );
            }

            if (workflowResponse) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  type: "workflow",
                  messageId: assistantMessage.id,
                  workflow: workflowResponse.workflow,
                })}\n\n`)
              );
            }

            const answerStream = workflowResponse
              ? streamSingleAnswer(workflowResponse.answer)
              : webSearchResult?.answer
                ? streamSingleAnswer(webSearchResult.answer)
              : getChatStream(
                  enhancedContent,
                  conversationHistory,
                  false,
                  externalContext
                );

            for await (const chunk of answerStream) {
              fullContent += chunk;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ 
                  type: 'chunk',
                  chunk, 
                  messageId: assistantMessage.id 
                })}\n\n`)
              );
            }

            await prisma.message.update({
              where: { id: assistantMessage.id },
              data: { content: fullContent },
            });

            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            controller.close();
          } catch (error) {
            console.error("Streaming error:", error);
            controller.error(error);
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    let fullContent = "";
    const answerStream = workflowResponse
      ? streamSingleAnswer(workflowResponse.answer)
      : webSearchResult?.answer
        ? streamSingleAnswer(webSearchResult.answer)
      : getChatStream(
          enhancedContent,
          conversationHistory,
          false,
          externalContext
        );

    for await (const chunk of answerStream) {
      fullContent += chunk;
    }

    const assistantMessage = await prisma.message.create({
      data: {
        chatId: chat.id,
        role: "assistant",
        content: fullContent,
        metadata: messageMetadata,
      },
    });

    return NextResponse.json({
      userMessage,
      assistantMessage: {
        id: assistantMessage.id,
        role: assistantMessage.role,
        content: assistantMessage.content,
        createdAt: assistantMessage.createdAt,
        tnInfo: tnInfoResult?.attribution,
        webSearch: webSearchResult?.attribution,
        workflow: workflowResponse?.workflow,
      },
    });
  } catch (error) {
    console.error("Message error:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
