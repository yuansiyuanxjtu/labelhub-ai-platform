import { Badge } from "@/components/ui/badge";

const statusLabels: Record<string, string> = {
  DRAFT: "草稿",
  SAMPLING: "样本准备",
  ASSIGNING: "分配中",
  ANNOTATING: "标注中",
  AI_REVIEWING: "AI 预审",
  HUMAN_REVIEWING: "人工审核",
  READY_TO_EXPORT: "待导出",
  EXPORTED: "已导出",
  ARCHIVED: "已归档",
};

export function formatTaskStatus(status: string) {
  return statusLabels[status] ?? status;
}

export function TaskStatusBadge({ status }: { status: string }) {
  const variant =
    status === "DRAFT" ? "outline" : status === "EXPORTED" ? "secondary" : "default";

  return <Badge variant={variant}>{formatTaskStatus(status)}</Badge>;
}
