import { prisma } from "./prisma";

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await Promise.race([
      prisma.user.count(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Connection timeout")), 5000)
      )
    ]);
    return true;
  } catch {
    return false;
  }
}

export async function getOrCreateUser() {
  const localEmail = "local@namma-civic-agent.local";
  const existingUser = await prisma.user.findFirst({
    where: { email: localEmail },
  });

  if (existingUser) return existingUser;

  return prisma.user.create({
    data: {
      email: localEmail,
      name: "Local User",
      role: "user",
    },
  });
}
