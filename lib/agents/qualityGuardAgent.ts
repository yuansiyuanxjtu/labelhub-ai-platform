import type { RiskLevel } from "@prisma/client";
import { z } from "zod";
import { parseFormSchema, type FormField } from "@/lib/form-schema";
import {
  buildQualityReviewPrompt,
  getQualityReviewPromptPreview,
} from "@/lib/agents/prompts/qualityReviewPrompt";
import { parseSampleRawObject } from "@/lib/sample/formatSampleData";
import type { JsonObject } from "@/types/sample";

export type QualityGuardSuggestion = "APPROVE" | "RETURN" | "HUMAN_REVIEW";
export type RubricEvidenceResult = "PASS" | "WARN" | "FAIL";

export type QualityGuardInput = {
  taskTitle?: string;
  taskInstruction: string;
  reviewRubric: string;
  formSchema: string;
  sampleRawData: string;
  annotationData: string;
};

export type RubricEvidence = {
  criterion: string;
  result: RubricEvidenceResult;
  reason: string;
};

export type QualityGuardResult = {
  score: number;
  riskLevel: RiskLevel;
  issues: string[];
  suggestion: QualityGuardSuggestion;
  comment: string;
  confidence: number;
  rubricEvidence: RubricEvidence[];
};

export const AiReviewResultSchema = z.object({
  score: z.preprocess(normalizeScoreInput, z.number().min(0).max(1)),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]),
  issues: z.array(z.string()),
  suggestion: z.enum(["APPROVE", "RETURN", "HUMAN_REVIEW"]),
  comment: z.string(),
  confidence: z.number().min(0).max(1),
  rubricEvidence: z.array(
    z.object({
      criterion: z.string(),
      result: z.enum(["PASS", "WARN", "FAIL"]),
      reason: z.string(),
    }),
  ),
});

export type QualityGuardRunMeta = {
  provider: string;
  latencyMs: number;
  status: "ok" | "fallback";
  fallbackUsed: boolean;
  errorMessage?: string;
};

export type QualityGuardReviewContext = {
  taskTitle?: string;
  instruction: string;
  rubric: unknown;
  rubricCriteria: string[];
  formFields: FormField[];
  sample: JsonObject;
  annotation: JsonObject;
  sampleText: string;
  annotationText: string;
};

export interface QualityGuardProvider {
  name: string;
  complete(prompt: string, context: QualityGuardReviewContext): Promise<string>;
}

export class MockProvider implements QualityGuardProvider {
  name = "mock";

  async complete(_prompt: string, context: QualityGuardReviewContext): Promise<string> {
    return JSON.stringify(fallbackToRuleBasedReview(context), null, 2);
  }
}

export class OpenAIProvider implements QualityGuardProvider {
  name = "openai";

  async complete(): Promise<string> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    throw new Error("OpenAIProvider is a placeholder. Set AI_PROVIDER=mock for local demo.");
  }
}

export function createQualityGuardAgent(provider = createQualityGuardProvider()) {
  async function reviewWithMeta(input: QualityGuardInput) {
    const context = buildReviewContext(input);
    const prompt = buildRubricPrompt(context);
    const startedAt = Date.now();

    try {
      const output = await runLLMReview(provider, prompt, context);
      const parsed = parseStructuredOutput(output);
      const result = validateAiReviewResult(parsed);

      return {
        result,
        meta: {
          provider: provider.name,
          latencyMs: Date.now() - startedAt,
          status: "ok" as const,
          fallbackUsed: false,
        },
      };
    } catch (error) {
      const result = fallbackToRuleBasedReview(context);

      return {
        result,
        meta: {
          provider: "fallback",
          latencyMs: Date.now() - startedAt,
          status: "fallback" as const,
          fallbackUsed: true,
          errorMessage: error instanceof Error ? error.message : "unknown error",
        },
      };
    }
  }

  return {
    name: "QualityGuard Agent",
    reviewWithMeta,
    review: async (input: QualityGuardInput) => (await reviewWithMeta(input)).result,
  };
}

