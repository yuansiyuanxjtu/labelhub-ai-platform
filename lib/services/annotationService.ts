import { validateAnnotationValue } from "@/lib/annotation-validation";
import { prisma } from "@/lib/prisma";
import { getSampleForAnnotator } from "@/lib/services/sampleService";
import { createAuditLog } from "@/lib/services/auditLogService";
import type { SubmitAnnotationInput } from "@/lib/validators/api";
import {
  ANNOTATION_STATUS,
  SAMPLE_STATUS,
  transitionSampleStatus,
} from "@/lib/workflow/statusMachine";
import { ServiceError } from "@/lib/api/service-error";

export async function submitAnnotation(params: {
  sampleId: string;
  annotatorId: string;
  annotatorName?: string;
  input: SubmitAnnotationInput;
}) {
  const { sampleId, annotatorId, annotatorName, input } = params;
  const sample = await getSampleForAnnotator(sampleId, annotatorId);

  if (!sample) {
    throw new ServiceError("Sample not found", 404);
  }

  if (input.action === "submit") {
    const errors = validateAnnotationValue(sample.task.formSchema, input.annotationData);
    if (Object.keys(errors).length > 0) {
      throw new ServiceError("Invalid request", 400, errors);
    }
  }

  const now = new Date();
  const existingAnnotation = await prisma.annotation.findFirst({
    where: {
      sampleId: sample.id,
      annotatorId,
    },
    select: {
      id: true,
    },
  });

  const annotationPayload = {
    annotationData: JSON.stringify(input.annotationData, null, 2),
    formSchemaVersionId: sample.task.currentFormSchemaVersionId ?? null,
    status: input.action === "submit" ? ANNOTATION_STATUS.SUBMITTED : ANNOTATION_STATUS.DRAFT,
    submittedAt: input.action === "submit" ? now : null,
  } as const;

  const annotation = existingAnnotation
    ? await prisma.annotation.update({
        where: { id: existingAnnotation.id },
        data: annotationPayload,
      })
    : await prisma.annotation.create({
        data: {
          ...annotationPayload,
          taskId: sample.taskId,
          sampleId: sample.id,
          annotatorId,
        },
      });

  const updatedSample = await prisma.$transaction(async (tx) => {
    if (input.action === "draft") {
      if (sample.status === SAMPLE_STATUS.ASSIGNED || sample.status === SAMPLE_STATUS.RETURNED) {
        return transitionSampleStatus(sample.id, SAMPLE_STATUS.IN_PROGRESS, tx);
      }

      return tx.sample.findUniqueOrThrow({
        where: { id: sample.id },
        select: {
          id: true,
          status: true,
          updatedAt: true,
        },
      });
    }

    if (sample.status === SAMPLE_STATUS.ASSIGNED || sample.status === SAMPLE_STATUS.RETURNED) {
      await transitionSampleStatus(sample.id, SAMPLE_STATUS.IN_PROGRESS, tx);
    }

    return transitionSampleStatus(sample.id, SAMPLE_STATUS.SUBMITTED, tx);
  });

  await createAuditLog({
    action: input.action === "submit" ? "annotation.submitted" : "annotation.draft_saved",
    actorId: annotatorId,
    actorName: annotatorName ?? null,
    entityType: "sample",
    entityId: sample.id,
    beforeState: {
      sampleStatus: sample.status,
    },
    afterState: {
      sampleStatus: updatedSample.status,
      annotationStatus: annotation.status,
      formSchemaVersionId: annotation.formSchemaVersionId,
    },
    metadata: {
      annotationId: annotation.id,
      sampleId: sample.id,
      action: input.action,
      formSchemaVersionId: annotation.formSchemaVersionId,
    },
  });

  return {
    sample: {
      id: updatedSample.id,
      status: updatedSample.status,
      updatedAt: updatedSample.updatedAt.toISOString(),
    },
    annotation: {
      id: annotation.id,
      annotationData: annotation.annotationData,
      status: annotation.status,
      formSchemaVersionId: annotation.formSchemaVersionId,
      submittedAt: annotation.submittedAt?.toISOString() ?? null,
      updatedAt: annotation.updatedAt.toISOString(),
    },
  };
}
