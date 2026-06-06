import { prisma } from "@/lib/prisma";

export async function getTaskByIdForOwner(taskId: string, ownerId: string) {
  return prisma.task.findFirst({
    where: {
      id: taskId,
      ownerId,
    },
  });
}
