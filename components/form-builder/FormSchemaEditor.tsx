"use client";

import { useState, type ReactNode } from "react";
import { Braces, Copy, Eye, GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormRenderer } from "@/components/form-builder/FormRenderer";
import {
  cloneField,
  createField,
  fieldTypes,
  getDefaultValueForType,
  isOptionField,
  parseFormSchema,
  stringifyFormSchema,
  type FieldValidation,
  type FormField,
  type FormFieldType,
  type FormPrimitiveValue,
  type FormSchema,
  type FormValue,
} from "@/lib/form-schema";
import { cn } from "@/lib/utils";

type FormSchemaEditorProps = {
  schema: string | FormSchema;
  onChange: (schema: string) => void;
};

type ViewMode = "preview" | "json";

export function FormSchemaEditor({ schema, onChange }: FormSchemaEditorProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [previewValue, setPreviewValue] = useState<FormValue>({});
  const parsedSchema = safeParseSchema(schema);
  const schemaJson = stringifyFormSchema(parsedSchema);

  function updateSchema(fields: FormField[]) {
    onChange(stringifyFormSchema({ fields }));
  }

  function updateField(index: number, patch: Partial<FormField>) {
    updateSchema(
      parsedSchema.fields.map((field, fieldIndex) => {
        if (fieldIndex !== index) {
          return field;
        }

        const nextField = { ...field, ...patch };

        if (patch.type) {
          nextField.options = isOptionField(patch.type)
            ? nextField.options?.length
              ? nextField.options
              : ["选项 A", "选项 B"]
            : [];
          nextField.min = patch.type === "rating" ? (nextField.min ?? 1) : undefined;
          nextField.max = patch.type === "rating" ? (nextField.max ?? 5) : undefined;
          nextField.defaultValue = getDefaultValueForType(patch.type);
          nextField.validation = {};
        }

        return nextField;
      }),
    );
  }

  function updateValidation(index: number, patch: Partial<FieldValidation>) {
    const field = parsedSchema.fields[index];
    const ratingPatch =
      field.type === "rating"
        ? {
            min: patch.min ?? field.min,
            max: patch.max ?? field.max,
          }
        : {};

    updateField(index, {
      ...ratingPatch,
      validation: {
        ...field.validation,
        ...patch,
      },
    });
  }

  function addField(type: FormFieldType = "radio") {
    updateSchema([...parsedSchema.fields, createField(type)]);
  }

  function deleteField(index: number) {
    updateSchema(parsedSchema.fields.filter((_, fieldIndex) => fieldIndex !== index));
  }

  function copyField(index: number) {
    const nextFields = [...parsedSchema.fields];
    nextFields.splice(index + 1, 0, cloneField(parsedSchema.fields[index]));
    updateSchema(nextFields);
  }

  function moveField(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= parsedSchema.fields.length) {
      return;
    }

    const nextFields = [...parsedSchema.fields];
    const [movedField] = nextFields.splice(fromIndex, 1);
    nextFields.splice(toIndex, 0, movedField);
    updateSchema(nextFields);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
          <div>
            <p className="font-medium">字段配置</p>
            <p className="mt-1 text-xs text-muted-foreground">
              拖拽左侧手柄调整顺序，复制字段可快速搭建相似标注维度。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              defaultValue="radio"
              onChange={(event) => addField(event.target.value as FormFieldType)}
              aria-label="添加字段类型"
            >
              <option value="radio">添加 radio</option>
              <option value="checkbox">添加 checkbox</option>
              <option value="select">添加 select</option>
              <option value="rating">添加 rating</option>
              <option value="textarea">添加 textarea</option>
              <option value="text">添加 text</option>
              <option value="boolean">添加 boolean</option>
            </select>
            <Button type="button" variant="outline" onClick={() => addField("radio")}>
              <Plus className="h-4 w-4" />
              添加字段
            </Button>
          </div>
        </div>

        {parsedSchema.fields.map((field, index) => (
          <div
            key={`${field.id}-${index}`}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (dragIndex !== null) {
                moveField(dragIndex, index);
                setDragIndex(null);
              }
            }}
            onDragEnd={() => setDragIndex(null)}
            className={cn(
              "space-y-4 rounded-md border bg-background p-4 transition",
              dragIndex === index ? "border-primary bg-secondary/50" : "",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  className="mt-1 cursor-grab rounded-md border p-2 text-muted-foreground active:cursor-grabbing"
                  aria-label="拖拽排序"
                >
                  <GripVertical className="h-4 w-4" />
                </button>
                <div>
                  <p className="font-medium">字段 {index + 1}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {field.type} · {field.id || "未设置 id"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="复制字段"
                  onClick={() => copyField(index)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="删除字段"
                  onClick={() => deleteField(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FieldInput
                label="id"
                value={field.id}
                placeholder="quality_score"
                onChange={(value) => updateField(index, { id: value })}
              />
              <FieldInput
                label="label"
                value={field.label}
                placeholder="字段标题"
                onChange={(value) => updateField(index, { label: value })}
              />
              <label className="space-y-2">
                <span className="text-sm font-medium">type</span>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={field.type}
                  onChange={(event) =>
                    updateField(index, { type: event.target.value as FormFieldType })
                  }
                >
                  {fieldTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center justify-between gap-3 self-end rounded-md border px-3 py-2 text-sm">
                <span>
                  <span className="font-medium">required</span>
                  <span className="ml-2 text-muted-foreground">提交时必填</span>
                </span>
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(event) => updateField(index, { required: event.target.checked })}
                />
              </label>
            </div>

            <FieldInput
              label="helpText"
              value={field.helpText ?? ""}
              placeholder="给标注员的字段填写提示"
              onChange={(value) => updateField(index, { helpText: value })}
            />

            {isOptionField(field.type) ? (
              <FieldInput
                label="options"
                value={(field.options ?? []).join(", ")}
                placeholder="选项 A, 选项 B"
                onChange={(value) =>
                  updateField(index, {
                    options: value
                      .split(",")
                      .map((option) => option.trim())
                      .filter(Boolean),
                  })
                }
              />
            ) : null}

            <FieldDefaultValueEditor
              field={field}
              onChange={(defaultValue) => updateField(index, { defaultValue })}
            />

            <ValidationEditor
              field={field}
              onChange={(patch) => updateValidation(index, patch)}
            />
          </div>
        ))}
      </div>

      <div className="space-y-4 xl:sticky xl:top-6 xl:h-fit">
        <div className="rounded-md border p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">Schema 预览</p>
              <p className="mt-1 text-xs text-muted-foreground">
                展示技术结构，也同步验证标注员侧渲染效果。
              </p>
            </div>
            <div className="flex rounded-md border p-1">
              <ModeButton active={viewMode === "preview"} onClick={() => setViewMode("preview")}>
                <Eye className="h-4 w-4" />
                预览
              </ModeButton>
              <ModeButton active={viewMode === "json"} onClick={() => setViewMode("json")}>
                <Braces className="h-4 w-4" />
                JSON
              </ModeButton>
            </div>
          </div>

          {viewMode === "preview" ? (
            <FormRenderer
              className="mt-4"
              schema={parsedSchema}
              value={previewValue}
              onChange={setPreviewValue}
            />
          ) : (
            <pre className="mt-4 max-h-[640px] overflow-auto rounded-md border bg-secondary/40 p-4 text-xs leading-5">
              {schemaJson}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

function FieldInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium">{label}</span>
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function FieldDefaultValueEditor({
  field,
  onChange,
}: {
  field: FormField;
  onChange: (value: FormPrimitiveValue) => void;
}) {
  if (field.type === "checkbox") {
    return (
      <FieldInput
        label="defaultValue"
        value={Array.isArray(field.defaultValue) ? field.defaultValue.join(", ") : ""}
        placeholder="默认选中的选项，用逗号分隔"
        onChange={(value) =>
          onChange(
            value
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
          )
        }
      />
    );
  }

  if (field.type === "boolean") {
    return (
      <label className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
        <span className="font-medium">defaultValue</span>
        <input
          type="checkbox"
          checked={Boolean(field.defaultValue)}
          onChange={(event) => onChange(event.target.checked)}
        />
      </label>
    );
  }

  if (field.type === "rating") {
    return (
      <FieldInput
        label="defaultValue"
        value={field.defaultValue === undefined ? "" : String(field.defaultValue)}
        placeholder="例如 3"
        onChange={(value) => onChange(value === "" ? undefined : Number(value))}
      />
    );
  }

  return (
    <FieldInput
      label="defaultValue"
      value={typeof field.defaultValue === "string" ? field.defaultValue : ""}
      placeholder="默认填充值"
      onChange={onChange}
    />
  );
}

function ValidationEditor({
  field,
  onChange,
}: {
  field: FormField;
  onChange: (patch: Partial<FieldValidation>) => void;
}) {
  if (field.type === "text" || field.type === "textarea") {
    return (
      <div className="grid gap-4 rounded-md border bg-secondary/30 p-3 md:grid-cols-3">
        <NumberInput
          label="minLength"
          value={field.validation?.minLength}
          onChange={(value) => onChange({ minLength: value })}
        />
        <NumberInput
          label="maxLength"
          value={field.validation?.maxLength}
          onChange={(value) => onChange({ maxLength: value })}
        />
        <FieldInput
          label="pattern"
          value={field.validation?.pattern ?? ""}
          placeholder="正则表达式"
          onChange={(value) => onChange({ pattern: value || undefined })}
        />
      </div>
    );
  }

  if (field.type === "rating") {
    return (
      <div className="grid gap-4 rounded-md border bg-secondary/30 p-3 md:grid-cols-2">
        <NumberInput label="min" value={field.min} onChange={(value) => onChange({ min: value })} />
        <NumberInput label="max" value={field.max} onChange={(value) => onChange({ max: value })} />
      </div>
    );
  }

  return null;
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: number;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium">{label}</span>
      <Input
        type="number"
        value={value ?? ""}
        onChange={(event) =>
          onChange(event.target.value === "" ? undefined : Number(event.target.value))
        }
      />
    </label>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded px-2 text-xs font-medium",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary",
      )}
    >
      {children}
    </button>
  );
}

function safeParseSchema(schema: string | FormSchema) {
  try {
    return parseFormSchema(schema);
  } catch {
    return { fields: [] };
  }
}
