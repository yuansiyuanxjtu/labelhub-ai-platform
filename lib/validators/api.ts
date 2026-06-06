import { z } from "zod";
import { exportFormats } from "@/lib/export/exportService";

const formPrimitiveValueSchema: z.ZodType<string | string[] | number | boolean | undefined> = z.union(
  [z.string(), z.array(z.string()), z.number(), z.boolean(), z.undefined()],
);

export const createTaskInput = z.object({
  name: z.string().trim().min(1, "任务名称不能为空").max(120, "任务名称过长"),
  description: z.string().trim().max(2000, "任务描述过长").default(""),
  instruction: z.string().trim().min(1, "标注说明不能为空").max(20000, "标注说明过长"),
  reviewRubric: z.string().trim().min(1, "AI 预审标准不能为空").max(20000, "AI 预审标准过长"),
  formSchema: z.string().trim().min(1, "默认表单 schema 不能为空"),
});

export const updateFormSchemaInput = z.object({
  formSchema: z.string().trim().min(1, "formSchema 不能为空"),
});

export const submitAnnotationInput = z.object({
  annotationData: z.record(formPrimitiveValueSchema).default({}),
  action: z.enum(["draft", "submit"]).default("draft"),
});

export const runAiReviewInput = z
  .object({
    force: z.boolean().optional(),
  })
  .default({});

export const submitHumanReviewInput = z.object({
  decision: z.enum(["APPROVED", "RETURNED", "ESCALATED"]),
  comment: z.string().max(5000, "审核备注过长").optional(),
});

export const exportDatasetInput = z.object({
  taskId: z.string().trim().min(1, "请选择任务"),
  format: z.enum(exportFormats),
  includeAiReview: z.boolean().optional().default(true),
  includeHumanReview: z.boolean().optional().default(true),
  includeTaskMetadata: z.boolean().optional().default(true),
  mode: z.enum(["preview", "export"]).optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskInput>;
export type UpdateFormSchemaInput = z.infer<typeof updateFormSchemaInput>;
export type SubmitAnnotationInput = z.infer<typeof submitAnnotationInput>;
export type RunAiReviewInput = z.infer<typeof runAiReviewInput>;
export type SubmitHumanReviewInput = z.infer<typeof submitHumanReviewInput>;
export type ExportDatasetInput = z.infer<typeof exportDatasetInput>;
