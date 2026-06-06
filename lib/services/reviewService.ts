import { createQualityGuardAgent } from "@/lib/agents/qualityGuardAgent";
import { ServiceError } from "@/lib/api/service-error";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/services/auditLogService";
import type { SubmitHumanReviewInput } from "@/lib/validators/api";
import {
  ANNOTATION_STATUS,
  getAnnotationStatusForAiSuggestion,
  getSampleStatusForHumanDecision,
  SAMPLE_STATUS,
  transitionSampleStatus,
} from "@/lib/workflow/statusMachine";

export async function runAiReview(annotationId: string) {
  const annotation = await prisma.annotation.findUnique({
    where: { id: annotationId },
    include: {
      task: {
        select: {
          name: true,
          instruction: true,
          reviewRubric: true,
          formSchema: true,
        },
      },
      sample: {
        select: {
          id: true,
          rawData: true,
          status: true,
        },
      },
    },
  });

  if (!annotation) {
    throw new ServiceError("Annotation not found", 404);
  }

  if (
    annotation.status !== ANNOTATION_STATUS.SUBMITTED ||
    annotation.sample.status !== SAMPLE_STATUS.SUBMITTED
  ) {
    throw new ServiceError("Only submitted annotations can be reviewed by QualityGuard Agent", 400);
  }

  const agent = createQualityGuardAgent();
  const reviewed = await agent.reviewWithMeta({
    taskTitle: annotation.task.name,
    taskInstruction: annotation.task.instruction,
    reviewRubric: annotation.task.reviewRubric,
    formSchema: annotation.task.formSchema,
    sampleRawData: annotation.sample.rawData,
    annotationData: annotation.annotationData,
  });
  const result = reviewed.result;

  const aiReview = await prisma.$transaction(async (tx) => {
    await transitionSampleStatus(annotation.sample.id, SAMPLE_STATUS.AI_REVIEWING, tx);

    const review = await tx.aiReview.upsert({
      where: {
        annotationId: annotation.id,
      },
      update: {
        score: result.score,
        riskLevel: result.riskLevel,
        issues: JSON.stringify(result.issues, null, 2),
        suggestion: result.suggestion,
        comment: result.comment,
        confidence: result.confidence,
        rubricEvidence: JSON.stringify(result.rubricEvidence, null, 2),
      },
      create: {
        annotationId: annotation.id,
        score: result.score,
        riskLevel: result.riskLevel,
        issues: JSON.stringify(result.issues, null, 2),
        suggestion: result.suggestion,
        comment: result.comment,
        confidence: result.confidence,
        rubricEvidence: JSON.stringify(result.rubricEvidence, null, 2),
      },
    });

    await tx.annotation.update({
      where: { id: annotation.id },
      data: {
        status: getAnnotationStatusForAiSuggestion(result.suggestion),
      },
    });

    await transitionSampleStatus(annotation.sample.id, SAMPLE_STATUS.AI_REVIEWED, tx);

    return review;
  });

  await createAuditLog({
    action: "ai_review.completed",
    entityType: "annotation",
    entityId: annotation.id,
    beforeState: {
      annotationStatus: annotation.status,
      sampleStatus: annotation.sample.status,
    },
    afterState: {
      annotationStatus: getAnnotationStatusForAiSuggestion(result.suggestion),
      sampleStatus: SAMPLE_STATUS.AI_REVIEWED,
    },
    metadata: {
      sampleId: annotation.sample.id,
      riskLevel: result.riskLevel,
      score: result.score,
      suggestion: result.suggestion,
      provider: reviewed.meta.provider,
      latencyMs: reviewed.meta.latencyMs,
      status: reviewed.meta.status,
      fallbackUsed: reviewed.meta.fallbackUsed,
      errorMessage: reviewed.meta.errorMessage ?? null,
      promptSummary: buildPromptSummary(annotation.task.instruction, annotation.task.reviewRubric),
    },
  });

  return {
    aiReview: {
      id: aiReview.id,
      annotationId: aiReview.annotationId,
      score: aiReview.score,
      riskLevel: aiReview.riskLevel,
      issues: result.issues,
      suggestion: aiReview.suggestion,
      comment: aiReview.comment,
      confidence: aiReview.confidence,
      rubricEvidence: result.rubricEvidence,
      updatedAt: aiReview.updatedAt.toISOString(),
    },
  };
}