export function buildReviewContext(input: QualityGuardInput): QualityGuardReviewContext {
  const formSchema = parseFormSchema(input.formSchema);
  const sample = parseSampleRawObject(input.sampleRawData);
  const annotation = parseJsonObject(input.annotationData);
  const rubric = parseJson(input.reviewRubric);

  return {
    taskTitle: input.taskTitle,
    instruction: input.taskInstruction,
    rubric,
    rubricCriteria: extractRubricCriteria(rubric, input.reviewRubric),
    formFields: formSchema.fields,
    sample,
    annotation,
    sampleText: flattenToText(sample),
    annotationText: flattenToText(annotation),
  };
}

export function buildRubricPrompt(context: QualityGuardReviewContext) {
  return buildQualityReviewPrompt({
    taskTitle: context.taskTitle,
    instruction: context.instruction,
    reviewRubric: context.rubric,
    rubricCriteria: context.rubricCriteria,
    formSchema: context.formFields,
    sampleRawData: context.sample,
    annotationData: context.annotation,
  });
}

export function previewRubricPrompt(context: QualityGuardReviewContext) {
  return getQualityReviewPromptPreview({
    taskTitle: context.taskTitle,
    instruction: context.instruction,
    reviewRubric: context.rubric,
    rubricCriteria: context.rubricCriteria,
    formSchema: context.formFields,
    sampleRawData: context.sample,
    annotationData: context.annotation,
  });
}

export async function runLLMReview(
  provider: QualityGuardProvider,
  prompt: string,
  context: QualityGuardReviewContext,
) {
  return provider.complete(prompt, context);
}

export function parseStructuredOutput(output: string) {
  const jsonText = output
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(jsonText) as unknown;
  } catch {
    const repaired = tryRepairJson(jsonText);

    if (!repaired) {
      throw new Error("Provider returned non-JSON output");
    }

    return JSON.parse(repaired) as unknown;
  }
}

export function validateAiReviewResult(result: unknown): QualityGuardResult {
  const parsed = AiReviewResultSchema.parse(result);

  return {
    score: round(parsed.score),
    riskLevel: parsed.riskLevel,
    issues: parsed.issues.map(String).filter(Boolean),
    suggestion: parsed.suggestion,
    comment: String(parsed.comment ?? ""),
    confidence: round(parsed.confidence),
    rubricEvidence: normalizeRubricEvidence(parsed.rubricEvidence),
  };
}

