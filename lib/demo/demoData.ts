import type { PrismaClient, SampleStatus } from "@prisma/client";
import { createAuditLog } from "@/lib/services/auditLogService";

const stringify = (value: unknown) => JSON.stringify(value, null, 2);

type DemoPrisma = PrismaClient;

type DemoSample = {
  externalId: string;
  rawData: Record<string, unknown>;
  annotationData: Record<string, unknown>;
  sampleStatus: SampleStatus;
  aiRisk?: "LOW" | "MEDIUM" | "HIGH";
  humanDecision?: "APPROVED" | "RETURNED" | "ESCALATED";
};

type DemoTemplate = {
  name: string;
  description: string;
  instruction: string;
  reviewRubric: Record<string, unknown>;
  formSchema: Record<string, unknown>;
  samples: DemoSample[];
};

export async function resetDemoData(prisma: DemoPrisma) {
  await prisma.exportJob.deleteMany();
  await prisma.humanReview.deleteMany();
  await prisma.aiReview.deleteMany();
  await prisma.annotation.deleteMany();
  await prisma.sample.deleteMany();
  await prisma.task.updateMany({
    data: {
      currentFormSchemaVersionId: null,
    },
  });
  await prisma.formSchemaVersion.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();

  const [owner, annotatorA, annotatorB, reviewer] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Nora Chen",
        email: "owner@labelhub.local",
        role: "OWNER",
      },
    }),
    prisma.user.create({
      data: {
        name: "Alex Lin",
        email: "annotator.a@labelhub.local",
        role: "ANNOTATOR",
      },
    }),
    prisma.user.create({
      data: {
        name: "Mia Zhang",
        email: "annotator.b@labelhub.local",
        role: "ANNOTATOR",
      },
    }),
    prisma.user.create({
      data: {
        name: "Rui Wang",
        email: "reviewer@labelhub.local",
        role: "REVIEWER",
      },
    }),
  ]);

  const project = await prisma.project.create({
    data: {
      name: "LabelHub Demo 数据生产项目",
      description: "比赛演示用数据，覆盖标注、AI 预审、人工审核和导出链路。",
      ownerId: owner.id,
    },
  });

  const createdTasks = [];
  const templates = getDemoTemplates();

  for (const template of templates) {
    const task = await prisma.task.create({
      data: {
        projectId: project.id,
        ownerId: owner.id,
        name: template.name,
        description: template.description,
        type: "QA_QUALITY",
        status: "HUMAN_REVIEWING",
        instruction: template.instruction,
        reviewRubric: stringify(template.reviewRubric),
        formSchema: stringify(template.formSchema),
      },
    });
    const initialSchemaVersion = await prisma.formSchemaVersion.create({
      data: {
        taskId: task.id,
        version: 1,
        schema: task.formSchema,
        createdById: owner.id,
        changeNote: "Demo initial schema",
      },
    });
    await prisma.task.update({
      where: { id: task.id },
      data: {
        currentFormSchemaVersionId: initialSchemaVersion.id,
      },
    });

    createdTasks.push(task);

    for (const [index, sample] of template.samples.entries()) {
      const assignee = index % 2 === 0 ? annotatorA : annotatorB;
      const createdSample = await prisma.sample.create({
        data: {
          taskId: task.id,
          externalId: sample.externalId,
          rawData: stringify(sample.rawData),
          status: sample.sampleStatus,
          assignedToId: assignee.id,
        },
      });

      await createAuditLog({
        actorId: owner.id,
        actorName: owner.name,
        action: "sample.assigned",
        entityType: "sample",
        entityId: createdSample.id,
        beforeState: {
          status: "PENDING",
          assignedToId: null,
        },
        afterState: {
          status: sample.sampleStatus,
          assignedToId: assignee.id,
        },
        metadata: {
          taskId: task.id,
          sampleExternalId: sample.externalId,
        },
      });

      if (sample.sampleStatus === "ASSIGNED" || sample.sampleStatus === "IN_PROGRESS") {
        continue;
      }

      const annotationStatus = getAnnotationStatus(sample);
      const annotation = await prisma.annotation.create({
        data: {
          taskId: task.id,
          sampleId: createdSample.id,
          annotatorId: assignee.id,
          formSchemaVersionId: initialSchemaVersion.id,
          annotationData: stringify(sample.annotationData),
          status: annotationStatus,
          submittedAt: new Date(),
        },
      });

      if (sample.aiRisk) {
        await prisma.aiReview.create({
          data: {
            annotationId: annotation.id,
            score: sample.aiRisk === "LOW" ? 0.92 : sample.aiRisk === "MEDIUM" ? 0.72 : 0.42,
            riskLevel: sample.aiRisk,
            issues: stringify(getAiIssues(sample.aiRisk)),
            suggestion:
              sample.aiRisk === "LOW"
                ? "APPROVE"
                : sample.aiRisk === "MEDIUM"
                  ? "HUMAN_REVIEW"
                  : "RETURN",
            comment: `Demo QualityGuard 预审：${sample.aiRisk} risk。`,
            confidence: sample.aiRisk === "LOW" ? 0.88 : sample.aiRisk === "MEDIUM" ? 0.74 : 0.66,
            rubricEvidence: stringify([
              {
                criterion: "Rubric alignment",
                result: sample.aiRisk === "HIGH" ? "FAIL" : sample.aiRisk === "MEDIUM" ? "WARN" : "PASS",
                reason: "基于动态表单字段、标注完整性和风险关键词生成的 demo 证据。",
              },
            ]),
          },
        });
      }

      if (sample.humanDecision) {
        await prisma.humanReview.create({
          data: {
            annotationId: annotation.id,
            reviewerId: reviewer.id,
            decision: sample.humanDecision,
            comment: `Demo 人工审核：${sample.humanDecision}`,
          },
        });
      }
    }
  }

  await prisma.exportJob.create({
    data: {
      taskId: createdTasks[0].id,
      createdById: reviewer.id,
      name: "demo-approved-samples.jsonl",
      format: "JSONL",
      status: "COMPLETED",
      rowCount: 2,
      filterJson: stringify({ sampleStatus: "APPROVED" }),
      fileUrl: "local://demo-approved-samples.jsonl",
      startedAt: new Date(),
      finishedAt: new Date(),
    },
  });

  return {
    projectId: project.id,
    taskIds: createdTasks.map((task) => task.id),
    taskCount: createdTasks.length,
    sampleCount: templates.reduce((sum, template) => sum + template.samples.length, 0),
  };
}

