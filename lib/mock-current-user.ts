import { prisma } from "@/lib/prisma";

export const MOCK_OWNER_EMAIL = "owner@labelhub.local";
export const MOCK_ANNOTATOR_EMAIL = "annotator.a@labelhub.local";
export const MOCK_REVIEWER_EMAIL = "reviewer@labelhub.local";

export async function getMockOwnerContext() {
  const owner = await prisma.user.upsert({
    where: { email: MOCK_OWNER_EMAIL },
    update: {},
    create: {
      name: "Nora Chen",
      email: MOCK_OWNER_EMAIL,
      role: "OWNER",
    },
  });

  const existingProject = await prisma.project.findFirst({
    where: { ownerId: owner.id },
    orderBy: { createdAt: "asc" },
  });

  if (existingProject) {
    return { owner, project: existingProject };
  }

  const project = await prisma.project.create({
    data: {
      name: "默认数据标注项目",
      description: "任务负责人端 mock project。",
      ownerId: owner.id,
    },
  });

  return { owner, project };
}

export async function getMockAnnotatorContext() {
  const annotator = await prisma.user.upsert({
    where: { email: MOCK_ANNOTATOR_EMAIL },
    update: {},
    create: {
      name: "Alex Lin",
      email: MOCK_ANNOTATOR_EMAIL,
      role: "ANNOTATOR",
    },
  });

  return { annotator };
}

export async function getMockReviewerContext() {
  const reviewer = await prisma.user.upsert({
    where: { email: MOCK_REVIEWER_EMAIL },
    update: {},
    create: {
      name: "Rui Wang",
      email: MOCK_REVIEWER_EMAIL,
      role: "REVIEWER",
    },
  });

  return { reviewer };
}
