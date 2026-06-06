import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildExportContent,
  buildExportRecords,
  type ExportLoadedTask,
  type ExportOptions,
} from "@/lib/export/exportService";
import { SAMPLE_STATUS } from "@/lib/workflow/statusMachine";

const options: ExportOptions = {
  taskId: "task_1",
  format: "JSON",
  includeAiReview: true,
  includeHumanReview: true,
  includeTaskMetadata: true,
};

const task: ExportLoadedTask = {
  id: "task_1",
  name: "Demo Task",
  description: "Export test task",
  instruction: "Review samples.",
  reviewRubric: JSON.stringify({ rules: ["Quality"] }),
  formSchema: JSON.stringify({ fields: [] }),
  samples: [
    {
      id: "approved_sample",
      rawData: JSON.stringify({ input: "approved" }),
      status: SAMPLE_STATUS.APPROVED,
      annotations: [
        {
          annotationData: JSON.stringify({ score: 5 }),
          aiReview: {
            score: 0.96,
            riskLevel: "LOW",
            issues: JSON.stringify([]),
            suggestion: "APPROVE",
            comment: "Looks good",
            confidence: 0.88,
            rubricEvidence: JSON.stringify([
              { criterion: "Quality", result: "PASS", reason: "Complete" },
            ]),
          },
          humanReviews: [
            {
              decision: "APPROVED",
              comment: "Approved",
              reviewedAt: new Date("2026-05-21T00:00:00.000Z"),
              reviewer: {
                name: "Reviewer",
                email: "reviewer@example.com",
              },
            },
          ],
        },
      ],
    },
    {
      id: "submitted_sample",
      rawData: JSON.stringify({ input: "submitted" }),
      status: SAMPLE_STATUS.SUBMITTED,
      annotations: [
        {
          annotationData: JSON.stringify({ score: 3 }),
          aiReview: null,
          humanReviews: [],
        },
      ],
    },
  ],
};

describe("export service", () => {
  it("builds records only from approved samples", () => {
    const records = buildExportRecords(task, options);

    assert.equal(records.length, 1);
    assert.equal(records[0]?.sampleId, "approved_sample");
    assert.deepEqual(records[0]?.rawData, { input: "approved" });
  });

  it("exports JSON content", () => {
    const records = buildExportRecords(task, options);
    const result = buildExportContent(records, "JSON");
    const parsed = JSON.parse(result.content) as { records: unknown[] };

    assert.equal(result.mimeType, "application/json");
    assert.equal(result.extension, "json");
    assert.equal(parsed.records.length, 1);
  });

  it("exports CSV content", () => {
    const records = buildExportRecords(task, options);
    const result = buildExportContent(records, "CSV");

    assert.equal(result.mimeType, "text/csv");
    assert.equal(result.extension, "csv");
    assert.ok(result.content.startsWith('"sampleId","rawData","annotationData"'));
    assert.ok(result.content.includes('"approved_sample"'));
    assert.equal(result.content.includes("submitted_sample"), false);
  });

  it("exports JSONL content", () => {
    const records = buildExportRecords(task, options);
    const result = buildExportContent(records, "JSONL");
    const lines = result.content.split("\n");
    const parsed = JSON.parse(lines[0] ?? "{}") as { sampleId?: string };

    assert.equal(result.mimeType, "application/x-ndjson");
    assert.equal(result.extension, "jsonl");
    assert.equal(lines.length, 1);
    assert.equal(parsed.sampleId, "approved_sample");
  });
});
