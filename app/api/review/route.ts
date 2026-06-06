import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { ANNOTATION_STATUS } from "@/lib/workflow/statusMachine";

export async function GET() {
  const user = await getCurrentUser();
  if (!can(user.role, "review:view")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const annotations = await prisma.annotation.findMany({
    where: {
      aiReview: {
        isNot: null,
      },
      status: {
        in: [
          ANNOTATION_STATUS.AI_REVIEWED,
          ANNOTATION_STATUS.NEEDS_HUMAN_REVIEW,
          ANNOTATION_STATUS.APPROVED,
          ANNOTATION_STATUS.RETURNED,
          ANNOTATION_STATUS.ESCALATED,
        ],
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      task: {
        select: {
          id: true,
          name: true,
        },
      },
      sample: {
        select: {
          id: true,
          externalId: true,
          rawData: true,
          status: true,
        },
      },
      annotator: {
        select: {
          name: true,
          email: true,
        },
      },
      formSchemaVersion: {
        select: {
          id: true,
          version: true,
        },
      },
      aiReview: true,
      humanReviews: {
        orderBy: {
          reviewedAt: "desc",
        },
        take: 1,
        include: {
          reviewer: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  const annotationIds = annotations.map((annotation) => annotation.id);
  const aiReviewAuditLogs =
    annotationIds.length > 0
      ? await prisma.auditLog.findMany({
          where: {
            action: "ai_review.completed",
            entityType: "annotation",
            entityId: { in: annotationIds },
          },
          orderBy: {
            createdAt: "desc",
          },
        })
      : [];
  const aiReviewRunByAnnotationId = new Map<
    string,
    {
      provider: string;
      fallbackUsed: boolean;
      status: string;
    }
  >();
  for (const log of aiReviewAuditLogs) {
    if (aiReviewRunByAnnotationId.has(log.entityId)) {
      continue;
    }
    const metadata = parseObject(log.metadata);
    aiReviewRunByAnnotationId.set(log.entityId, {
      provider: typeof metadata.provider === "string" ? metadata.provider : "unknown",
      fallbackUsed: Boolean(metadata.fallbackUsed),
      status: typeof metadata.status === "string" ? metadata.status : "unknown",
    });
  }

  return NextResponse.json({
    items: annotations.map((annotation) => ({
      id: annotation.id,
      status: annotation.status,
      annotationData: annotation.annotationData,
      formSchemaVersion: annotation.formSchemaVersion
        ? {
            id: annotation.formSchemaVersion.id,
            version: annotation.formSchemaVersion.version,
          }
        : null,
      task: annotation.task,
      sample: annotation.sample,
      annotator: annotation.annotator,
      aiReview: annotation.aiReview
        ? {
            id: annotation.aiReview.id,
            score: annotation.aiReview.score,
            riskLevel: annotation.aiReview.riskLevel,
            issues: parseIssues(annotation.aiReview.issues),
            suggestion: annotation.aiReview.suggestion,
            comment: annotation.aiReview.comment,
            confidence: annotation.aiReview.confidence,
            rubricEvidence: parseRubricEvidence(annotation.aiReview.rubricEvidence),
            run: aiReviewRunByAnnotationId.get(annotation.id) ?? {
              provider: "unknown",
              fallbackUsed: false,
              status: "unknown",
            },
            updatedAt: annotation.aiReview.updatedAt.toISOString(),
          }
        : null,
      humanReview: annotation.humanReviews[0]
        ? {
            id: annotation.humanReviews[0].id,
            decision: annotation.humanReviews[0].decision,
            comment: annotation.humanReviews[0].comment,
            reviewedAt: annotation.humanReviews[0].reviewedAt.toISOString(),
            reviewer: annotation.humanReviews[0].reviewer,
          }
        : null,
      updatedAt: annotation.updatedAt.toISOString(),
    })),
  });
}

function parseObject(value: string | null) {
  if (!value) {
    return {} as Record<string, unknown>;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return {} as Record<string, unknown>;
  }

  return {} as Record<string, unknown>;
}

function parseIssues(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;

    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  } catch {
    return value ? [value] : [];
  }
}

function parseRubricEvidence(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((item) => {
      const raw = item as {
        criterion?: unknown;
        result?: unknown;
        reason?: unknown;
      };

      return {
        criterion: String(raw.criterion ?? ""),
        result: String(raw.result ?? "WARN"),
        reason: String(raw.reason ?? ""),
      };
    });
  } catch {
    return [];
  }
}
