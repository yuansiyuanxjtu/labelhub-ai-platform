import type { Prisma, SampleStatus } from "@prisma/client";
import { prisma } from "../prisma";

type DbClient = Prisma.TransactionClient | typeof prisma;

export const SAMPLE_STATUS = {
  PENDING: "PENDING",
  ASSIGNED: "ASSIGNED",
  IN_PROGRESS: "IN_PROGRESS",
  SUBMITTED: "SUBMITTED",
  AI_REVIEWING: "AI_REVIEWING",
  AI_REVIEWED: "AI_REVIEWED",
  HUMAN_REVIEWING: "HUMAN_REVIEWING",
  APPROVED: "APPROVED",
  RETURNED: "RETURNED",
  ESCALATED: "ESCALATED",
  EXPORTED: "EXPORTED",
} as const satisfies Record<SampleStatus, SampleStatus>;

export const sampleStatusTransitions = {
  PENDING: ["ASSIGNED"],
  ASSIGNED: ["IN_PROGRESS"],
  IN_PROGRESS: ["SUBMITTED"],
  SUBMITTED: ["AI_REVIEWING"],
  AI_REVIEWING: ["AI_REVIEWED"],
  AI_REVIEWED: ["HUMAN_REVIEWING"],
  HUMAN_REVIEWING: ["APPROVED", "RETURNED", "ESCALATED"],
  APPROVED: ["EXPORTED"],
  RETURNED: ["IN_PROGRESS"],
  ESCALATED: [],
  EXPORTED: [],
} as const satisfies Record<SampleStatus, readonly SampleStatus[]>;

export const ANNOTATION_STATUS = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  AI_REVIEWED: "AI_REVIEWED",
  NEEDS_HUMAN_REVIEW: "NEEDS_HUMAN_REVIEW",
  APPROVED: "APPROVED",
  RETURNED: "RETURNED",
  ESCALATED: "ESCALATED",
  REJECTED: "REJECTED",
  EXPORTED: "EXPORTED",
} as const;

export const HUMAN_REVIEW_DECISION = {
  APPROVED: "APPROVED",
  RETURNED: "RETURNED",
  ESCALATED: "ESCALATED",
} as const;

export type HumanReviewDecision =
  (typeof HUMAN_REVIEW_DECISION)[keyof typeof HUMAN_REVIEW_DECISION];

export function canTransition(from: SampleStatus, to: SampleStatus) {
  return (sampleStatusTransitions[from] as readonly SampleStatus[]).includes(to);
}

export function assertTransition(from: SampleStatus, to: SampleStatus) {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid sample status transition: ${from} -> ${to}`);
  }
}

export function getNextAvailableActions(status: SampleStatus) {
  return sampleStatusTransitions[status].map((nextStatus) => ({
    status: nextStatus,
    label: sampleStatusLabels[nextStatus],
  }));
}

export async function transitionSampleStatus(
  sampleId: string,
  nextStatus: SampleStatus,
  client: DbClient = prisma,
) {
  const sample = await client.sample.findUnique({
    where: { id: sampleId },
    select: {
      id: true,
      status: true,
    },
  });

  if (!sample) {
    throw new Error(`Sample not found: ${sampleId}`);
  }

  assertTransition(sample.status, nextStatus);

  return client.sample.update({
    where: { id: sampleId },
    data: { status: nextStatus },
    select: {
      id: true,
      status: true,
      updatedAt: true,
    },
  });
}

export function getSampleStatusForHumanDecision(decision: HumanReviewDecision) {
  return decision;
}

export function getAnnotationStatusForAiSuggestion(suggestion: string) {
  return suggestion === "HUMAN_REVIEW"
    ? ANNOTATION_STATUS.NEEDS_HUMAN_REVIEW
    : ANNOTATION_STATUS.AI_REVIEWED;
}

export function assertHumanReviewDecision(decision: unknown): asserts decision is HumanReviewDecision {
  if (
    decision !== HUMAN_REVIEW_DECISION.APPROVED &&
    decision !== HUMAN_REVIEW_DECISION.RETURNED &&
    decision !== HUMAN_REVIEW_DECISION.ESCALATED
  ) {
    throw new Error("Invalid review decision");
  }
}

const sampleStatusLabels = {
  PENDING: "待分配",
  ASSIGNED: "已分配",
  IN_PROGRESS: "标注中",
  SUBMITTED: "已提交",
  AI_REVIEWING: "AI 预审中",
  AI_REVIEWED: "AI 已预审",
  HUMAN_REVIEWING: "人工审核中",
  APPROVED: "已通过",
  RETURNED: "已退回",
  ESCALATED: "需仲裁",
  EXPORTED: "已导出",
} as const satisfies Record<SampleStatus, string>;
