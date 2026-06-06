import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { AppRole } from "@/lib/auth/permissions";

const ROLE_COOKIE_KEY = "labelhub_role";

const roleProfiles: Record<
  AppRole,
  {
    name: string;
    email: string;
    dbRole: "ADMIN" | "OWNER" | "ANNOTATOR" | "REVIEWER";
  }
> = {
  ADMIN: {
    name: "Demo Admin",
    email: "admin@labelhub.local",
    dbRole: "ADMIN",
  },
  TASK_OWNER: {
    name: "Nora Chen",
    email: "owner@labelhub.local",
    dbRole: "OWNER",
  },
  ANNOTATOR: {
    name: "Alex Lin",
    email: "annotator.a@labelhub.local",
    dbRole: "ANNOTATOR",
  },
  REVIEWER: {
    name: "Rui Wang",
    email: "reviewer@labelhub.local",
    dbRole: "REVIEWER",
  },
};

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
};

export async function getCurrentUser() {
  const role = await getCurrentRole();
  const profile = roleProfiles[role];
  const user = await prisma.user.upsert({
    where: { email: profile.email },
    update: {
      name: profile.name,
      role: profile.dbRole,
    },
    create: {
      name: profile.name,
      email: profile.email,
      role: profile.dbRole,
    },
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role,
  } satisfies CurrentUser;
}

export async function getCurrentRole(): Promise<AppRole> {
  const value = (await cookies()).get(ROLE_COOKIE_KEY)?.value;
  if (value === "ADMIN" || value === "TASK_OWNER" || value === "ANNOTATOR" || value === "REVIEWER") {
    return value;
  }

  return "ADMIN";
}

export async function setCurrentRole(role: AppRole) {
  (await cookies()).set(ROLE_COOKIE_KEY, role, {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
  });
}

export async function getCurrentOwnerProject(userId: string) {
  const existingProject = await prisma.project.findFirst({
    where: { ownerId: userId },
    orderBy: { createdAt: "asc" },
  });

  if (existingProject) {
    return existingProject;
  }

  return prisma.project.create({
    data: {
      name: "默认数据标注项目",
      description: "任务负责人端 mock project。",
      ownerId: userId,
    },
  });
}
