"use client";

import { AlertTriangle, CheckCircle2, GitBranch, RotateCcw } from "lucide-react";
import { RiskBadge, type RiskLevel, getRiskAccentClass } from "@/components/review/RiskBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type ReviewDecision = "APPROVED" | "RETURNED" | "ESCALATED";

type AiReview = {
  score: number;
  riskLevel: RiskLevel;
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
};

export function AiReviewPanel({
  aiReview,
  comment,
  onCommentChange,
  onSubmit,
  canSubmit,
  submitting,
  notice,
  error,
  latestReview,
}: {
  aiReview: AiReview;
  comment: string;
  onCommentChange: (value: string) => void;
  onSubmit: (decision: ReviewDecision) => void;
  canSubmit?: boolean;
  submitting: boolean;
  notice?: string;
  error?: string;
  latestReview?: {
    decision: ReviewDecision;
    comment: string | null;
    reviewedAt: string;
    reviewer: {
      name: string;
      email: string;
    };
  } | null;
}) {
  const scorePercent = Math.round(aiReview.score * 100);
  const confidencePercent = Math.round(aiReview.confidence * 100);
  const shouldPromptComment = aiReview.riskLevel === "HIGH" && comment.trim().length === 0;
  const alreadyReviewed = Boolean(latestReview);
  const actionDisabled = submitting || canSubmit === false || alreadyReviewed;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-auto p-4">
        <section
          className={cn(
            "rounded-xl border border-l-4 bg-card p-4",
            getRiskAccentClass(aiReview.riskLevel),
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium">风险概览</p>
              <p className="mt-1 text-xs text-muted-foreground">
                QualityGuard 结构化预审结果
              </p>
            </div>
            <RiskBadge risk={aiReview.riskLevel} showCode />
          </div>

          <div className="mt-4 grid gap-3 2xl:grid-cols-2">
            <MetricCard label="质量分" value={`${scorePercent}%`} progress={scorePercent} />
            <MetricCard label="置信度" value={`${confidencePercent}%`} progress={confidencePercent} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-secondary/60 text-[10px]">
              Provider: {aiReview.run.provider}
            </Badge>
            <Badge variant="outline" className="bg-secondary/60 text-[10px]">
              {aiReview.run.fallbackUsed ? "Fallback 已启用" : "Primary 结果"}
            </Badge>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">AI 建议</p>
            <Badge variant="outline" className="bg-secondary/60">
              {aiReview.suggestion ?? "-"}
            </Badge>
          </div>
          <p className="mt-2 text-base font-semibold">{formatSuggestion(aiReview.suggestion)}</p>
        </section>

        <section className="rounded-xl border bg-card p-4">
          <p className="text-sm font-medium">问题类型</p>
          {aiReview.issues.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {aiReview.issues.map((issue) => (
                <Badge key={issue} variant="outline" className="bg-secondary/50">
                  {issue}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">未发现明显风险。</p>
          )}
        </section>

        <section className="rounded-xl border bg-card p-4">
          <p className="text-sm font-medium">评测依据</p>
          {aiReview.rubricEvidence.length > 0 ? (
            <div className="mt-3 space-y-3">
              {aiReview.rubricEvidence.map((evidence, index) => (
                <div
                  key={`${evidence.criterion}-${index}`}
                  className="rounded-lg border bg-background p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium leading-5">{evidence.criterion}</p>
                    <EvidenceBadge result={evidence.result} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{evidence.reason}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">暂无评测依据。</p>
          )}
        </section>

        <section className="rounded-xl border bg-card p-4">
          <p className="text-sm font-medium">AI 评语</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
            {aiReview.comment ?? "无备注"}
          </p>
        </section>

        <label className="block space-y-2">
          <span className="text-sm font-medium">人工审核备注</span>
          {shouldPromptComment ? (
            <p className="flex items-center gap-2 text-xs text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" />
              高风险样本建议先填写审核备注，便于后续质量追踪。
            </p>
          ) : null}
          <textarea
            className="min-h-24 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm leading-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={comment}
            onChange={(event) => onCommentChange(event.target.value)}
            placeholder="请输入通过、退回或仲裁的依据，便于后续质量追踪"
          />
        </label>

        {latestReview ? (
          <div className="rounded-xl border bg-secondary/35 p-3 text-sm">
            <p className="font-medium">最近审核：{formatDecision(latestReview.decision)}</p>
            <p className="mt-1 text-muted-foreground">
              {latestReview.reviewer.name} ·{" "}
              {new Date(latestReview.reviewedAt).toLocaleString("zh-CN")}
            </p>
          </div>
        ) : null}

        {notice ? (
          <p className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm text-primary">
            {notice}
          </p>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>

      <div className="border-t bg-card p-4">
        <div className="grid gap-2">
          <Button disabled={actionDisabled} onClick={() => onSubmit("APPROVED")}>
            <CheckCircle2 className="h-4 w-4" />
            通过
          </Button>
          <Button
            variant="destructive"
            disabled={actionDisabled}
            onClick={() => onSubmit("RETURNED")}
          >
            <RotateCcw className="h-4 w-4" />
            退回重标
          </Button>
          <Button
            variant="outline"
            disabled={actionDisabled}
            onClick={() => onSubmit("ESCALATED")}
          >
            <GitBranch className="h-4 w-4" />
            提交仲裁
          </Button>
          {alreadyReviewed ? (
            <p className="text-xs leading-5 text-muted-foreground">
              该样本已完成最终审核，当前决策为
              {formatDecision(latestReview?.decision)}。如需重新演示审核，请选择未终审样本或重置
              Demo 数据。
            </p>
          ) : null}
          {canSubmit === false ? (
            <p className="text-xs text-muted-foreground">当前角色无人工审核提交权限。</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  progress,
}: {
  label: string;
  value: string;
  progress: number;
}) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold">{value}</span>
      </div>
      <Progress value={progress} className="mt-3 h-1.5" />
    </div>
  );
}

function EvidenceBadge({ result }: { result: "PASS" | "WARN" | "FAIL" }) {
  const className =
    result === "FAIL"
      ? "border-destructive/30 bg-destructive/10 text-destructive"
      : result === "WARN"
        ? "border-accent/40 bg-accent/15 text-accent-foreground"
        : "border-primary/25 bg-primary/10 text-primary";

  return (
    <Badge variant="outline" className={className}>
      {formatEvidenceResult(result)}
    </Badge>
  );
}

function formatSuggestion(suggestion: string | null) {
  if (suggestion === "APPROVE") return "建议通过";
  if (suggestion === "RETURN") return "建议退回";
  if (suggestion === "HUMAN_REVIEW") return "建议人工复核";
  return "暂无明确建议";
}

function formatEvidenceResult(result: "PASS" | "WARN" | "FAIL") {
  if (result === "PASS") return "通过";
  if (result === "WARN") return "警告";
  return "未通过";
}

function formatDecision(decision?: ReviewDecision | null) {
  if (decision === "APPROVED") return "已通过";
  if (decision === "RETURNED") return "已退回";
  if (decision === "ESCALATED") return "需仲裁";
  return "待审核";
}
