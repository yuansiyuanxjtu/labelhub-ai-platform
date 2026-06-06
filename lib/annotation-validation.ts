import { getInitialFormValue, parseFormSchema, type FormValue } from "@/lib/form-schema";

export function validateAnnotationValue(schema: string, value: FormValue) {
  const errors: Record<string, string> = {};
  const parsedSchema = parseFormSchema(schema);
  const hydratedValue = getInitialFormValue(parsedSchema, value);

  for (const field of parsedSchema.fields) {
    const fieldValue = hydratedValue[field.id];

    if (
      field.required &&
      (fieldValue === undefined ||
        fieldValue === "" ||
        (Array.isArray(fieldValue) && fieldValue.length === 0))
    ) {
      errors[field.id] = "该字段必填";
      continue;
    }

    if (fieldValue === undefined || fieldValue === "") {
      continue;
    }

    if (field.type === "radio" || field.type === "select") {
      if (typeof fieldValue !== "string" || !(field.options ?? []).includes(fieldValue)) {
        errors[field.id] = "请选择有效选项";
      }
    }

    if (field.type === "checkbox") {
      if (
        !Array.isArray(fieldValue) ||
        fieldValue.some((item) => !(field.options ?? []).includes(String(item)))
      ) {
        errors[field.id] = "请选择有效选项";
      }
    }

    if (field.type === "rating") {
      const numberValue = Number(fieldValue);
      const min = field.validation?.min ?? field.min ?? 1;
      const max = field.validation?.max ?? field.max ?? 5;

      if (!Number.isFinite(numberValue) || numberValue < min || numberValue > max) {
        errors[field.id] = `请输入 ${min}-${max} 范围内的评分`;
      }
    }

    if (field.type === "text" || field.type === "textarea") {
      const textValue = String(fieldValue);

      if (
        field.validation?.minLength !== undefined &&
        textValue.length < field.validation.minLength
      ) {
        errors[field.id] = `至少输入 ${field.validation.minLength} 个字符`;
      }

      if (
        field.validation?.maxLength !== undefined &&
        textValue.length > field.validation.maxLength
      ) {
        errors[field.id] = `最多输入 ${field.validation.maxLength} 个字符`;
      }

      if (field.validation?.pattern) {
        try {
          const regexp = new RegExp(field.validation.pattern);

          if (!regexp.test(textValue)) {
            errors[field.id] = "输入格式不符合校验规则";
          }
        } catch {
          errors[field.id] = "字段校验规则无效";
        }
      }
    }
  }

  return errors;
}
