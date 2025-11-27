import { prisma } from "./db";

export async function getLatestSuccessfulIngestion() {
  const run = await prisma.ingestionRun.findFirst({
    where: { status: "success" },
    orderBy: { completedAt: "desc" },
  });
  return run;
}
