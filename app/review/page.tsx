"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { PageHeader } from "@/components/layout/page-header";
import { ReviewWorkspace, type ReviewItem } from "@/components/review/review-workspace";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { type AppRole } from "@/lib/auth/permissions";

type ReviewDecision = "APPROVED" | "RETURNED" | "ESCALATED";

export default function ReviewPage() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [currentId, setCurrentId] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [role, setRole] = useState<AppRole>("ADMIN");

  const visibleItems = useMemo(() => items.slice(0, 200), [items]);
  const currentItem = useMemo(
    () => visibleItems.find((item) => item.id === currentId) ?? visibleItems[0],
    [visibleItems, currentId],
  );
  const reviewedCount = useMemo(() => items.filter((item) => item.humanReview).length, [items]);
  const reviewRate = useMemo(
    () => (items.length === 0 ? 0 : Math.round((reviewedCount / items.length) * 100)),
    [items.length, reviewedCount],
  );
  const highRiskCount = useMemo(
    () => items.filter((item) => item.aiReview.riskLevel === "HIGH").length,
    [items],
  );
  const escalatedCount = useMemo(
    () =>
      items.filter(
        (item) => item.sample.status === "ESCALATED" || item.humanReview?.decision === "ESCALATED",
      ).length,
    [items],
  );

  async function loadItems() {
    try {
      const response = await fetch("/api/review", { cache: "no-store" });

      if (!response.ok) {
        throw new Error("审核队列加载失败");
      }

      const data = (await response.json()) as { items: ReviewItem[] };
      setItems(data.items);
      setCurrentId((current) => current || data.items[0]?.id || "");
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "审核队列加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadItems();
    void fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { user?: { role?: AppRole } }) => {
        if (data.user?.role) {
          setRole(data.user.role);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setComment(currentItem?.humanReview?.comment ?? "");
    setNotice("");
  }, [currentItem?.id, currentItem?.humanReview?.comment]);

  async function submitHumanReview(decision: ReviewDecision) {
    if (!currentItem) {
      return;
    }

    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`/api/review/${currentItem.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, comment }),
      });
      const data = (await response.json()) as {
        annotation?: { id: string; status: string; updatedAt: string };
        sample?: { id: string; status: string; updatedAt: string };
        humanReview?: ReviewItem["humanReview"];
        message?: string;
      };

      if (!response.ok) {
        throw new Error(data.message ?? "人工审核提交失败");
      }

      if (data.annotation && data.sample && data.humanReview) {
        const nextAnnotation = data.annotation;
        const nextSample = data.sample;
        const nextHumanReview = data.humanReview;

        setItems((current) =>
          current.map((item) =>
            item.id === nextAnnotation.id
              ? {
                  ...item,
                  status: nextAnnotation.status,
                  updatedAt: nextAnnotation.updatedAt,
                  sample: {
                    ...item.sample,
                    status: nextSample.status,
                  },
                  humanReview: nextHumanReview,
                }
              : item,
          ),
        );
      }

      setNotice(`人工审核已提交：${formatDecision(decision)}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "人工审核提交失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reviewer Workspace"
        title="人工审核工作台"
        description="查看已完成 AI 预审的样本，结合风险等级、rubric evidence 和标注结果做最终人工决策。"
        actions={
          <Button variant="outline" onClick={() => void loadItems()}>
            <RefreshCw className="h-4 w-4" />
            刷新
          </Button>
        }
      >
        <div className="flex max-w-xl items-center gap-3">
          <Progress value={reviewRate} />
          <span className="w-28 text-sm text-muted-foreground">
            {reviewedCount}/{items.length} reviewed
          </span>
        </div>
      </PageHeader>

      {loading ? (
        <LoadingState text="正在加载审核队列..." rows={2} />
      ) : error && items.length === 0 ? (
        <ErrorState title="审核队列加载失败" message={error} onRetry={() => void loadItems()} />
      ) : visibleItems.length === 0 ? (
        <EmptyState
          title="暂无待审核样本"
          description="请先在标注提交后触发 QualityGuard Agent。"
        />
      ) : currentItem ? (
        <ReviewWorkspace
          items={visibleItems}
          currentItem={currentItem}
          role={role}
          comment={comment}
          submitting={submitting}
          notice={notice}
          error={error}
          highRiskCount={highRiskCount}
          escalatedCount={escalatedCount}
          onSelectItem={setCurrentId}
          onCommentChange={setComment}
          onSubmitReview={(decision) => void submitHumanReview(decision)}
        />
      ) : null}
    </div>
  );
}

function formatDecision(decision?: ReviewDecision | null) {
  if (decision === "APPROVED") return "已通过";
  if (decision === "RETURNED") return "已退回";
  if (decision === "ESCALATED") return "需仲裁";
  return "待审核";
}
