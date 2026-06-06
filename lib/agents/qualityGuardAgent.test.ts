import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AiReviewResultSchema,
  createQualityGuardAgent,
  MockProvider,
  parseStructuredOutput,
  validateAiReviewResult,
} from "@/lib/agents/qualityGuardAgent";
import type { FormSchema } from "@/types/formSchema";

const formSchema: FormSchema = {
  fields: [
    {
      id: "qualityScore",
      label: "Quality score",
      type: "rating",
      required: true,
      min: 1,
      max: 5,
    },
    {
      id: "reviewNote",
      label: "Review note",
      type: "textarea",
      required: true,
      validation: {
        minLength: 12,
      },
    },
    {
      id: "riskTypes",
      label: "Risk types",
      type: "checkbox",
      required: false,
      options: ["missing_context", "unsafe_claim"],
    },
  ],
};

function buildInput(annotationData: Record<string, unknown>) {
  return {
    taskInstruction: "Evaluate the annotation quality against the sample and rubric.",
    reviewRubric: JSON.stringify({
      rules: ["Completeness", "Schema alignment", "Risk awareness"],
    }),
    formSchema: JSON.stringify(formSchema),
    sampleRawData: JSON.stringify({
      prompt: "Assess whether the answer is grounded in the provided context.",
      answer: "This answer may guarantee a result without enough evidence.",
    }),
    annotationData: JSON.stringify(annotationData),
  };
}

describe("QualityGuard Agent", () => {
  it("returns valid structured output from the mock provider", async () => {
    const agent = createQualityGuardAgent(new MockProvider());
    const result = await agent.review(
      buildInput({
        qualityScore: 5,
        reviewNote: "The annotation is complete and aligned with the sample.",
        riskTypes: [],
      }),
    );

    assert.doesNotThrow(() => validateAiReviewResult(result));
    assert.match(result.riskLevel, /LOW|MEDIUM|HIGH/);
    assert.ok(result.rubricEvidence.length > 0);
    assert.ok(result.confidence >= 0 && result.confidence <= 1);
  });

  it("flags low quality annotations as medium or high risk", async () => {
    const agent = createQualityGuardAgent(new MockProvider());
    const result = await agent.review(
      buildInput({
        qualityScore: 1,
        reviewNote: "too short",
        riskTypes: ["unsafe_claim"],
      }),
    );

    assert.ok(result.riskLevel === "MEDIUM" || result.riskLevel === "HIGH");
    assert.ok(result.issues.some((issue) => issue.includes("评分字段存在低分")));
    assert.ok(result.issues.some((issue) => issue.includes("文本理由过短")));
  });

  it("flags empty required annotation explanation as an issue", async () => {
    const agent = createQualityGuardAgent(new MockProvider());
    const result = await agent.review(
      buildInput({
        qualityScore: 4,
        reviewNote: "",
      }),
    );

    assert.equal(result.riskLevel, "HIGH");
    assert.ok(result.issues.some((issue) => issue.includes("必填字段缺失")));
    assert.equal(result.suggestion, "RETURN");
  });

  it("flags schema type mismatches as high risk", async () => {
    const agent = createQualityGuardAgent(new MockProvider());
    const result = await agent.review(
      buildInput({
        qualityScore: "5",
        reviewNote: "This annotation has a type mismatch in rating.",
        riskTypes: "unsafe_claim",
      }),
    );

    assert.equal(result.riskLevel, "HIGH");
    assert.ok(result.issues.some((issue) => issue.includes("formSchema 不匹配")));
  });

  it("normalizes score in 0-100 range to 0-1", () => {
    const parsed = AiReviewResultSchema.parse({
      score: 87,
      riskLevel: "LOW",
      suggestion: "APPROVE",
      issues: [],
      comment: "ok",
      confidence: 0.9,
      rubricEvidence: [],
    });

    assert.equal(parsed.score, 0.87);
  });

  it("repairs JSON wrapped with extra text", () => {
    const parsed = parseStructuredOutput(
      "Here is result:\n```json\n{'score':0.8,'riskLevel':'LOW','issues':[],'suggestion':'APPROVE','comment':'ok','confidence':0.8,'rubricEvidence':[]}\n```",
    );

    const result = validateAiReviewResult(parsed);
    assert.equal(result.riskLevel, "LOW");
    assert.equal(result.score, 0.8);
  });

  it("falls back when provider fails", async () => {
    const agent = createQualityGuardAgent({
      name: "broken",
      async complete() {
        throw new Error("provider down");
      },
    });

    const reviewed = await agent.reviewWithMeta(
      buildInput({
        qualityScore: 4,
        reviewNote: "The answer still has risk and lacks details.",
      }),
    );

    assert.equal(reviewed.meta.fallbackUsed, true);
    assert.equal(reviewed.meta.provider, "fallback");
    assert.match(reviewed.meta.errorMessage ?? "", /provider down/);
    assert.ok(reviewed.result.rubricEvidence.length > 0);
  });
});
