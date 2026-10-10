import { ChatsSidebar } from "@/components/app/ChatsSidebar";
import { ChatView } from "@/components/app/ChatView";
import { prisma } from "@/lib/prisma";
import { checkDatabaseConnection, getOrCreateUser } from "@/lib/db";
import { redirect } from "next/navigation";

interface ChatPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}

export default async function ChatPage({ params, searchParams }: ChatPageProps) {
  const { id } = await params;
  const searchParamsData = await searchParams;
  const initialQuery = searchParamsData.q;

  const dbConnected = await checkDatabaseConnection();
  if (!dbConnected) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-4 p-8">
          <h2 className="text-2xl font-semibold">Database Connection Error</h2>
          <p className="text-muted-foreground">
            Unable to connect to the database. Please check your DATABASE_URL environment variable.
          </p>
        </div>
      </div>
    );
  }

  let dbUser;
  try {
    dbUser = await getOrCreateUser();
  } catch (error) {
    console.error("Error getting or creating user:", error);
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-4 p-8">
          <h2 className="text-2xl font-semibold">Database Error</h2>
          <p className="text-muted-foreground">
            Unable to get or create user in the database.
          </p>
        </div>
      </div>
    );
  }

  const chat = await prisma.chat.findFirst({
    where: {
      id,
      userId: dbUser.id,
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          attachments: {
            select: {
              id: true,
              filename: true,
              originalName: true,
              mimeType: true,
              size: true,
            },
          },
        },
      },
    },
  }).catch(() => {
    return null;
  }) as any;

  if (!chat) {
    redirect("/chats");
  }

  const chats = await prisma.chat.findMany({
    where: { userId: dbUser.id },
    orderBy: { updatedAt: "desc" },
    take: 50,
  }).catch(() => {
    return [];
  });

  const formattedChats = chats.map((c) => ({
    id: c.id,
    title: c.title,
    updatedAt: c.updatedAt,
  }));

  const formattedMessages = (chat.messages || []).map((msg: any) => ({
    id: msg.id,
    role: msg.role as "user" | "assistant",
    content: msg.content,
    createdAt: msg.createdAt,
    attachments: (msg.attachments || []).length > 0 ? (msg.attachments || []).map((file: any) => ({
      id: file.id,
      filename: file.filename,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
    })) : undefined,
  }));

  return (
    <div className="flex h-full">
      <ChatsSidebar chats={formattedChats} />
      <div className="flex-1 flex flex-col">
        <ChatView 
          chatId={id} 
          initialMessages={formattedMessages} 
          chatTitle={chat.title}
          initialQuery={initialQuery}
        />
      </div>
    </div>
  );
}
