import { validateFormSchemaString } from "@/lib/form-schema";

export type TaskFormInput = {
  name: string;
  description: string;
  instruction: string;
  reviewRubric: string;
  formSchema: string;
};

export type TaskFormErrors = Partial<Record<keyof TaskFormInput, string>>;

export const defaultFormSchema = JSON.stringify(
  {
    fields: [
      {
        id: "field_one",
        label: "字段一",
        type: "radio",
        options: ["选项 A", "选项 B"],
        required: true,
        helpText: "根据任务说明选择最合适的选项。",
      },
      {
        id: "notes",
        label: "补充说明",
        type: "textarea",
        required: false,
        validation: {
          maxLength: 500,
        },
      },
    ],
  },
  null,
  2,
);

export function validateTaskForm(input: TaskFormInput) {
  const errors: TaskFormErrors = {};

  if (!input.name.trim()) {
    errors.name = "请输入任务名称";
  }

  if (!input.description.trim()) {
    errors.description = "请输入任务描述";
  }

  if (!input.instruction.trim()) {
    errors.instruction = "请输入标注说明";
  }

  if (!input.reviewRubric.trim()) {
    errors.reviewRubric = "请输入 AI 预审标准";
  }

  const formSchemaError = validateFormSchemaString(input.formSchema);

  if (formSchemaError) {
    errors.formSchema = formSchemaError;
  }

  return errors;
}

export function hasTaskFormErrors(errors: TaskFormErrors) {
  return Object.keys(errors).length > 0;
}
