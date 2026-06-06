"use client";

import { useEffect, useState } from "react";
import { Download, Eye, FileJson, RefreshCw } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { can, type AppRole } from "@/lib/auth/permissions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ExportTask = {
  id: string;
  name: string;
  approvedCount: number;
};

type ExportJob = {
  id: string;
  name: string;
  taskName: string;
  format: string;
  status: string;
  rowCount: number;
  createdAt: string;
};

type ExportsData = {
  tasks: ExportTask[];
  jobs: ExportJob[];
};

type ExportFormat = "JSON" | "CSV" | "JSONL" | "OPENAI_JSONL";

type PreviewResult = {
  content: string;
  rowCount: number;
  records: unknown[];
};

const formats: Array<{ value: ExportFormat; label: string; description: string }> = [
  { value: "JSON", label: "JSON", description: "适合复盘和调试，保留完整结构。" },
  { value: "CSV", label: "CSV", description: "适合表格分析和人工抽检。" },
  { value: "JSONL", label: "JSONL", description: "适合训练管线和批处理。" },
  {
    value: "OPENAI_JSONL",
    label: "OpenAI fine-tuning JSONL",
    description: "输出 messages + metadata 结构。",
  },
];

export default function ExportsPage() {
  const [data, setData] = useState<ExportsData>({ tasks: [], jobs: [] });
  const [taskId, setTaskId] = useState("");
  const [format, setFormat] = useState<ExportFormat>("JSONL");
  const [includeAiReview, setIncludeAiReview] = useState(true);
  const [includeHumanReview, setIncludeHumanReview] = useState(true);
  const [includeTaskMetadata, setIncludeTaskMetadata] = useState(true);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [role, setRole] = useState<AppRole>("ADMIN");

  async function loadExports() {
    try {
      const response = await fetch("/api/exports", { cache: "no-store" });

      if (!response.ok) {
        throw new Error("导出配置加载失败");
      }

      const payload = (await response.json()) as
        | ExportsData
        | { ok: true; data: ExportsData }
        | { ok: false; error?: { message?: string } };
      const nextData =
        "ok" in payload
          ? payload.ok
            ? payload.data
            : { tasks: [], jobs: [] }
          : payload;
      setData(nextData);
      setTaskId((current) => current || nextData.tasks[0]?.id || "");
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "导出配置加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadExports();
    void fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { user?: { role?: AppRole } }) => {
        if (data.user?.role) {
          setRole(data.user.role);
        }
      })
      .catch(() => {});
  }, []);

  async function previewData() {
    setPreviewing(true);
    setError("");
    setNotice("");

    try {
      const result = await requestExport("preview");
      setPreview(result as PreviewResult);
      setNotice(`已生成前 ${result.rowCount ?? 0} 条预览`);
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "预览失败");
    } finally {
      setPreviewing(false);
    }
  }

  async function exportData() {
    setExporting(true);
    setError("");
    setNotice("");

    try {
      const result = await requestExport("export");

      if (!result.content || !result.filename || !result.mimeType) {
        throw new Error("导出失败");
      }

      downloadText(result.filename, result.mimeType, result.content);
      setNotice(`已导出 ${result.rowCount ?? 0} 条 APPROVED 样本`);
      setPreview(result.preview ? { content: result.content, records: result.preview, rowCount: result.preview.length } : null);
      await loadExports();
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "导出失败");
    } finally {
      setExporting(false);
    }
  }

  async function requestExport(mode: "preview" | "export") {
    const response = await fetch("/api/exports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId,
        format,
        mode,
        includeAiReview,
        includeHumanReview,
        includeTaskMetadata,
      }),
    });
    const payload = (await response.json()) as
      | {
          filename?: string;
          mimeType?: string;
          content?: string;
          rowCount?: number;
          records?: unknown[];
          preview?: unknown[];
          message?: string;
        }
      | {
          ok: boolean;
          data?: {
            filename?: string;
            mimeType?: string;
            content?: string;
            rowCount?: number;
            records?: unknown[];
            preview?: unknown[];
          };
          error?: {
            message?: string;
          };
        };
    const result: {
      filename?: string;
      mimeType?: string;
      content?: string;
      rowCount?: number;
      records?: unknown[];
      preview?: unknown[];
      message?: string;
    } =
      "ok" in payload
        ? payload.ok
          ? (payload.data ?? {})
          : { message: payload.error?.message }
        : payload;

    if (!response.ok) {
      throw new Error(result.message ?? (mode === "preview" ? "预览失败" : "导出失败"));
    }

    return result;
  }

  const selectedTask = data.tasks.find((task) => task.id === taskId);
  const selectedFormat = formats.find((item) => item.value === format);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Export Center"
        title="数据导出"
        description="面向训练、评测和数据复盘导出 APPROVED 样本，可按场景选择 JSON、CSV、JSONL 或 OpenAI fine-tuning JSONL。"
        actions={
          <Button variant="outline" onClick={() => void loadExports()}>
            <RefreshCw className="h-4 w-4" />
            刷新
          </Button>
        }
      />

      {loading ? (
        <LoadingState text="正在加载导出配置..." rows={2} />
      ) : error && data.tasks.length === 0 ? (
        <ErrorState title="导出配置加载失败" message={error} onRetry={() => void loadExports()} />
      ) : (
        <>
          <Card className="overflow-hidden">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between gap-3">
                <CardTitle>生成导出</CardTitle>
                <Badge variant="secondary">APPROVED only</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                <label className="space-y-2">
                  <span className="text-sm font-medium">选择任务</span>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={taskId}
                    onChange={(event) => {
                      setTaskId(event.target.value);
                      setPreview(null);
                    }}
                  >
                    {data.tasks.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.name} · {task.approvedCount} approved
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium">导出格式</span>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={format}
                    onChange={(event) => {
                      setFormat(event.target.value as ExportFormat);
                      setPreview(null);
                    }}
                  >
                    {formats.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  {selectedFormat ? (
                    <p className="text-xs text-muted-foreground">{selectedFormat.description}</p>
                  ) : null}
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <OptionToggle
                  label="包含 AI 预审结果"
                  checked={includeAiReview}
                  onChange={setIncludeAiReview}
                />
                <OptionToggle
                  label="包含人工审核结果"
                  checked={includeHumanReview}
                  onChange={setIncludeHumanReview}
                />
                <OptionToggle
                  label="包含 task metadata"
                  checked={includeTaskMetadata}
                  onChange={setIncludeTaskMetadata}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={
                    !can(role, "export:create") ||
                    previewing ||
                    !taskId ||
                    (selectedTask?.approvedCount ?? 0) === 0
                  }
                  onClick={() => void previewData()}
                >
                  <Eye className="h-4 w-4" />
                  {previewing ? "预览中" : "预览前 3 条"}
                </Button>
                <Button
                  variant="outline"
                  disabled={!preview}
                  onClick={() => setPreviewDialogOpen(true)}
                >
                  <Eye className="h-4 w-4" />
                  打开预览窗口
                </Button>
                <Button
                  disabled={
                    !can(role, "export:create") ||
                    exporting ||
                    !taskId ||
                    (selectedTask?.approvedCount ?? 0) === 0
                  }
                  onClick={() => void exportData()}
                >
                  <Download className="h-4 w-4" />
                  {exporting ? "导出中" : "下载文件"}
                </Button>
              </div>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              {notice ? <p className="text-sm text-primary">{notice}</p> : null}
              {!can(role, "export:create") ? (
                <p className="text-sm text-muted-foreground">当前角色无数据导出权限。</p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between gap-3">
                <CardTitle>导出预览</CardTitle>
                <Badge variant="outline">{selectedFormat?.label ?? format}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {preview ? (
                <pre className="max-h-[480px] overflow-auto rounded-md border bg-secondary/40 p-4 text-xs leading-5">
                  {preview.content}
                </pre>
              ) : (
                <EmptyState
                  title="暂无导出预览"
                  description="选择任务和格式后，点击“预览前 3 条”查看导出结构。"
                />
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="border-b">
              <CardTitle>导出记录</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {data.jobs.length === 0 ? (
                <div className="p-5">
                  <EmptyState title="暂无导出记录" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>导出任务</TableHead>
                      <TableHead>格式</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead className="text-right">行数</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.jobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary">
                              <FileJson className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{job.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {job.taskName} · {new Date(job.createdAt).toLocaleString("zh-CN")}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{job.format}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={job.status === "COMPLETED" ? "secondary" : "warning"}>
                            {job.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {job.rowCount.toLocaleString()} rows
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Dialog
            open={previewDialogOpen}
            onOpenChange={setPreviewDialogOpen}
            title="导出数据预览"
            description="展示当前格式的前 3 条样本，便于比赛演示训练数据结构。"
          >
            <pre className="max-h-[70vh] overflow-auto rounded-md border bg-secondary/40 p-4 text-xs leading-5">
              {preview?.content ?? ""}
            </pre>
          </Dialog>
        </>
      )}
    </div>
  );
}

function OptionToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
      <span className="font-medium">{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function downloadText(filename: string, mimeType: string, content: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