function getAnnotationStatus(sample: DemoSample) {
  if (sample.humanDecision) return sample.humanDecision;
  if (sample.sampleStatus === "AI_REVIEWED") return "AI_REVIEWED";
  if (sample.sampleStatus === "HUMAN_REVIEWING") return "NEEDS_HUMAN_REVIEW";
  return "SUBMITTED";
}

function getAiIssues(risk: "LOW" | "MEDIUM" | "HIGH") {
  if (risk === "HIGH") return ["关键规则未满足", "建议退回重标"];
  if (risk === "MEDIUM") return ["存在边界情况", "建议人工复核"];
  return [];
}

function getDemoTemplates(): DemoTemplate[] {
  return [
    buildCustomerQaTemplate(),
    buildRagTemplate(),
    buildAgentTraceTemplate(),
  ];
}

function baseFormSchema() {
  return {
    fields: [
      {
        id: "quality_score",
        label: "质量评分",
        type: "rating",
        required: true,
        min: 1,
        max: 5,
        helpText: "根据任务说明综合评分。",
      },
      {
        id: "risk_level",
        label: "风险等级",
        type: "select",
        required: true,
        options: ["LOW", "MEDIUM", "HIGH"],
      },
      {
        id: "is_acceptable",
        label: "是否可通过",
        type: "boolean",
        required: true,
      },
      {
        id: "review_notes",
        label: "审核说明",
        type: "textarea",
        required: false,
        validation: {
          minLength: 8,
        },
      },
    ],
  };
}

function buildCustomerQaTemplate(): DemoTemplate {
  return {
    name: "客服问答质量评估",
    description: "评估客服回答是否准确、完整、合规且可执行。",
    instruction: "阅读用户问题、模型回答和参考答案，判断回答质量并填写动态表单。",
    reviewRubric: {
      rules: ["回答应直接回应用户问题", "不得承诺无法保证的结果", "应给出清晰下一步"],
    },
    formSchema: baseFormSchema(),
    samples: Array.from({ length: 10 }, (_, index) => {
      const n = index + 1;
      return buildSample(`CS-${String(n).padStart(3, "0")}`, {
        customer_message: `用户咨询 ${n}: 账户或订单遇到问题，希望获得处理建议。`,
        assistant_answer:
          n % 5 === 0
            ? "可以保证马上解决，直接按我说的操作即可。"
            : "建议先通过官方入口查看状态，如仍异常请提交工单并保留截图。",
        reference_answer: "说明处理路径、风险边界和官方入口，不做超范围承诺。",
        channel: n % 2 === 0 ? "app" : "web_chat",
      }, n);
    }),
  };
}

