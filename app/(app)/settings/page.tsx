import { ChatsSidebar } from "@/components/app/ChatsSidebar";
import { prisma } from "@/lib/prisma";
import { checkDatabaseConnection, getOrCreateUser } from "@/lib/db";

export default async function SettingsPage() {
  const dbConnected = await checkDatabaseConnection();
  if (!dbConnected) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-4 p-8">
          <h2 className="text-2xl font-semibold">Database Connection Error</h2>
          <p className="text-muted-foreground">
            Unable to connect to the database.
          </p>
        </div>
      </div>
    );
  }

  const dbUser = await getOrCreateUser().catch(() => null);

  if (!dbUser) {
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

  const chats = await prisma.chat.findMany({
    where: { userId: dbUser.id },
    orderBy: { updatedAt: "desc" },
    take: 50,
  }).catch(() => []);

  const formattedChats = chats.map((chat) => ({
    id: chat.id,
    title: chat.title,
    updatedAt: chat.updatedAt,
  }));

  return (
    <div className="flex h-full">
      <ChatsSidebar chats={formattedChats} />
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold mb-6">Settings</h1>
          <div className="space-y-6">
            <div className="border rounded-lg p-6">
              <h2 className="text-lg font-medium mb-4">Account</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="text-sm mt-1">{dbUser.name || "Local User"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-sm mt-1">{dbUser.email}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}