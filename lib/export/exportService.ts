import type { ExportFormat } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/services/auditLogService";
import { SAMPLE_STATUS, transitionSampleStatus } from "@/lib/workflow/statusMachine";

export const exportFormats = ["JSON", "CSV", "JSONL", "OPENAI_JSONL"] as const;

export type LabelHubExportFormat = (typeof exportFormats)[number];

export type ExportOptions = {
  taskId: string;
  format: LabelHubExportFormat;
  includeAiReview: boolean;
  includeHumanReview: boolean;
  includeTaskMetadata: boolean;
};

export type ExportRecord = {
  sampleId: string;
  rawData: unknown;
  annotationData: unknown;
  aiReview?: unknown;
  humanReview?: unknown;
  taskId: string;
  taskName: string;
  taskMetadata?: {
    description: string;
    instruction: string;
    reviewRubric: unknown;
    formSchema: unknown;
  };
  exportedAt: string;
};

export type ExportLoadedTask = {
  id: string;
  name: string;
  description: string;
  instruction: string;
  reviewRubric: string;
  formSchema: string;
  samples: Array<{
    id: string;
    rawData: string;
    status: string;
    annotations: Array<{
      annotationData: string;
      aiReview: {
        score: number;
        riskLevel: string;
        issues: string;
        suggestion: string | null;
        comment: string | null;
        confidence: number;
        rubricEvidence: string;
      } | null;
      humanReviews: Array<{
        decision: string;
        comment: string | null;
        reviewedAt: Date;
        reviewer: {
          name: string;
          email: string;
        };
      }>;
    }>;
  }>;
};

export async function getExportOverview() {
  const tasks = await prisma.task.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: {
          samples: {
            where: {
              status: SAMPLE_STATUS.APPROVED,
            },
          },
        },
      },
    },
  });
  const jobs = await prisma.exportJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      task: {
        select: {
          name: true,
        },
      },
    },
  });

  return {
    tasks: tasks.map((task) => ({
      id: task.id,
      name: task.name,
      approvedCount: task._count.samples,
    })),
    jobs: jobs.map((job) => ({
      id: job.id,
      name: job.name,
      taskName: job.task.name,
      format: job.format,
      status: job.status,
      rowCount: job.rowCount,
      createdAt: job.createdAt.toISOString(),
    })),
  };
}

export async function previewExport(options: ExportOptions) {
  const task = await loadExportTask(options.taskId);

  if (!task) {
    throw new Error("任务不存在");
  }

  const records = buildExportRecords(task, options).slice(0, 3);
  const { content } = buildExportContent(records, options.format);

  return {
    records,
    content,
    rowCount: records.length,
  };
}

export async function createExport(options: ExportOptions) {
  const task = await loadExportTask(options.taskId);

  if (!task) {
    throw new Error("任务不存在");
  }

  const records = buildExportRecords(task, options);
  const { content, mimeType, extension } = buildExportContent(records, options.format);
  const filename = `${slugify(task.name)}-${new Date().toISOString().slice(0, 10)}.${extension}`;
  const owner = await getCurrentUser();

  await prisma.$transaction(async (tx) => {
    for (const sample of task.samples) {
      await transitionSampleStatus(sample.id, SAMPLE_STATUS.EXPORTED, tx);
    }

    await tx.exportJob.create({
      data: {
        taskId: task.id,
        createdById: owner.id,
        name: filename,
        format: normalizeExportJobFormat(options.format),
        status: "COMPLETED",
        rowCount: records.length,
        filterJson: JSON.stringify({
          sampleStatus: SAMPLE_STATUS.APPROVED,
          includeAiReview: options.includeAiReview,
          includeHumanReview: options.includeHumanReview,
          includeTaskMetadata: options.includeTaskMetadata,
        }),
        fileUrl: `local://${filename}`,
        startedAt: new Date(),
        finishedAt: new Date(),
      },
    });
  });

  await createAuditLog({
    actorId: owner.id,
    actorName: owner.name,
    action: "dataset.exported",
    entityType: "task",
    entityId: task.id,
    beforeState: {
      sampleStatus: SAMPLE_STATUS.APPROVED,
    },
    afterState: {
      sampleStatus: SAMPLE_STATUS.EXPORTED,
    },
    metadata: {
      format: options.format,
      rowCount: records.length,
      exportName: filename,
    },
  });

  return {
    filename,
    mimeType,
    content,
    rowCount: records.length,
    preview: records.slice(0, 3),
  };
}

