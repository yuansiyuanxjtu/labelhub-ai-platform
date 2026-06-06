"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { taskTemplates } from "@/lib/templates/taskTemplates";
import { can, type AppRole } from "@/lib/auth/permissions";
import {
  defaultFormSchema,
  hasTaskFormErrors,
  validateTaskForm,
  type TaskFormErrors,
  type TaskFormInput,
} from "@/lib/task-validation";

const initialForm: TaskFormInput = {
  name: "",
  description: "",
  instruction: "",
  reviewRubric: "",
  formSchema: defaultFormSchema,
};

export function NewTaskForm() {
  const router = useRouter();
  const [form, setForm] = useState<TaskFormInput>(initialForm);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [errors, setErrors] = useState<TaskFormErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [role, setRole] = useState<AppRole>("ADMIN");

  useEffect(() => {
    void fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { user?: { role?: AppRole } }) => {
        if (data.user?.role) {
          setRole(data.user.role);
        }
      })
      .catch(() => {});
  }, []);

  function updateField(field: keyof TaskFormInput, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function applyTemplate(templateId: string) {
    setSelectedTemplateId(templateId);
    const template = taskTemplates.find((item) => item.id === templateId);

    if (!template) {
      return;
    }

    setForm((current) => ({
      ...current,
      name: current.name.trim() ? current.name : template.title,
      description: current.description.trim() ? current.description : template.description,
      instruction: template.instruction,
      reviewRubric: template.reviewRubric,
      formSchema: template.formSchema,
    }));
    setErrors({});
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!can(role, "task:create")) {
      setSubmitError("当前角色无创建任务权限");
      return;
    }
    const nextErrors = validateTaskForm(form);

    if (hasTaskFormErrors(nextErrors)) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = (await response.json()) as
        | {
            task?: { id: string };
            errors?: TaskFormErrors;
            message?: string;
          }
        | {
            ok: boolean;
            data?: { task?: { id: string } };
            error?: { message?: string; details?: unknown };
          };
      const data =
        "ok" in payload
          ? {
              task: payload.data?.task,
              errors: undefined as TaskFormErrors | undefined,
              message: payload.error?.message,
            }
          : payload;

      if (!response.ok) {
        if (data.errors) {
          setErrors(data.errors);
        }

        throw new Error(data.message ?? "创建任务失败");
      }

      if (data.task?.id) {
        router.push(`/tasks/${data.task.id}`);
        router.refresh();
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "创建任务失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
      <FieldError message={submitError} className="md:col-span-2" />
      <label className="space-y-2 md:col-span-2">
        <span className="text-sm font-medium">任务模板</span>
        <select
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={selectedTemplateId}
          onChange={(event) => applyTemplate(event.target.value)}
        >
          <option value="">不使用模板（手动配置）</option>
          {taskTemplates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.title}
            </option>
          ))}
        </select>
        {selectedTemplateId ? (
          <p className="text-xs text-muted-foreground">
            已填充模板内容，你仍然可以手动修改 instruction、reviewRubric 和 formSchema。
          </p>
        ) : null}
      </label>
      <label className="space-y-2">
        <span className="text-sm font-medium">任务名称</span>
        <Input
          value={form.name}
          onChange={(event) => updateField("name", event.target.value)}
          placeholder="例如：客服问答质量评估"
        />
        <FieldError message={errors.name} />
      </label>
      <label className="space-y-2">
        <span className="text-sm font-medium">任务描述</span>
        <Input
          value={form.description}
          onChange={(event) => updateField("description", event.target.value)}
          placeholder="说明任务目标与数据范围"
        />
        <FieldError message={errors.description} />
      </label>
      <label className="space-y-2 md:col-span-2">
        <span className="text-sm font-medium">标注说明 instruction</span>
        <textarea
          className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={form.instruction}
          onChange={(event) => updateField("instruction", event.target.value)}
          placeholder="告诉标注员如何判断、如何填写，以及遇到边界情况如何处理。"
        />
        <FieldError message={errors.instruction} />
      </label>
      <label className="space-y-2 md:col-span-2">
        <span className="text-sm font-medium">AI 预审标准 reviewRubric</span>
        <textarea
          className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={form.reviewRubric}
          onChange={(event) => updateField("reviewRubric", event.target.value)}
          placeholder="例如：准确性低于 0.8、缺少依据或语气不礼貌时标记为中高风险。"
        />
        <FieldError message={errors.reviewRubric} />
      </label>
      <label className="space-y-2 md:col-span-2">
        <span className="text-sm font-medium">默认表单 schema</span>
        <textarea
          className="min-h-56 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={form.formSchema}
          onChange={(event) => updateField("formSchema", event.target.value)}
        />
        <FieldError message={errors.formSchema} />
      </label>
      <div className="md:col-span-2">
        <Button type="submit" disabled={submitting || !can(role, "task:create")}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {submitting ? "创建中" : "创建任务"}
        </Button>
        {!can(role, "task:create") ? (
          <p className="mt-2 text-sm text-muted-foreground">当前角色无创建任务权限。</p>
        ) : null}
      </div>
      {selectedTemplateId ? (
        <div className="md:col-span-2 rounded-md border bg-secondary/20 p-3">
          <p className="text-xs font-medium">sampleRawData 示例</p>
          <pre className="mt-2 overflow-x-auto text-xs leading-5 text-muted-foreground">
            {
              taskTemplates.find((template) => template.id === selectedTemplateId)
                ?.sampleRawDataExample
            }
          </pre>
        </div>
      ) : null}
    </form>
  );
}

function FieldError({
  message,
  className,
}: {
  message?: string;
  className?: string;
}) {
  if (!message) {
    return null;
  }

  return <p className={`text-sm text-destructive ${className ?? ""}`}>{message}</p>;
}