export function fallbackToRuleBasedReview(context: QualityGuardReviewContext): QualityGuardResult {
  const evidence: RubricEvidence[] = [];
  const issues: string[] = [];
  let score = 0.94;

  if (Object.keys(context.annotation).length === 0) {
    issues.push("annotationData 为空，无法完成 AI 预审。");
    score -= 0.5;
    evidence.push({
      criterion: "Annotation presence",
      result: "FAIL",
      reason: "未检测到任何人工标注字段。",
    });
  } else {
    evidence.push({
      criterion: "Annotation presence",
      result: "PASS",
      reason: "检测到人工标注结果。",
    });
  }

  const requiredMissing = context.formFields.filter((field) => {
    if (!field.required) return false;
    const value = context.annotation[field.id];
    return value === undefined || value === "" || (Array.isArray(value) && value.length === 0);
  });

  if (requiredMissing.length > 0) {
    const names = requiredMissing.map((field) => field.label || field.id).join(", ");
    issues.push(`必填字段缺失：${names}`);
    score -= 0.3;
    evidence.push({
      criterion: "Required field completeness",
      result: "FAIL",
      reason: `缺失 ${requiredMissing.length} 个必填字段。`,
    });
  } else {
    evidence.push({
      criterion: "Required field completeness",
      result: "PASS",
      reason: "所有必填字段均已填写。",
    });
  }

  const typeMismatches = findTypeMismatches(context);
  if (typeMismatches.length > 0) {
    issues.push(`标注字段类型与 formSchema 不匹配：${typeMismatches.join(", ")}`);
    score -= 0.35;
    evidence.push({
      criterion: "Schema type alignment",
      result: "FAIL",
      reason: "部分 annotationData 字段的值类型与动态表单字段类型不一致。",
    });
  } else {
    evidence.push({
      criterion: "Schema type alignment",
      result: "PASS",
      reason: "annotationData 与 formSchema 字段类型匹配。",
    });
  }

  const lowScoreFields = findLowScoreFields(context);
  if (lowScoreFields.length > 0) {
    issues.push(`评分字段存在低分：${lowScoreFields.join(", ")}`);
    score -= Math.min(0.28, lowScoreFields.length * 0.1);
    evidence.push({
      criterion: "Rating field quality signals",
      result: lowScoreFields.length > 2 ? "FAIL" : "WARN",
      reason: "基于 formSchema 中的 rating 字段动态检测到低评分。",
    });
  } else {
    evidence.push({
      criterion: "Rating field quality signals",
      result: "PASS",
      reason: "未发现 rating 字段低分。",
    });
  }

  const shortTextareaFields = findShortTextareaFields(context);
  if (shortTextareaFields.length > 0) {
    issues.push(`文本理由过短：${shortTextareaFields.join(", ")}`);
    score -= 0.12;
    evidence.push({
      criterion: "Textarea explanation depth",
      result: "WARN",
      reason: "基于 formSchema 中的 textarea 字段动态检测到说明内容过短。",
    });
  } else {
    evidence.push({
      criterion: "Textarea explanation depth",
      result: "PASS",
      reason: "textarea 字段说明长度满足基础质检要求，或任务未配置 textarea 字段。",
    });
  }

  const riskHits = findRiskKeywords(`${context.sampleText}\n${context.annotationText}`);
  if (riskHits.length > 0) {
    issues.push(`样本或标注中出现风险关键词：${riskHits.join(", ")}`);
    score -= Math.min(0.35, riskHits.length * 0.08);
    evidence.push({
      criterion: "Risk keyword scan",
      result: riskHits.length > 2 ? "FAIL" : "WARN",
      reason: "检测到可能涉及违规、敏感信息、安全或承诺类风险的关键词。",
    });
  } else {
    evidence.push({
      criterion: "Risk keyword scan",
      result: "PASS",
      reason: "未命中通用风险关键词。",
    });
  }

  for (const criterion of context.rubricCriteria.slice(0, 4)) {
    evidence.push({
      criterion,
      result: issues.length > 0 ? "WARN" : "PASS",
      reason:
        issues.length > 0
          ? "根据规则扫描结果，该标准需要人工复核。"
          : "规则扫描未发现该标准下的明显异常。",
    });
  }

  const normalizedScore = round(clamp(score, 0, 1));
  const riskLevel = getRiskLevel(normalizedScore, evidence);
  const suggestion = getSuggestion(riskLevel, normalizedScore);

  return {
    score: normalizedScore,
    riskLevel,
    issues,
    suggestion,
    comment:
      issues.length > 0
        ? `QualityGuard Agent 基于 rubric 发现 ${issues.length} 类风险，建议 ${suggestion}。`
        : "QualityGuard Agent 基于 rubric 未发现明显问题，可以进入后续审核或导出流程。",
    confidence: riskLevel === "LOW" ? 0.86 : riskLevel === "MEDIUM" ? 0.74 : 0.66,
    rubricEvidence: evidence,
  };
}

function createQualityGuardProvider(): QualityGuardProvider {
  if (process.env.AI_PROVIDER === "openai" || process.env.QUALITY_GUARD_PROVIDER === "openai") {
    return new OpenAIProvider();
  }

  return new MockProvider();
}

function extractRubricCriteria(rubric: unknown, rawRubric: string) {
  if (rubric && typeof rubric === "object" && !Array.isArray(rubric)) {
    const rawRules = (rubric as { rules?: unknown }).rules;

    if (Array.isArray(rawRules)) {
      return rawRules.map(String).filter(Boolean);
    }
  }

  return rawRubric
    .split(/\n|。|；|;|\d+\./)
    .map((item) => item.trim())
    .filter(Boolean);
}