export function buildExportRecords(task: ExportLoadedTask, options: ExportOptions): ExportRecord[] {
  const exportedAt = new Date().toISOString();

  return task.samples.filter((sample) => sample.status === SAMPLE_STATUS.APPROVED).map((sample) => {
    const annotation = sample.annotations[0] ?? null;
    const humanReview = annotation?.humanReviews[0] ?? null;

    return {
      sampleId: sample.id,
      rawData: parseJson(sample.rawData),
      annotationData: annotation ? parseJson(annotation.annotationData) : null,
      aiReview:
        options.includeAiReview && annotation?.aiReview
          ? {
              score: annotation.aiReview.score,
              riskLevel: annotation.aiReview.riskLevel,
              issues: parseJson(annotation.aiReview.issues),
              suggestion: annotation.aiReview.suggestion,
              comment: annotation.aiReview.comment,
              confidence: annotation.aiReview.confidence,
              rubricEvidence: parseJson(annotation.aiReview.rubricEvidence),
            }
          : undefined,
      humanReview:
        options.includeHumanReview && humanReview
          ? {
              decision: humanReview.decision,
              comment: humanReview.comment,
              reviewer: humanReview.reviewer,
              reviewedAt: humanReview.reviewedAt.toISOString(),
            }
          : undefined,
      taskId: task.id,
      taskName: task.name,
      taskMetadata: options.includeTaskMetadata
        ? {
            description: task.description,
            instruction: task.instruction,
            reviewRubric: parseJson(task.reviewRubric),
            formSchema: parseJson(task.formSchema),
          }
        : undefined,
      exportedAt,
    };
  });
}

export function buildExportContent(records: ExportRecord[], format: LabelHubExportFormat) {
  if (format === "JSON") {
    return {
      content: JSON.stringify({ exportedAt: new Date().toISOString(), records }, null, 2),
      mimeType: "application/json",
      extension: "json",
    };
  }

  if (format === "JSONL") {
    return {
      content: records.map((record) => JSON.stringify(record)).join("\n"),
      mimeType: "application/x-ndjson",
      extension: "jsonl",
    };
  }

  if (format === "OPENAI_JSONL") {
    return {
      content: records.map((record) => JSON.stringify(toOpenAiFineTuningRecord(record))).join("\n"),
      mimeType: "application/x-ndjson",
      extension: "openai.jsonl",
    };
  }

  return {
    content: toCsv(records),
    mimeType: "text/csv",
    extension: "csv",
  };
}

function toOpenAiFineTuningRecord(record: ExportRecord) {
  const aiReview = getObject(record.aiReview);
  const humanReview = getObject(record.humanReview);

  return {
    messages: [
      {
        role: "user",
        content: JSON.stringify(record.rawData, null, 2),
      },
      {
        role: "assistant",
        content: JSON.stringify(record.annotationData, null, 2),
      },
    ],
    metadata: {
      sampleId: record.sampleId,
      taskId: record.taskId,
      taskName: record.taskName,
      qualityScore: getQualityScore(aiReview),
      riskLevel: typeof aiReview.riskLevel === "string" ? aiReview.riskLevel : null,
      reviewStatus: typeof humanReview.decision === "string" ? humanReview.decision : null,
      exportedAt: record.exportedAt,
    },
  };
}

function toCsv(records: ExportRecord[]) {
  const headers = [
    "sampleId",
    "rawData",
    "annotationData",
    "aiReview",
    "humanReview",
    "taskId",
    "taskName",
    "taskMetadata",
    "exportedAt",
  ];
  const rows = records.map((record) => [
    record.sampleId,
    JSON.stringify(record.rawData),
    JSON.stringify(record.annotationData),
    JSON.stringify(record.aiReview ?? null),
    JSON.stringify(record.humanReview ?? null),
    record.taskId,
    record.taskName,
    JSON.stringify(record.taskMetadata ?? null),
    record.exportedAt,
  ]);

  return [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
}

function loadExportTask(taskId: string) {
  return prisma.task.findUnique({
    where: { id: taskId },
    include: {
      samples: {
        where: {
          status: SAMPLE_STATUS.APPROVED,
        },
        orderBy: { updatedAt: "desc" },
        include: {
          annotations: {
            orderBy: { updatedAt: "desc" },
            take: 1,
            include: {
              aiReview: true,
              humanReviews: {
                orderBy: { reviewedAt: "desc" },
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
          },
        },
      },
    },
  });
}

function parseJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function escapeCsv(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeExportJobFormat(format: LabelHubExportFormat): ExportFormat {
  return format as ExportFormat;
}

function getObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function getQualityScore(aiReview: Record<string, unknown>) {
  const score = Number(aiReview.score);

  if (!Number.isFinite(score)) {
    return null;
  }

  return Math.max(1, Math.min(5, Math.round(score * 5)));
}