function buildRagTemplate(): DemoTemplate {
  return {
    name: "RAG 回答事实性评估",
    description: "评估 RAG 回答是否忠于检索证据，是否存在遗漏或幻觉。",
    instruction: "对照 query、retrieved_context 和 generated_answer，判断事实一致性和引用充分性。",
    reviewRubric: {
      rules: ["回答必须由检索片段支持", "不能编造片段中不存在的事实", "应指出证据不足的情况"],
    },
    formSchema: baseFormSchema(),
    samples: Array.from({ length: 10 }, (_, index) => {
      const n = index + 1;
      return buildSample(`RAG-${String(n).padStart(3, "0")}`, {
        query: `知识库问题 ${n}: 产品策略如何适用于当前场景？`,
        retrieved_context: [
          { title: "Policy A", text: "仅当证据完整时才可给出确定结论。", score: 0.86 },
          { title: "FAQ B", text: "证据不足时应提示需要人工确认。", score: 0.78 },
        ],
        generated_answer:
          n % 4 === 0
            ? "该策略一定适用，并且已有明确审批记录。"
            : "根据已检索证据，策略可能适用，但仍需要人工确认关键条件。",
      }, n);
    }),
  };
}

function buildAgentTraceTemplate(): DemoTemplate {
  return {
    name: "Agent 工具调用轨迹评估",
    description: "评估 Agent 是否正确选择工具、遵守边界并完成任务。",
    instruction: "查看目标、工具调用步骤和最终回答，判断工具选择、执行顺序和结果是否可靠。",
    reviewRubric: {
      rules: ["工具调用应与用户目标相关", "不得跳过必要确认", "最终回答应反映工具输出"],
    },
    formSchema: baseFormSchema(),
    samples: Array.from({ length: 10 }, (_, index) => {
      const n = index + 1;
      return buildSample(`TRACE-${String(n).padStart(3, "0")}`, {
        goal: `完成自动化任务 ${n}`,
        trace: [
          { step: 1, tool: "search", input: "查找相关记录", output: "找到 3 条候选记录" },
          { step: 2, tool: n % 5 === 0 ? "unsafe_action" : "summarize", input: "处理候选记录", output: "生成摘要" },
        ],
        final_response:
          n % 5 === 0
            ? "已绕过确认并完成操作。"
            : "已根据工具输出生成摘要，并提示用户确认后继续。",
      }, n);
    }),
  };
}

function buildSample(externalId: string, rawData: Record<string, unknown>, n: number): DemoSample {
  const statusByIndex: SampleStatus[] = [
    "ASSIGNED",
    "IN_PROGRESS",
    "SUBMITTED",
    "AI_REVIEWED",
    "HUMAN_REVIEWING",
    "APPROVED",
    "APPROVED",
    "RETURNED",
    "ESCALATED",
    "AI_REVIEWED",
  ];
  const status = statusByIndex[(n - 1) % statusByIndex.length];
  const risk = n % 5 === 0 ? "HIGH" : n % 3 === 0 ? "MEDIUM" : "LOW";

  return {
    externalId,
    rawData,
    sampleStatus: status,
    aiRisk:
      status === "AI_REVIEWED" ||
      status === "HUMAN_REVIEWING" ||
      status === "APPROVED" ||
      status === "RETURNED" ||
      status === "ESCALATED"
        ? risk
        : undefined,
    humanDecision:
      status === "APPROVED"
        ? "APPROVED"
        : status === "RETURNED"
          ? "RETURNED"
          : status === "ESCALATED"
            ? "ESCALATED"
            : undefined,
    annotationData: {
      quality_score: risk === "HIGH" ? 2 : risk === "MEDIUM" ? 3 : 5,
      risk_level: risk,
      is_acceptable: risk !== "HIGH",
      review_notes:
        risk === "HIGH"
          ? "存在明显风险，需要退回重标。"
          : risk === "MEDIUM"
            ? "存在边界问题，建议人工复核。"
            : "质量良好，可进入后续流程。",
    },
  };
}
