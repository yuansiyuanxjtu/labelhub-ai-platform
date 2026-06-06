"use client";

import { cn } from "@/lib/utils";
import {
  getInitialFormValue,
  parseFormSchema,
  type FormField,
  type FormSchema,
  type FormValue,
} from "@/lib/form-schema";

type FormRendererProps = {
  schema: string | FormSchema;
  value: FormValue;
  onChange?: (value: FormValue) => void;
  errors?: Record<string, string | undefined>;
  readOnly?: boolean;
  className?: string;
};

export function FormRenderer({
  schema,
  value,
  onChange,
  errors,
  readOnly = false,
  className,
}: FormRendererProps) {
  let parsedSchema: FormSchema;
  let hydratedValue: FormValue;

  try {
    parsedSchema = parseFormSchema(schema);
    hydratedValue = getInitialFormValue(parsedSchema, value);
  } catch {
    return (
      <div className={cn("rounded-md border border-destructive p-4 text-sm text-destructive", className)}>
        表单 schema 无法解析
      </div>
    );
  }

  if (parsedSchema.fields.length === 0) {
    return (
      <div className={cn("rounded-md border p-4 text-sm text-muted-foreground", className)}>
        暂无字段配置
      </div>
    );
  }

  function updateField(fieldId: string, nextValue: FormValue[string]) {
    onChange?.({
      ...hydratedValue,
      [fieldId]: nextValue,
    });
  }

  return (
    <div className={cn("space-y-5", className)}>
      {parsedSchema.fields.map((field) => (
        <FieldControl
          key={field.id}
          field={field}
          value={hydratedValue[field.id]}
          error={errors?.[field.id]}
          readOnly={readOnly}
          onChange={(nextValue) => updateField(field.id, nextValue)}
        />
      ))}
    </div>
  );
}

function FieldControl({
  field,
  value,
  error,
  readOnly,
  onChange,
}: {
  field: FormField;
  value: FormValue[string];
  error?: string;
  readOnly: boolean;
  onChange: (value: FormValue[string]) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        <label className="text-sm font-medium">{field.label}</label>
        {field.required ? <span className="text-sm text-destructive">*</span> : null}
      </div>
      {field.helpText ? (
        <p className="text-xs leading-5 text-muted-foreground">{field.helpText}</p>
      ) : null}
      {renderControl(field, value, readOnly, onChange)}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function renderControl(
  field: FormField,
  value: FormValue[string],
  readOnly: boolean,
  onChange: (value: FormValue[string]) => void,
) {
  if (field.type === "radio") {
    return (
      <div className="grid gap-2">
        {(field.options ?? []).map((option) => (
          <label key={option} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
            <input
              type="radio"
              name={field.id}
              value={option}
              checked={value === option}
              disabled={readOnly}
              onChange={() => onChange(option)}
            />
            {option}
          </label>
        ))}
      </div>
    );
  }

  if (field.type === "checkbox") {
    const selected = Array.isArray(value) ? value : [];

    return (
      <div className="grid gap-2">
        {(field.options ?? []).map((option) => (
          <label key={option} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
            <input
              type="checkbox"
              value={option}
              checked={selected.includes(option)}
              disabled={readOnly}
              onChange={(event) => {
                onChange(
                  event.target.checked
                    ? [...selected, option]
                    : selected.filter((item) => item !== option),
                );
              }}
            />
            {option}
          </label>
        ))}
      </div>
    );
  }

  if (field.type === "rating") {
    const min = field.min ?? 1;
    const max = field.max ?? 5;
    const ratingValue = typeof value === "number" ? value : undefined;

    return (
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: max - min + 1 }, (_, index) => min + index).map((score) => (
          <button
            key={score}
            type="button"
            disabled={readOnly}
            onClick={() => onChange(score)}
            className={cn(
              "h-9 w-9 rounded-md border text-sm font-medium transition",
              ratingValue === score
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-background hover:bg-secondary",
            )}
          >
            {score}
          </button>
        ))}
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <select
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        value={typeof value === "string" ? value : ""}
        disabled={readOnly}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">请选择</option>
        {(field.options ?? []).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "text") {
    return (
      <input
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        value={typeof value === "string" ? value : ""}
        disabled={readOnly}
        onChange={(event) => onChange(event.target.value)}
        placeholder="请输入"
      />
    );
  }

  if (field.type === "boolean") {
    return (
      <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
        <input
          type="checkbox"
          checked={Boolean(value)}
          disabled={readOnly}
          onChange={(event) => onChange(event.target.checked)}
        />
        是
      </label>
    );
  }

  return (
    <textarea
      className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      value={typeof value === "string" ? value : ""}
      disabled={readOnly}
      onChange={(event) => onChange(event.target.value)}
      placeholder="请输入"
    />
  );
}
