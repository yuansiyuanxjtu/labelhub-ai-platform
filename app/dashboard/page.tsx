"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileCheck2,
  Hourglass,
  ListChecks,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type DashboardData = {
  metrics: {
    totalTasks: number;
    totalSamples: number;
    annotatedCount: number;
    pendingReviewCount: number;
    approvedSampleCount: number;
    highRiskCount: number;
    humanPassRate: number;
    exportableCount: number;
  };
  sampleStatusDistribution: Array<{
    status: string;
    count: number;
  }>;
  aiRiskDistribution: Array<{
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
    count: number;
  }>;
  recentTasks: Array<{
    id: string;
    name: string;
    status: string;
    sampleCount: number;
    annotationCount: number;
    progress: number;
    updatedAt: string;
  }>;
  annotatorWorkloads: Array<{
    id: string;
    name: string;
    email: string;
    assignedCount: number;
    annotationCount: number;
    completionRate: number;
  }>;
  recentReviews: Array<{
    id: string;
    decision: string;
    comment: string | null;
    reviewedAt: string;
    reviewerName: string;
    taskName: string;
    sampleExternalId: string | null;
    sampleStatus: string;
  }>;
};

const metricConfig = [
  { key: "totalTasks", label: "总任务数", icon: ListChecks },
  { key: "totalSamples", label: "总样本数", icon: Database },
  { key: "annotatedCount", label: "已标注样本数", icon: ClipboardCheck },
  { key: "pendingReviewCount", label: "待审核样本数", icon: Hourglass },
  { key: "approvedSampleCount", label: "已通过样本数", icon: ShieldCheck },
  { key: "highRiskCount", label: "AI 高风险样本数", icon: AlertTriangle },
  { key: "humanPassRate", label: "人工通过率", icon: CheckCircle2, suffix: "%" },
  { key: "exportableCount", label: "可导出样本数", icon: FileCheck2 },
] as const;

