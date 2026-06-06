import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const annotator = await getCurrentUser();
  if (!can(annotator.role, "annotation:view_assigned")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const samples = await prisma.sample.findMany({
    where: {
      assignedToId: annotator.id,
    },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    include: {
      task: {
        select: {
          id: true,
          name: true,
          instruction: true,
          formSchema: true,
        },
      },
      annotations: {
        where: {
          annotatorId: annotator.id,
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: 1,
        select: {
          id: true,
          annotationData: true,
          status: true,
          submittedAt: true,
          updatedAt: true,
        },
      },
    },
  });

  return NextResponse.json({
    annotator: {
      id: annotator.id,
      name: annotator.name,
      email: annotator.email,
    },
    samples: samples.map((sample) => {
      const annotation = sample.annotations[0] ?? null;

      return {
        id: sample.id,
        taskId: sample.taskId,
        externalId: sample.externalId,
        rawData: sample.rawData,
        status: sample.status,
        updatedAt: sample.updatedAt.toISOString(),
        task: sample.task,
        annotation: annotation
          ? {
              ...annotation,
              submittedAt: annotation.submittedAt?.toISOString() ?? null,
              updatedAt: annotation.updatedAt.toISOString(),
            }
          : null,
      };
    }),
  });
}