function buildPromptSummary(instruction: string, reviewRubric: string) {
  const instructionSummary = instruction.trim().slice(0, 120);
  const rubricSummary = reviewRubric.trim().slice(0, 120);

  return `${instructionSummary}${rubricSummary ? ` | ${rubricSummary}` : ""}`;
}

export async function submitHumanReview(params: {
  annotationId: string;
  reviewerId: string;
  reviewerName?: string;
  input: SubmitHumanReviewInput;
}) {
  const { annotationId, reviewerId, reviewerName, input } = params;
  const annotation = await prisma.annotation.findUnique({
    where: { id: annotationId },
    include: {
      aiReview: {
        select: {
          id: true,
        },
      },
      sample: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  if (!annotation) {
    throw new ServiceError("Annotation not found", 404);
  }

  if (!annotation.aiReview) {
    throw new ServiceError("Annotation must complete AI review before human review", 400);
  }

  if (
    annotation.sample.status !== SAMPLE_STATUS.AI_REVIEWED &&
    annotation.sample.status !== SAMPLE_STATUS.HUMAN_REVIEWING
  ) {
    throw new ServiceError("Sample must complete AI review before human review", 400);
  }

  const { humanReview, updatedAnnotation, updatedSample } = await prisma.$transaction(async (tx) => {
    if (annotation.sample.status === SAMPLE_STATUS.AI_REVIEWED) {
      await transitionSampleStatus(annotation.sample.id, SAMPLE_STATUS.HUMAN_REVIEWING, tx);
    }

    const review = await tx.humanReview.create({
      data: {
        annotationId: annotation.id,
        reviewerId,
        decision: input.decision,
        comment: input.comment?.trim() || null,
      },
      include: {
        reviewer: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    const nextAnnotation = await tx.annotation.update({
      where: { id: annotation.id },
      data: {
        status: input.decision,
      },
      select: {
        id: true,
        status: true,
        updatedAt: true,
      },
    });

    const nextSample = await transitionSampleStatus(
      annotation.sample.id,
      getSampleStatusForHumanDecision(input.decision),
      tx,
    );

    return {
      humanReview: review,
      updatedAnnotation: nextAnnotation,
      updatedSample: nextSample,
    };
  });

  await createAuditLog({
    action: "human_review.submitted",
    actorId: reviewerId,
    actorName: reviewerName ?? null,
    entityType: "annotation",
    entityId: annotation.id,
    beforeState: {
      sampleStatus: annotation.sample.status,
      annotationStatus: annotation.status,
    },
    afterState: {
      sampleStatus: updatedSample.status,
      annotationStatus: updatedAnnotation.status,
      decision: humanReview.decision,
    },
    metadata: {
      decision: input.decision,
      sampleId: annotation.sample.id,
      humanReviewId: humanReview.id,
    },
  });

  return {
    annotation: {
      id: updatedAnnotation.id,
      status: updatedAnnotation.status,
      updatedAt: updatedAnnotation.updatedAt.toISOString(),
    },
    sample: {
      id: updatedSample.id,
      status: updatedSample.status,
      updatedAt: updatedSample.updatedAt.toISOString(),
    },
    humanReview: {
      id: humanReview.id,
      decision: humanReview.decision,
      comment: humanReview.comment,
      reviewedAt: humanReview.reviewedAt.toISOString(),
      reviewer: humanReview.reviewer,
    },
  };
}
