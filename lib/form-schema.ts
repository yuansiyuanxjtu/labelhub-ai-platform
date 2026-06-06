import {
  fieldTypes,
  type FieldValidation,
  type FormField,
  type FormFieldType,
  type FormPrimitiveValue,
  type FormSchema,
  type FormValue,
} from "@/types/formSchema";

export { fieldTypes };
export type { FieldValidation, FormField, FormFieldType, FormPrimitiveValue, FormSchema, FormValue };

export const optionFieldTypes = ["radio", "checkbox", "select"] as const;

export const emptyFormSchema: FormSchema = {
  fields: [],
};

export function createField(type: FormFieldType = "radio"): FormField {
  const id = `field_${Date.now().toString(36)}`;

  return {
    id,
    label: "新字段",
    type,
    required: false,
    helpText: "",
    defaultValue: getDefaultValueForType(type),
    options: optionFieldTypes.includes(type as (typeof optionFieldTypes)[number])
      ? ["选项 A", "选项 B"]
      : [],
    min: type === "rating" ? 1 : undefined,
    max: type === "rating" ? 5 : undefined,
    validation: {},
  };
}

export function cloneField(field: FormField): FormField {
  const nextId = `${field.id}_copy_${Date.now().toString(36)}`;

  return normalizeFormField({
    ...field,
    id: nextId,
    label: `${field.label} 副本`,
  });
}

export function parseFormSchema(schema: string | FormSchema): FormSchema {
  if (typeof schema !== "string") {
    return normalizeFormSchema(schema);
  }

  return normalizeFormSchema(JSON.parse(schema) as FormSchema);
}

export function stringifyFormSchema(schema: FormSchema) {
  return JSON.stringify(normalizeFormSchema(schema), null, 2);
}

export function normalizeFormSchema(schema: Partial<FormSchema>): FormSchema {
  const rawFields = Array.isArray(schema.fields) ? schema.fields : [];

  return {
    fields: rawFields.map((field, index) => {
      const legacyField = field as Partial<FormField> & { key?: string };
      const id = String(legacyField.id ?? legacyField.key ?? `field_${index + 1}`);

      return normalizeFormField({ ...legacyField, id });
    }),
  };
}

export function normalizeFormField(field: Partial<FormField>): FormField {
  const type = fieldTypes.includes(field.type as FormFieldType)
    ? (field.type as FormFieldType)
    : "textarea";
  const options = isOptionField(type) ? normalizeOptions(field.options) : [];
  const min = type === "rating" ? toOptionalNumber(field.min, 1) : undefined;
  const max = type === "rating" ? toOptionalNumber(field.max, 5) : undefined;

  return {
    id: String(field.id ?? "").trim(),
    label: String(field.label ?? field.id ?? "新字段"),
    type,
    required: Boolean(field.required),
    helpText: String(field.helpText ?? ""),
    defaultValue: normalizeDefaultValue(type, field.defaultValue),
    options,
    min,
    max,
    validation: normalizeValidation(field.validation),
  };
}

export function validateFormSchemaString(schema: string) {
  if (!schema.trim()) {
    return "请输入默认表单 schema";
  }

  try {
    const parsed = parseFormSchema(schema);

    if (parsed.fields.length === 0) {
      return "schema 必须包含非空 fields 数组";
    }

    const ids = new Set<string>();

    for (const field of parsed.fields) {
      if (!field.id.trim()) {
        return "每个字段都必须配置 id";
      }

      if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(field.id)) {
        return `字段 id 只能使用字母、数字和下划线，并且以字母开头：${field.id}`;
      }

      if (ids.has(field.id)) {
        return `字段 id 重复：${field.id}`;
      }

      ids.add(field.id);

      if (!field.label.trim()) {
        return `字段 ${field.id} 必须配置 label`;
      }

      if (isOptionField(field.type) && (!field.options || field.options.length === 0)) {
        return `字段 ${field.label} 必须至少配置一个选项`;
      }

      if (field.type === "rating" && Number(field.min ?? 1) >= Number(field.max ?? 5)) {
        return `字段 ${field.label} 的 min 必须小于 max`;
      }

      if (
        field.validation?.minLength !== undefined &&
        field.validation?.maxLength !== undefined &&
        field.validation.minLength > field.validation.maxLength
      ) {
        return `字段 ${field.label} 的最小长度不能大于最大长度`;
      }
    }

    return "";
  } catch {
    return "schema 必须是合法 JSON";
  }
}

export function getInitialFormValue(schema: string | FormSchema, currentValue: FormValue = {}) {
  const parsedSchema = parseFormSchema(schema);

  return parsedSchema.fields.reduce<FormValue>((nextValue, field) => {
    if (currentValue[field.id] !== undefined) {
      nextValue[field.id] = currentValue[field.id];
      return nextValue;
    }

    if (field.defaultValue !== undefined && field.defaultValue !== "") {
      nextValue[field.id] = field.defaultValue;
    }

    return nextValue;
  }, {});
}

export function isOptionField(type: FormFieldType) {
  return type === "radio" || type === "checkbox" || type === "select";
}

export function getDefaultValueForType(type: FormFieldType): FormPrimitiveValue {
  if (type === "checkbox") return [];
  if (type === "rating") return undefined;
  if (type === "boolean") return false;
  return "";
}

function normalizeDefaultValue(type: FormFieldType, value: unknown): FormPrimitiveValue {
  if (value === undefined || value === null) {
    return getDefaultValueForType(type);
  }

  if (type === "checkbox") {
    return Array.isArray(value) ? value.map(String) : [];
  }

  if (type === "rating") {
    return value === "" ? undefined : Number(value);
  }

  if (type === "boolean") {
    return Boolean(value);
  }

  return String(value);
}

function normalizeValidation(validation: unknown): FieldValidation {
  if (!validation || typeof validation !== "object") {
    return {};
  }

  const rawValidation = validation as FieldValidation;

  return {
    minLength: toOptionalNumber(rawValidation.minLength),
    maxLength: toOptionalNumber(rawValidation.maxLength),
    pattern: rawValidation.pattern ? String(rawValidation.pattern) : undefined,
    min: toOptionalNumber(rawValidation.min),
    max: toOptionalNumber(rawValidation.max),
  };
}

function normalizeOptions(options: unknown) {
  if (!Array.isArray(options)) {
    return [];
  }

  return options.map((option) => String(option).trim()).filter(Boolean);
}

function toOptionalNumber(value: unknown, fallback?: number) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}
