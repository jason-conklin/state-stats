import { prisma } from "./db";

export async function getLatestSuccessfulIngestion() {
  try {
    const run = await prisma.ingestionRun.findFirst({
      where: { status: "success" },
      orderBy: { completedAt: "desc" },
    });
    return run;
  } catch {
    // If the database cannot be reached, return null so callers can fall back gracefully.
    return null;
  }
}