const sampleStatusLabels: Record<string, string> = {
  PENDING: "待分配",
  ASSIGNED: "已分配",
  IN_PROGRESS: "标注中",
  SUBMITTED: "已提交",
  AI_REVIEWING: "AI 预审中",
  AI_REVIEWED: "AI 已预审",
  HUMAN_REVIEWING: "人工审核中",
  APPROVED: "已通过",
  RETURNED: "已退回",
  ESCALATED: "需仲裁",
  EXPORTED: "已导出",
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });

      if (!response.ok) {
        throw new Error("Dashboard 加载失败");
      }

      setData((await response.json()) as DashboardData);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Dashboard 加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  const maxSampleStatusCount = useMemo(
    () => Math.max(...(data?.sampleStatusDistribution.map((item) => item.count) ?? [1]), 1),
    [data?.sampleStatusDistribution],
  );
  const maxRiskCount = useMemo(
    () => Math.max(...(data?.aiRiskDistribution.map((item) => item.count) ?? [1]), 1),
    [data?.aiRiskDistribution],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Quality Dashboard"
        title="数据生产质量看板"
        description="LabelHub helps teams produce high-quality training data with human-in-the-loop AI review."
        actions={
          <Button asChild>
            <Link href="/demo">
              <Sparkles className="h-4 w-4" />
              Demo Mode
            </Link>
          </Button>
        }
      />

      {loading ? (
        <LoadingState text="正在加载质量指标..." rows={2} />
      ) : error || !data ? (
        <ErrorState
          title="Dashboard 加载失败"
          message={error || "Dashboard 加载失败"}
          onRetry={() => {
            setLoading(true);
            void loadDashboard();
          }}
        />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metricConfig.map((metric) => {
              const Icon = metric.icon;
              const value = data.metrics[metric.key];

              return (
              <Card key={metric.key} className="overflow-hidden">
                <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {metric.label}
                  </CardTitle>
                    <div className="rounded-md border bg-secondary/70 p-2">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold">
                      {value.toLocaleString()}
                      {"suffix" in metric ? metric.suffix : ""}
                    </div>
                    <div className="mt-3 h-1 rounded-full bg-secondary">
                      <div className="h-1 w-2/3 rounded-full bg-primary" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>样本状态分布</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.sampleStatusDistribution.length === 0 ? (
                  <EmptyState title="暂无样本状态数据" />
                ) : (
                  data.sampleStatusDistribution.map((item) => (
                    <DistributionBar
                      key={item.status}
                      label={sampleStatusLabels[item.status] ?? item.status}
                      value={item.count}
                      max={maxSampleStatusCount}
                      badge={item.status}
                    />
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI 风险等级分布</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.aiRiskDistribution.length === 0 ? (
                  <EmptyState title="暂无 AI 预审结果" />
                ) : (
                  data.aiRiskDistribution.map((item) => (
                    <DistributionBar
                      key={item.riskLevel}
                      label={formatRisk(item.riskLevel)}
                      value={item.count}
                      max={maxRiskCount}
                      badge={item.riskLevel}
                      badgeVariant={riskVariant(item.riskLevel)}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <Card>
              <CardHeader>
                <CardTitle>最近任务进度</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {data.recentTasks.length === 0 ? (
                  <EmptyState title="暂无任务" />
                ) : (
                  data.recentTasks.map((task) => (
                    <div key={task.id} className="space-y-2">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium">{task.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {task.annotationCount.toLocaleString()} / {task.sampleCount.toLocaleString()} samples
                          </p>
                        </div>
                        <Badge variant="outline">{task.status}</Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={task.progress} />
                        <span className="w-10 text-right text-sm font-medium">{task.progress}%</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>标注员工作量排行</CardTitle>
              </CardHeader>
              <CardContent>
                {data.annotatorWorkloads.length === 0 ? (
                  <EmptyState title="暂无标注员数据" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>标注员</TableHead>
                        <TableHead className="text-right">已标注</TableHead>
                        <TableHead className="text-right">完成率</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.annotatorWorkloads.map((annotator) => (
                        <TableRow key={annotator.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{annotator.name}</p>
                              <p className="text-xs text-muted-foreground">{annotator.email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {annotator.annotationCount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary">{annotator.completionRate}%</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>最近审核记录</CardTitle>
            </CardHeader>
            <CardContent>
              {data.recentReviews.length === 0 ? (
                <EmptyState title="暂无人工审核记录" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>样本</TableHead>
                      <TableHead>任务</TableHead>
                      <TableHead>审核员</TableHead>
                      <TableHead>决策</TableHead>
                      <TableHead>时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentReviews.map((review) => (
                      <TableRow key={review.id}>
                        <TableCell className="font-mono text-xs">
                          {review.sampleExternalId ?? "sample"}
                        </TableCell>
                        <TableCell>{review.taskName}</TableCell>
                        <TableCell>{review.reviewerName}</TableCell>
                        <TableCell>
                          <Badge variant={decisionVariant(review.decision)}>
                            {formatDecision(review.decision)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(review.reviewedAt).toLocaleString("zh-CN")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function DistributionBar({
  label,
  value,
  max,
  badge,
  badgeVariant = "outline",
}: {
  label: string;
  value: number;
  max: number;
  badge: string;
  badgeVariant?: BadgeProps["variant"];
}) {
  const width = max === 0 ? 0 : Math.max(6, Math.round((value / max) * 100));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant={badgeVariant}>{badge}</Badge>
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className="text-sm text-muted-foreground">{value.toLocaleString()}</span>
      </div>
      <div className="h-2 rounded-full bg-secondary">
        <div
          className={`h-2 rounded-full ${barColor(badge)}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function formatRisk(risk: "LOW" | "MEDIUM" | "HIGH") {
  if (risk === "HIGH") return "高风险";
  if (risk === "MEDIUM") return "中风险";
  return "低风险";
}

function riskVariant(risk: "LOW" | "MEDIUM" | "HIGH"): BadgeProps["variant"] {
  if (risk === "HIGH") return "destructive";
  if (risk === "MEDIUM") return "warning";
  return "secondary";
}

function formatDecision(decision: string) {
  if (decision === "APPROVED") return "通过";
  if (decision === "RETURNED") return "退回";
  if (decision === "ESCALATED") return "仲裁";
  return decision;
}

function decisionVariant(decision: string): BadgeProps["variant"] {
  if (decision === "APPROVED") return "secondary";
  if (decision === "RETURNED") return "destructive";
  if (decision === "ESCALATED") return "warning";
  return "outline";
}

function barColor(value: string) {
  if (value === "HIGH" || value === "RETURNED" || value === "ESCALATED") {
    return "bg-destructive";
  }

  if (value === "MEDIUM" || value === "AI_REVIEWED" || value === "HUMAN_REVIEWING") {
    return "bg-accent";
  }

  return "bg-primary";
}
