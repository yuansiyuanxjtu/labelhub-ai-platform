import { getCurrentUser } from "@/lib/auth/currentUser";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { parseFormSchema, stringifyFormSchema, validateFormSchemaString } from "@/lib/form-schema";
import { errorResponse, parseRequestBody, successResponse } from "@/lib/api/response";
import { createAuditLog, getAuditLogsByEntity } from "@/lib/services/auditLogService";
import { updateFormSchemaInput } from "@/lib/validators/api";

type TaskDetailRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: TaskDetailRouteContext) {
  const { id } = await context.params;
  const user = await getCurrentUser();
  if (!can(user.role, "task:view")) {
    return errorResponse("Forbidden", 403);
  }
  const task = await prisma.task.findFirst({
    where: {
      id,
      ...(user.role === "ADMIN" ? {} : { ownerId: user.id }),
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
      samples: {
        orderBy: { createdAt: "asc" },
        take: 10,
        select: {
          id: true,
          externalId: true,
          rawData: true,
          status: true,
          assignedTo: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
      _count: {
        select: {
          samples: true,
          annotations: true,
          exportJobs: true,
        },
      },
      currentFormSchemaVersion: {
        select: {
          id: true,
          version: true,
          createdAt: true,
          changeNote: true,
        },
      },
    },
  });

  if (!task) {
    return errorResponse("Task not found", 404);
  }
  const auditLogs = await getAuditLogsByEntity("task", task.id, 20);

  return successResponse({
    task: {
      id: task.id,
      name: task.name,
      description: task.description,
      projectName: task.project.name,
      type: task.type,
      status: task.status,
      instruction: task.instruction,
      reviewRubric: task.reviewRubric,
      formSchema: task.formSchema,
      sampleCount: task._count.samples,
      annotationCount: task._count.annotations,
      exportJobCount: task._count.exportJobs,
      currentFormSchemaVersion: task.currentFormSchemaVersion
        ? {
            id: task.currentFormSchemaVersion.id,
            version: task.currentFormSchemaVersion.version,
            createdAt: task.currentFormSchemaVersion.createdAt.toISOString(),
            changeNote: task.currentFormSchemaVersion.changeNote,
          }
        : null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      samples: task.samples.map((sample) => ({
        id: sample.id,
        externalId: sample.externalId,
        rawData: sample.rawData,
        status: sample.status,
        assignedTo: sample.assignedTo,
      })),
      auditLogs,
    },
  });
}

export async function PATCH(request: Request, context: TaskDetailRouteContext) {
  const { id } = await context.params;
  const user = await getCurrentUser();
  if (!can(user.role, "task:update_schema")) {
    return errorResponse("Forbidden", 403);
  }
  const parsed = await parseRequestBody(request, updateFormSchemaInput);

  if (!parsed.ok) {
    return parsed.response;
  }

  const body = parsed.data;

  const error = validateFormSchemaString(body.formSchema);

  if (error) {
    return errorResponse("Invalid request", 400, [{ path: "formSchema", message: error }]);
  }

  const existingTask = await prisma.task.findFirst({
    where: {
      id,
      ...(user.role === "ADMIN" ? {} : { ownerId: user.id }),
    },
    select: {
      id: true,
      formSchema: true,
      currentFormSchemaVersionId: true,
    },
  });

  if (!existingTask) {
    return errorResponse("Task not found", 404);
  }

  const normalizedSchema = stringifyFormSchema(parseFormSchema(body.formSchema));
  const task = await prisma.$transaction(async (tx) => {
    const latestVersion = await tx.formSchemaVersion.findFirst({
      where: { taskId: id },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    const nextVersion = (latestVersion?.version ?? 0) + 1;
    const createdVersion = await tx.formSchemaVersion.create({
      data: {
        taskId: id,
        version: nextVersion,
        schema: normalizedSchema,
        createdById: user.id,
        changeNote: `Update schema to v${nextVersion}`,
      },
      select: {
        id: true,
        version: true,
      },
    });

    const updatedTask = await tx.task.update({
      where: { id },
      data: {
        formSchema: normalizedSchema,
        currentFormSchemaVersionId: createdVersion.id,
      },
      select: {
        id: true,
        formSchema: true,
        updatedAt: true,
        currentFormSchemaVersionId: true,
      },
    });

    return {
      ...updatedTask,
      currentVersionNumber: createdVersion.version,
    };
  });

  await createAuditLog({
    actorId: user.id,
    actorName: user.name,
    action: "task.form_schema.updated",
    entityType: "task",
    entityId: task.id,
    beforeState: {
      formSchemaLength: existingTask.formSchema.length,
    },
    afterState: {
      formSchemaLength: task.formSchema.length,
      currentFormSchemaVersionId: task.currentFormSchemaVersionId,
    },
    metadata: {
      updatedAt: task.updatedAt.toISOString(),
    },
  });

  return successResponse({
    task: {
      id: task.id,
      formSchema: task.formSchema,
      currentFormSchemaVersionId: task.currentFormSchemaVersionId,
      currentFormSchemaVersion: task.currentVersionNumber,
      updatedAt: task.updatedAt.toISOString(),
    },
  });
}
