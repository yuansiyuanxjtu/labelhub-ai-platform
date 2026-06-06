import { can } from "@/lib/auth/permissions";
import { getCurrentOwnerProject, getCurrentUser } from "@/lib/auth/currentUser";
import { prisma } from "@/lib/prisma";
import { hasTaskFormErrors, validateTaskForm, type TaskFormInput } from "@/lib/task-validation";
import { errorResponse, parseRequestBody, successResponse } from "@/lib/api/response";
import { createAuditLog } from "@/lib/services/auditLogService";
import { createTaskInput } from "@/lib/validators/api";

export async function GET() {
  const user = await getCurrentUser();
  if (!can(user.role, "task:view")) {
    return errorResponse("Forbidden", 403);
  }
  const tasks = await prisma.task.findMany({
    where: user.role === "ADMIN" ? {} : { ownerId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      project: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          samples: true,
          annotations: true,
        },
      },
    },
  });

  return successResponse({
    tasks: tasks.map((task) => ({
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
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const parsed = await parseRequestBody(request, createTaskInput);

  if (!parsed.ok) {
    return parsed.response;
  }

  const body = parsed.data;
  const input: TaskFormInput = {
    name: body.name,
    description: body.description,
    instruction: body.instruction,
    reviewRubric: body.reviewRubric,
    formSchema: body.formSchema,
  };
  const errors = validateTaskForm(input);

  if (hasTaskFormErrors(errors)) {
    return errorResponse("Invalid request", 400, errors);
  }

  const user = await getCurrentUser();
  if (!can(user.role, "task:create")) {
    return errorResponse("Forbidden", 403);
  }
  const project = await getCurrentOwnerProject(user.id);
  const task = await prisma.$transaction(async (tx) => {
    const createdTask = await tx.task.create({
      data: {
        projectId: project.id,
        ownerId: user.id,
        name: input.name.trim(),
        description: input.description.trim(),
        type: "QA_QUALITY",
        instruction: input.instruction.trim(),
        formSchema: input.formSchema.trim(),
        reviewRubric: input.reviewRubric.trim(),
        status: "DRAFT",
      },
    });

    const schemaVersion = await tx.formSchemaVersion.create({
      data: {
        taskId: createdTask.id,
        version: 1,
        schema: createdTask.formSchema,
        createdById: user.id,
        changeNote: "Initial schema",
      },
    });

    return tx.task.update({
      where: { id: createdTask.id },
      data: {
        currentFormSchemaVersionId: schemaVersion.id,
      },
    });
  });

  await createAuditLog({
    actorId: user.id,
    actorName: user.name,
    action: "task.created",
    entityType: "task",
    entityId: task.id,
    afterState: {
      taskName: task.name,
      taskStatus: task.status,
    },
    metadata: {
      projectId: project.id,
      currentFormSchemaVersionId: task.currentFormSchemaVersionId,
    },
  });

  return successResponse({ task: { id: task.id } }, 201);
}
