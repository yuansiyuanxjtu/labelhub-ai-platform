"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RiskBadge } from "@/components/review/RiskBadge";
import { SampleDataViewer } from "@/components/sample/SampleDataViewer";
import { AnnotationDataViewer } from "@/components/review/AnnotationDataViewer";
import { AiReviewPanel } from "@/components/review/AiReviewPanel";
import { can, type AppRole } from "@/lib/auth/permissions";

type ReviewDecision = "APPROVED" | "RETURNED" | "ESCALATED";

export type ReviewItem = {
  id: string;
  status: string;
  annotationData: string;
  formSchemaVersion: {
    id: string;
    version: number;
  } | null;
  task: {
    id: string;
    name: string;
  };
  sample: {
    id: string;
    externalId: string | null;
    rawData: string;
    status: string;
  };
  annotator: {
    name: string;
    email: string;
  };
  aiReview: {
    id: string;
    score: number;
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
    issues: string[];
    suggestion: string | null;
    comment: string | null;
    confidence: number;
    run: {
      provider: string;
      fallbackUsed: boolean;
      status: string;
    };
    rubricEvidence: Array<{
      criterion: string;
      result: "PASS" | "WARN" | "FAIL";
      reason: string;
    }>;
    updatedAt: string;
  };
  humanReview: {
    id: string;
    decision: ReviewDecision;
    comment: string | null;
    reviewedAt: string;
    reviewer: {
      name: string;
      email: string;
    };
  } | null;
  updatedAt: string;
};

export function ReviewWorkspace({
  items,
  currentItem,
  role,
  comment,
  submitting,
  notice,
  error,
  highRiskCount,
  escalatedCount,
  onSelectItem,
  onCommentChange,
  onSubmitReview,
}: {
  items: ReviewItem[];
  currentItem: ReviewItem;
  role: AppRole;
  comment: string;
  submitting: boolean;
  notice: string;
  error: string;
  highRiskCount: number;
  escalatedCount: number;
  onSelectItem: (id: string) => void;
  onCommentChange: (value: string) => void;
  onSubmitReview: (decision: ReviewDecision) => void;
}) {
  return (
    <div className="grid min-h-0 gap-4 xl:h-[calc(100vh-22rem)] xl:min-h-[360px] xl:grid-cols-[280px_minmax(0,1fr)_340px] 2xl:grid-cols-[320px_minmax(0,1fr)_420px]">
      <Card className="flex min-h-[520px] min-w-0 flex-col overflow-hidden rounded-xl xl:h-full xl:min-h-0">
        <CardHeader className="border-b p-4">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">待审核样本</CardTitle>
            <Badge variant="outline">{items.length} queued</Badge>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
            <QueueStat label="队列" value={items.length} />
            <QueueStat label="高风险" value={highRiskCount} tone="danger" />
            <QueueStat label="仲裁" value={escalatedCount} tone="warning" />
          </div>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 p-3">
          <ScrollArea className="h-full pr-1">
            <div className="space-y-2">
              {items.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectItem(item.id)}
                  className={`w-full rounded-xl border p-3 text-left transition hover:bg-secondary/70 ${
                    item.id === currentItem.id ? "border-primary bg-primary/10 shadow-sm" : "bg-card"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-muted-foreground">
                        #{String(index + 1).padStart(2, "0")}
                      </p>
                      <p className="mt-1 truncate text-sm font-medium">{item.sample.externalId ?? item.id}</p>
                    </div>
                    <RiskBadge risk={item.aiReview.riskLevel} />
                  </div>
                  <p className="mt-3 line-clamp-2 text-xs leading-5 text-muted-foreground">{item.task.name}</p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <Badge variant="outline" className="bg-secondary/40 text-[10px]">
                      {formatSampleStatus(item.sample.status, item.humanReview?.decision)}
                    </Badge>
                    <span className="text-xs font-medium text-muted-foreground">
                      AI {Math.round(item.aiReview.score * 100)}%
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="flex min-h-[520px] min-w-0 flex-col overflow-hidden rounded-xl xl:h-full xl:min-h-0">
        <CardHeader className="border-b p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">标注详情</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {currentItem.task.name} · 标注员 {currentItem.annotator.name}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Schema 版本：v{currentItem.formSchemaVersion?.version ?? "-"}
              </p>
            </div>
            <Badge variant="outline" className="bg-secondary/40">
              {formatSampleStatus(currentItem.sample.status, currentItem.humanReview?.decision)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 p-0">
          <Tabs defaultValue="sample" className="flex h-full min-h-0 flex-col space-y-0">
            <div className="border-b px-4 py-3">
              <TabsList>
                <TabsTrigger value="sample">原始样本</TabsTrigger>
                <TabsTrigger value="annotation">标注结果</TabsTrigger>
              </TabsList>
            </div>
            <ScrollArea className="min-h-0 flex-1 p-4">
              <TabsContent value="sample">
                <SampleDataViewer
                  title={currentItem.sample.externalId ?? "原始样本"}
                  rawData={currentItem.sample.rawData}
                  description="通用 JSON 样本数据"
                  enableInternalScroll={false}
                />
              </TabsContent>
              <TabsContent value="annotation">
                <AnnotationDataViewer
                  rawData={currentItem.annotationData}
                  description="由 Task.formSchema 生成的标注结果"
                />
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="flex min-h-[520px] min-w-0 flex-col overflow-hidden rounded-xl xl:h-full xl:min-h-0">
        <CardHeader className="border-b p-4">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">AI 预审与人工审核</CardTitle>
            <RiskBadge risk={currentItem.aiReview.riskLevel} showCode />
          </div>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 p-0">
          <AiReviewPanel
            aiReview={currentItem.aiReview}
            comment={comment}
            onCommentChange={onCommentChange}
            onSubmit={onSubmitReview}
            canSubmit={can(role, "review:submit")}
            submitting={submitting}
            notice={notice}
            error={error}
            latestReview={currentItem.humanReview}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function QueueStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "danger" | "warning";
}) {
  const toneClass =
    tone === "danger" ? "text-destructive" : tone === "warning" ? "text-accent-foreground" : "text-foreground";

  return (
    <div className="rounded-lg border bg-background p-2">
      <p className={`text-sm font-semibold ${toneClass}`}>{value.toLocaleString()}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function formatDecision(decision?: ReviewDecision | null) {
  if (decision === "APPROVED") return "已通过";
  if (decision === "RETURNED") return "已退回";
  if (decision === "ESCALATED") return "需仲裁";
  return "待审核";
}

function formatSampleStatus(status: string, decision?: ReviewDecision | null) {
  if (decision) {
    return formatDecision(decision);
  }

  const labels: Record<string, string> = {
    AI_REVIEWED: "AI 预审完成",
    HUMAN_REVIEWING: "人工审核中",
    RETURNED: "已退回",
    ESCALATED: "需仲裁",
    APPROVED: "已通过",
    SUBMITTED: "已提交",
    AI_REVIEWING: "AI 预审中",
  };

  return labels[status] ?? status;
}
