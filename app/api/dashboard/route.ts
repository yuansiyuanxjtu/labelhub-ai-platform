import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ANNOTATION_STATUS,
  HUMAN_REVIEW_DECISION,
  SAMPLE_STATUS,
} from "@/lib/workflow/statusMachine";

export async function GET() {
  const [
    totalTasks,
    totalSamples,
    annotatedCount,
    pendingReviewCount,
    approvedSampleCount,
    highRiskCount,
    approvedReviewCount,
    reviewedCount,
    exportableCount,
    sampleStatusGroups,
    aiRiskGroups,
    recentTasks,
    annotators,
    recentReviews,
  ] = await Promise.all([
    prisma.task.count(),
    prisma.sample.count(),
    prisma.sample.count({
      where: {
        status: {
          in: [
            SAMPLE_STATUS.SUBMITTED,
            SAMPLE_STATUS.AI_REVIEWING,
            SAMPLE_STATUS.AI_REVIEWED,
            SAMPLE_STATUS.HUMAN_REVIEWING,
            SAMPLE_STATUS.APPROVED,
            SAMPLE_STATUS.RETURNED,
            SAMPLE_STATUS.ESCALATED,
            SAMPLE_STATUS.EXPORTED,
          ],
        },
      },
    }),
    prisma.sample.count({
      where: {
        status: {
          in: [SAMPLE_STATUS.AI_REVIEWED, SAMPLE_STATUS.HUMAN_REVIEWING],
        },
      },
    }),
    prisma.sample.count({
      where: {
        status: SAMPLE_STATUS.APPROVED,
      },
    }),
    prisma.aiReview.count({
      where: {
        riskLevel: "HIGH",
      },
    }),
    prisma.humanReview.count({
      where: {
        decision: HUMAN_REVIEW_DECISION.APPROVED,
      },
    }),
    prisma.humanReview.count(),
    prisma.sample.count({
      where: {
        status: SAMPLE_STATUS.APPROVED,
      },
    }),
    prisma.sample.groupBy({
      by: ["status"],
      _count: {
        _all: true,
      },
    }),
    prisma.aiReview.groupBy({
      by: ["riskLevel"],
      _count: {
        _all: true,
      },
    }),
    prisma.task.findMany({
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: {
        _count: {
          select: {
            samples: true,
            annotations: true,
          },
        },
      },
    }),
    prisma.user.findMany({
      where: {
        role: "ANNOTATOR",
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 8,
      include: {
        _count: {
          select: {
            assignedSamples: true,
            annotations: true,
          },
        },
      },
    }),
    prisma.humanReview.findMany({
      orderBy: {
        reviewedAt: "desc",
      },
      take: 6,
      include: {
        reviewer: {
          select: {
            name: true,
          },
        },
        annotation: {
          select: {
            sample: {
              select: {
                externalId: true,
                status: true,
              },
            },
            task: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const humanPassRate =
    reviewedCount === 0 ? 0 : Math.round((approvedReviewCount / reviewedCount) * 100);

  return NextResponse.json({
    metrics: {
      totalTasks,
      totalSamples,
      annotatedCount,
      pendingReviewCount,
      approvedSampleCount,
      highRiskCount,
      humanPassRate,
      exportableCount,
    },
    sampleStatusDistribution: sampleStatusGroups.map((group) => ({
      status: group.status,
      count: group._count._all,
    })),
    aiRiskDistribution: aiRiskGroups.map((group) => ({
      riskLevel: group.riskLevel,
      count: group._count._all,
    })),
    recentTasks: recentTasks.map((task) => ({
      id: task.id,
      name: task.name,
      status: task.status,
      sampleCount: task._count.samples,
      annotationCount: task._count.annotations,
      progress:
        task._count.samples === 0
          ? 0
          : Math.round((task._count.annotations / task._count.samples) * 100),
      updatedAt: task.updatedAt.toISOString(),
    })),
    annotatorWorkloads: annotators.map((annotator) => ({
      id: annotator.id,
      name: annotator.name,
      email: annotator.email,
      assignedCount: annotator._count.assignedSamples,
      annotationCount: annotator._count.annotations,
      completionRate:
        annotator._count.assignedSamples === 0
          ? 0
          : Math.round((annotator._count.annotations / annotator._count.assignedSamples) * 100),
    })),
    recentReviews: recentReviews.map((review) => ({
      id: review.id,
      decision: review.decision,
      comment: review.comment,
      reviewedAt: review.reviewedAt.toISOString(),
      reviewerName: review.reviewer.name,
      taskName: review.annotation.task.name,
      sampleExternalId: review.annotation.sample.externalId,
      sampleStatus: review.annotation.sample.status,
    })),
    queues: {
      submittedCount: await prisma.sample.count({
        where: { status: SAMPLE_STATUS.SUBMITTED },
      }),
      aiReviewedCount: await prisma.annotation.count({
        where: { status: ANNOTATION_STATUS.AI_REVIEWED },
      }),
      needsHumanReviewCount: await prisma.annotation.count({
        where: { status: ANNOTATION_STATUS.NEEDS_HUMAN_REVIEW },
      }),
    },
  });
}
