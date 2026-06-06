import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateAnnotationValue } from "@/lib/annotation-validation";
import { validateFormSchemaString } from "@/lib/form-schema";
import type { FormSchema } from "@/types/formSchema";

const schema: FormSchema = {
  fields: [
    {
      id: "quality",
      label: "Quality",
      type: "radio",
      required: true,
      options: ["good", "bad"],
    },
    {
      id: "tags",
      label: "Tags",
      type: "checkbox",
      required: true,
      options: ["safe", "complete"],
    },
    {
      id: "score",
      label: "Score",
      type: "rating",
      required: true,
      min: 1,
      max: 5,
    },
    {
      id: "comment",
      label: "Comment",
      type: "textarea",
      required: true,
      validation: {
        minLength: 8,
      },
    },
    {
      id: "approved",
      label: "Approved",
      type: "boolean",
      required: false,
    },
  ],
};

const schemaText = JSON.stringify(schema);

describe("form schema validation", () => {
  it("validates required fields", () => {
    const errors = validateAnnotationValue(schemaText, {});

    assert.equal(errors.quality, "该字段必填");
    assert.equal(errors.tags, "该字段必填");
    assert.equal(errors.score, "该字段必填");
    assert.equal(errors.comment, "该字段必填");
  });

  it("validates field values by schema type", () => {
    const errors = validateAnnotationValue(schemaText, {
      quality: "unknown",
      tags: ["safe", "invalid"],
      score: 6,
      comment: "short",
      approved: true,
    });

    assert.equal(errors.quality, "请选择有效选项");
    assert.equal(errors.tags, "请选择有效选项");
    assert.equal(errors.score, "请输入 1-5 范围内的评分");
    assert.equal(errors.comment, "至少输入 8 个字符");
    assert.equal(errors.approved, undefined);
  });

  it("accepts valid annotation values", () => {
    const errors = validateAnnotationValue(schemaText, {
      quality: "good",
      tags: ["safe"],
      score: 5,
      comment: "looks good",
      approved: false,
    });

    assert.deepEqual(errors, {});
  });

  it("detects invalid schema definitions", () => {
    assert.match(validateFormSchemaString(""), /请输入默认表单 schema/);
    assert.match(validateFormSchemaString("{bad json"), /合法 JSON/);
    assert.match(validateFormSchemaString(JSON.stringify({ fields: [] })), /非空 fields/);
    assert.match(
      validateFormSchemaString(
        JSON.stringify({
          fields: [
            { id: "dup", label: "A", type: "text" },
            { id: "dup", label: "B", type: "text" },
          ],
        }),
      ),
      /字段 id 重复/,
    );
  });
});
