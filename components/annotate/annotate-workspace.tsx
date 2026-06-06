"use client";

import { CheckCircle2, Save } from "lucide-react";
import { FormRenderer } from "@/components/form-builder/FormRenderer";
import { SampleDataViewer } from "@/components/sample/SampleDataViewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { FormValue } from "@/lib/form-schema";

export type AnnotateSample = {
  id: string;
  taskId: string;
  externalId: string | null;
  rawData: string;
  status: string;
  updatedAt: string;
  task: {
    id: string;
    name: string;
    instruction: string;
    formSchema: string;
  };
  annotation: {
    id: string;
    annotationData: string;
    status: string;
    submittedAt: string | null;
    updatedAt: string;
  } | null;
};

export function AnnotateWorkspace({
  samples,
  currentSample,
  value,
  formErrors,
  saving,
  notice,
  error,
  onSelectSample,
  onChangeValue,
  onSaveDraft,
  onSubmit,
}: {
  samples: AnnotateSample[];
  currentSample: AnnotateSample;
  value: FormValue;
  formErrors: Record<string, string>;
  saving: boolean;
  notice: string;
  error: string;
  onSelectSample: (sample: AnnotateSample) => void;
  onChangeValue: (nextValue: FormValue) => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="grid min-h-0 gap-4 xl:h-[calc(100vh-22rem)] xl:min-h-[360px] xl:grid-cols-[280px_minmax(0,1fr)_340px] 2xl:grid-cols-[320px_minmax(0,1fr)_420px]">
      <Card className="flex min-h-[520px] min-w-0 flex-col overflow-hidden rounded-xl xl:h-full xl:min-h-0">
        <CardHeader className="border-b p-4">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">样本列表</CardTitle>
            <Badge variant="outline">{samples.length} assigned</Badge>
          </div>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 p-3">
          <ScrollArea className="h-full pr-1">
            <div className="space-y-2">
              {samples.map((sample, index) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => onSelectSample(sample)}
                  className={`w-full rounded-xl border p-3 text-left transition hover:bg-secondary/70 ${
                    sample.id === currentSample.id ? "border-primary bg-primary/10 shadow-sm" : "bg-card"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-muted-foreground">
                        #{String(index + 1).padStart(2, "0")}
                      </p>
                      <p className="mt-1 truncate text-sm font-medium">{sample.externalId ?? sample.id}</p>
                    </div>
                    <SampleStatusBadge status={sample.status} annotationStatus={sample.annotation?.status} />
                  </div>
                  <p className="mt-3 line-clamp-2 text-xs leading-5 text-muted-foreground">{sample.task.name}</p>
                </button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <div className="min-h-[520px] min-w-0 overflow-hidden rounded-xl border bg-card shadow-sm xl:h-full xl:min-h-0">
        <ScrollArea className="h-full p-4">
          <div className="space-y-4">
            <SampleDataViewer
              title={currentSample.externalId ?? "样本数据"}
              rawData={currentSample.rawData}
              description={currentSample.task.name}
              enableInternalScroll={false}
            />
            <Card className="overflow-hidden rounded-xl">
              <CardContent className="space-y-4 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">标注说明</p>
                  <SampleStatusBadge status={currentSample.status} annotationStatus={currentSample.annotation?.status} />
                </div>
                <div className="rounded-xl border bg-secondary/35 p-4">
                  <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                    {currentSample.task.instruction}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </div>

      <Card className="flex min-h-[520px] min-w-0 flex-col overflow-hidden rounded-xl xl:h-full xl:min-h-0">
        <CardHeader className="border-b p-4">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">动态标注表单</CardTitle>
            <Badge variant="secondary">Task.formSchema</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col p-0">
          <ScrollArea className="min-h-0 flex-1 p-4">
            <FormRenderer
              schema={currentSample.task.formSchema}
              value={value}
              onChange={onChangeValue}
              errors={formErrors}
            />
            {notice ? (
              <p className="mt-4 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm text-primary">
                <CheckCircle2 className="h-4 w-4" />
                {notice}
              </p>
            ) : null}
            {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
          </ScrollArea>
          <div className="grid gap-2 border-t bg-card p-4 2xl:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              disabled={saving || currentSample.status === "SUBMITTED"}
              onClick={onSaveDraft}
            >
              <Save className="h-4 w-4" />
              保存草稿
            </Button>
            <Button
              type="button"
              disabled={saving || currentSample.status === "SUBMITTED"}
              onClick={onSubmit}
            >
              <CheckCircle2 className="h-4 w-4" />
              提交标注
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SampleStatusBadge({
  status,
  annotationStatus,
}: {
  status: string;
  annotationStatus?: string;
}) {
  if (status === "SUBMITTED") {
    return <Badge variant="secondary">已提交</Badge>;
  }

  if (annotationStatus === "DRAFT") {
    return <Badge variant="warning">草稿</Badge>;
  }

  if (status === "ASSIGNED") {
    return <Badge variant="outline">待标注</Badge>;
  }

  return <Badge variant="outline">{formatSampleStatus(status)}</Badge>;
}

function formatSampleStatus(status: string) {
  const labels: Record<string, string> = {
    APPROVED: "已通过",
    RETURNED: "已退回",
    ESCALATED: "需仲裁",
    HUMAN_REVIEWING: "人工审核中",
    AI_REVIEWED: "AI 预审完成",
    AI_REVIEWING: "AI 预审中",
    IN_PROGRESS: "标注中",
    PENDING: "待分配",
    EXPORTED: "已导出",
  };

  return labels[status] ?? status;
}
