"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Bot, Database, Download, ListChecks, Save } from "lucide-react";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { FormSchemaEditor } from "@/components/form-builder/FormSchemaEditor";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskStatusBadge } from "@/components/tasks/task-status";
import { validateFormSchemaString } from "@/lib/form-schema";
import type { TaskDetail } from "@/components/tasks/task-types";

export function TaskDetailView({ taskId }: { taskId: string }) {
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [schemaDraft, setSchemaDraft] = useState("");
  const [schemaError, setSchemaError] = useState("");
  const [schemaNotice, setSchemaNotice] = useState("");
  const [savingSchema, setSavingSchema] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadTask() {
      try {
        const response = await fetch(`/api/tasks/${taskId}`, { cache: "no-store" });

        if (response.status === 404) {
          throw new Error("任务不存在");
        }

        if (!response.ok) {
          throw new Error("任务详情加载失败");
        }

        const payload = (await response.json()) as
          | { task: TaskDetail }
          | { ok: true; data: { task: TaskDetail } };
        const data = "ok" in payload ? payload.data : payload;

        if (mounted) {
          setTask(data.task);
          setSchemaDraft(data.task.formSchema);
          setError("");
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : "任务详情加载失败");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadTask();

    return () => {
      mounted = false;
    };
  }, [taskId]);

  async function reloadTask() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/tasks/${taskId}`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("任务详情加载失败");
      }
      const payload = (await response.json()) as
        | { task: TaskDetail }
        | { ok: true; data: { task: TaskDetail } };
      const data = "ok" in payload ? payload.data : payload;
      setTask(data.task);
      setSchemaDraft(data.task.formSchema);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "任务详情加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function saveFormSchema() {
    const nextError = validateFormSchemaString(schemaDraft);

    if (nextError) {
      setSchemaError(nextError);
      return;
    }

    setSavingSchema(true);
    setSchemaError("");
    setSchemaNotice("");

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formSchema: schemaDraft }),
      });
      const payload = (await response.json()) as
        | {
            task?: { formSchema: string; updatedAt: string };
            errors?: { formSchema?: string };
            message?: string;
          }
        | {
            ok: boolean;
            data?: {
              task?: { formSchema: string; updatedAt: string };
            };
            error?: {
              message?: string;
              details?: unknown;
            };
          };
      const data =
        "ok" in payload
          ? {
              task: payload.data?.task,
              errors: undefined,
              message: payload.error?.message,
            }
          : payload;

      if (!response.ok) {
        throw new Error(data.errors?.formSchema ?? data.message ?? "保存表单 schema 失败");
      }

      if (data.task && task) {
        setTask({ ...task, formSchema: data.task.formSchema, updatedAt: data.task.updatedAt });
        setSchemaDraft(data.task.formSchema);
        setSchemaNotice("Schema 已保存");
      }
    } catch (saveError) {
      setSchemaError(saveError instanceof Error ? saveError.message : "保存表单 schema 失败");
    } finally {
      setSavingSchema(false);
    }
  }

  if (loading) {
    return <LoadingState text="正在加载任务详情..." rows={2} />;
  }

  if (error || !task) {
    return (
      <div className="space-y-4">
        <Button asChild variant="outline">
          <Link href="/tasks">
            <ArrowLeft className="h-4 w-4" />
            返回任务列表
          </Link>
        </Button>
        <ErrorState
          title="任务详情加载失败"
          message={error || "任务详情加载失败"}
          onRetry={() => void reloadTask()}
        />
      </div>
    );
  }

  const progress =
    task.sampleCount === 0 ? 0 : Math.round((task.annotationCount / task.sampleCount) * 100);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Task Detail"
        title={task.name}
        description={task.description}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/tasks">
                <ArrowLeft className="h-4 w-4" />
                返回任务列表
              </Link>
            </Button>
            <TaskStatusBadge status={task.status} />
          </>
        }
      >
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{task.projectName}</Badge>
          <Badge variant="outline">
            更新于 {new Date(task.updatedAt).toLocaleString("zh-CN")}
          </Badge>
        </div>
      </PageHeader>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          ["样本总量", task.sampleCount.toLocaleString(), Database],
          ["已提交标注", task.annotationCount.toLocaleString(), ListChecks],
          ["AI 预审标准", "已配置", Bot],
          ["导出任务", task.exportJobCount.toLocaleString(), Download],
        ].map(([label, value, Icon]) => (
          <Card key={String(label)}>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">{String(label)}</p>
                <p className="mt-1 text-xl font-semibold">{String(value)}</p>
              </div>
              <Icon className="h-5 w-5 text-primary" />
            </CardContent>
          </Card>
        ))}
      </section>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="schema">Form schema</TabsTrigger>
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>任务配置</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-2">
              <ConfigBlock title="标注说明 instruction" content={task.instruction} />
              <ConfigBlock title="AI 预审标准 reviewRubric" content={task.reviewRubric} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schema">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>动态表单 schema</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  标注员端会完全基于这里的 Task.formSchema 渲染表单。
                </p>
              </div>
              <Button type="button" onClick={saveFormSchema} disabled={savingSchema}>
                <Save className="h-4 w-4" />
                {savingSchema ? "保存中" : "保存 schema"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <FormSchemaEditor schema={schemaDraft} onChange={setSchemaDraft} />
              {schemaNotice ? <p className="text-sm text-primary">{schemaNotice}</p> : null}
              {schemaError ? <p className="text-sm text-destructive">{schemaError}</p> : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflow">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <Card>
              <CardHeader>
                <CardTitle>生产进度</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Progress value={progress} />
                  <span className="w-12 text-right text-sm font-medium">{progress}%</span>
                </div>
                <div className="grid gap-3 text-sm md:grid-cols-4">
                  {["任务配置", "样本上传", "标注提交", "审核导出"].map((stage, index) => (
                    <div key={stage} className="rounded-md border bg-background p-3">
                      <p className="font-medium">{stage}</p>
                      <p className="mt-1 text-muted-foreground">
                        {index < 2 ? "已就绪" : index === 2 ? `${progress}%` : "等待上游"}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="min-h-0">
              <CardHeader>
                <CardTitle>操作记录</CardTitle>
                <p className="text-sm text-muted-foreground">展示任务最近关键审计操作。</p>
              </CardHeader>
              <CardContent className="min-h-0 p-0">
                <ScrollArea className="h-[320px] px-4 pb-4">
                  <div className="space-y-3">
                    {(task.auditLogs ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">暂无审计日志</p>
                    ) : (
                      (task.auditLogs ?? []).map((log) => (
                        <div key={log.id} className="rounded-lg border p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium">{formatAuditAction(log.action)}</p>
                            <Badge variant="outline" className="text-[10px]">
                              {new Date(log.createdAt).toLocaleString("zh-CN")}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            操作人：{log.actorName ?? "System"} · 实体：
                            {log.entityType}/{log.entityId.slice(-6)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ConfigBlock({ title, content }: { title: string; content: string }) {
  return (
    <div className="rounded-md border p-4">
      <p className="font-medium">{title}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
        {content}
      </p>
    </div>
  );
}

function formatAuditAction(action: string) {
  const map: Record<string, string> = {
    "task.created": "创建任务",
    "task.form_schema.updated": "更新表单 Schema",
    "sample.assigned": "分配样本",
    "annotation.draft_saved": "保存标注草稿",
    "annotation.submitted": "提交标注",
    "ai_review.completed": "完成 AI 预审",
    "human_review.submitted": "提交人工审核",
    "dataset.exported": "导出数据",
  };

  return map[action] ?? action;
}
