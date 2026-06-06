import { prisma } from "@/lib/prisma";

export async function getSampleForAnnotator(sampleId: string, annotatorId: string) {
  return prisma.sample.findFirst({
    where: {
      id: sampleId,
      assignedToId: annotatorId,
    },
    include: {
      task: {
        select: {
          id: true,
          formSchema: true,
          currentFormSchemaVersionId: true,
        },
      },
    },
  });
}