function findLowScoreFields(context: QualityGuardReviewContext) {
  return context.formFields
    .filter((field) => field.type === "rating")
    .filter((field) => {
      const value = context.annotation[field.id];
      if (typeof value !== "number") return false;

      const min = field.min ?? field.validation?.min ?? 1;
      const max = field.max ?? field.validation?.max ?? 5;
      const threshold = min + (max - min) * 0.4;

      return value <= threshold;
    })
    .map((field) => field.label || field.id);
}

function findShortTextareaFields(context: QualityGuardReviewContext) {
  return context.formFields
    .filter((field) => field.type === "textarea")
    .filter((field) => {
      const value = context.annotation[field.id];
      if (value === undefined || value === "") return false;
      if (typeof value !== "string") return true;

      const minLength = field.validation?.minLength ?? 12;
      return value.trim().length > 0 && value.trim().length < minLength;
    })
    .map((field) => field.label || field.id);
}

function findTypeMismatches(context: QualityGuardReviewContext) {
  return context.formFields
    .filter((field) => context.annotation[field.id] !== undefined)
    .filter((field) => !matchesFieldType(field, context.annotation[field.id]))
    .map((field) => field.label || field.id);
}

function matchesFieldType(field: FormField, value: unknown) {
  if (value === null || value === undefined) return true;

  if (field.type === "checkbox") {
    return Array.isArray(value);
  }

  if (field.type === "rating") {
    return typeof value === "number";
  }

  if (field.type === "boolean") {
    return typeof value === "boolean";
  }

  return typeof value === "string";
}

function findRiskKeywords(text: string) {
  const keywords = [
    "guarantee",
    "guaranteed",
    "bypass",
    "password",
    "secret",
    "private key",
    "token",
    "illegal",
    "policy violation",
    "承诺",
    "保证",
    "绕过",
    "密码",
    "验证码",
    "密钥",
    "违法",
    "违规",
    "敏感",
    "全额赔付",
  ];
  const normalizedText = text.toLowerCase();

  return keywords.filter((keyword) => normalizedText.includes(keyword.toLowerCase()));
}

function getRiskLevel(score: number, evidence: RubricEvidence[]): RiskLevel {
  const failCount = evidence.filter((item) => item.result === "FAIL").length;
  const warnCount = evidence.filter((item) => item.result === "WARN").length;

  if (score < 0.55 || failCount > 0) {
    return "HIGH";
  }

  if (score < 0.8 || warnCount > 0) {
    return "MEDIUM";
  }

  return "LOW";
}

function getSuggestion(riskLevel: RiskLevel, score: number): QualityGuardSuggestion {
  if (riskLevel === "HIGH") {
    return "RETURN";
  }

  if (riskLevel === "MEDIUM" || score < 0.88) {
    return "HUMAN_REVIEW";
  }

  return "APPROVE";
}

function normalizeRubricEvidence(value: unknown): RubricEvidence[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const raw = item as Partial<RubricEvidence>;
      const result = isEvidenceResult(raw.result) ? raw.result : "WARN";

      return {
        criterion: String(raw.criterion ?? "Unnamed criterion"),
        result,
        reason: String(raw.reason ?? ""),
      };
    })
    .filter((item) => item.criterion.trim());
}

function parseJsonObject(value: string) {
  const parsed = parseJson(value);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? (parsed as JsonObject)
    : {};
}

function parseJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function flattenToText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) return value.map(flattenToText).join(" ");
  if (typeof value === "object") return Object.values(value).map(flattenToText).join(" ");
  return "";
}

function isEvidenceResult(value: unknown): value is RubricEvidenceResult {
  return value === "PASS" || value === "WARN" || value === "FAIL";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function normalizeScoreInput(value: unknown) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return value;
  }

  if (numeric > 1) {
    return clamp(numeric / 100, 0, 1);
  }

  return clamp(numeric, 0, 1);
}

function tryRepairJson(raw: string) {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return "";
  }

  const candidate = raw.slice(start, end + 1);
  return candidate.replace(/'/g, '"');
}
