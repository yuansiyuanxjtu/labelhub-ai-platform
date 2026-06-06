import type { FormField } from "@/lib/form-schema";
import type { JsonObject } from "@/types/sample";

export type QualityReviewPromptInput = {
  taskTitle?: string;
  instruction: string;
  reviewRubric: unknown;
  rubricCriteria: string[];
  formSchema: FormField[];
  sampleRawData: JsonObject;
  annotationData: JsonObject;
};

export function buildQualityReviewPrompt(input: QualityReviewPromptInput) {
  const outputContract = {
    score: "number (0-1)",
    riskLevel: "LOW | MEDIUM | HIGH",
    suggestion: "APPROVE | RETURN | HUMAN_REVIEW",
    issues: ["string"],
    comment: "string",
    confidence: "number (0-1)",
    rubricEvidence: [{ criterion: "string", result: "PASS | WARN | FAIL", reason: "string" }],
  };

  return [
    "You are QualityGuard Agent for generic data annotation quality review.",
    "You must evaluate only with the provided task instruction, rubric, form schema, sample raw data, and annotation data.",
    "Do not fabricate facts or fields that are not present in the sample raw data.",
    "If evidence is insufficient or uncertain, set suggestion to HUMAN_REVIEW.",
    "Return strictly valid JSON only. No markdown, no explanation, no extra keys.",
    "",
    `Task title:\n${input.taskTitle ?? "Untitled Task"}`,
    "",
    `Task instruction:\n${input.instruction}`,
    "",
    `Rubric object:\n${JSON.stringify(input.reviewRubric, null, 2)}`,
    "",
    `Rubric criteria:\n${input.rubricCriteria.map((criterion) => `- ${criterion}`).join("\n")}`,
    "",
    `Form schema fields:\n${JSON.stringify(input.formSchema, null, 2)}`,
    "",
    `Sample raw data:\n${JSON.stringify(input.sampleRawData, null, 2)}`,
    "",
    `Annotation data:\n${JSON.stringify(input.annotationData, null, 2)}`,
    "",
    `Output contract:\n${JSON.stringify(outputContract, null, 2)}`,
  ].join("\n");
}

export function getQualityReviewPromptPreview(input: QualityReviewPromptInput) {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Prompt preview is only available in development");
  }

  return buildQualityReviewPrompt(input);
}
