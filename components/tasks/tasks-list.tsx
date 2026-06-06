"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { TaskStatusBadge } from "@/components/tasks/task-status";
import type { TaskListItem } from "@/components/tasks/task-types";

export function TasksList() {
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadTasks() {
      try {
        const response = await fetch("/api/tasks", { cache: "no-store" });

        if (!response.ok) {
          throw new Error("任务列表加载失败");
        }

        const payload = (await response.json()) as
          | { tasks: TaskListItem[] }
          | { ok: true; data: { tasks: TaskListItem[] } };
        const data = "ok" in payload ? payload.data : payload;

        if (mounted) {
          setTasks(data.tasks ?? []);
          setError("");
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : "任务列表加载失败");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadTasks();

    return () => {
      mounted = false;
    };
  }, []);

  async function retryLoadTasks() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/tasks", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("任务列表加载失败");
      }
      const payload = (await response.json()) as
        | { tasks: TaskListItem[] }
        | { ok: true; data: { tasks: TaskListItem[] } };
      const data = "ok" in payload ? payload.data : payload;
      setTasks(data.tasks ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "任务列表加载失败");
    } finally {
      setLoading(false);
    }
  }

  const totalSamples = useMemo(
    () => tasks.reduce((sum, task) => sum + task.sampleCount, 0),
    [tasks],
  );

  if (loading) {
    return <LoadingState text="正在加载任务列表..." rows={3} />;
  }

  if (error) {
    return <ErrorState title="任务列表加载失败" message={error} onRetry={() => void retryLoadTasks()} />;
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        title="还没有任务"
        description="创建第一个任务后，就可以上传样本并分配标注。"
        action={
          <Button asChild>
            <Link href="/tasks/new">
              <Plus className="h-4 w-4" />
              新建任务
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 border-b">
        <div>
          <CardTitle>生产任务队列</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            共 {tasks.length.toLocaleString()} 个任务，覆盖 {totalSamples.toLocaleString()} 条样本。
          </p>
        </div>
        <Badge variant="outline">Workflow ready</Badge>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>任务</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>样本规模</TableHead>
              <TableHead>提交进度</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => {
              const progress =
                task.sampleCount === 0
                  ? 0
                  : Math.round((task.annotationCount / task.sampleCount) * 100);

              return (
                <TableRow key={task.id}>
                  <TableCell className="max-w-[420px]">
                    <div className="space-y-1">
                      <p className="font-medium">{task.name}</p>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {task.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {task.projectName} · {new Date(task.createdAt).toLocaleDateString("zh-CN")}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <TaskStatusBadge status={task.status} />
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p className="font-medium">{task.sampleCount.toLocaleString()} samples</p>
                      <p className="text-muted-foreground">
                        {task.annotationCount.toLocaleString()} submitted
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="min-w-52">
                    <div className="flex items-center gap-3">
                      <Progress value={progress} />
                      <span className="w-10 text-right text-sm font-medium">{progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/tasks/${task.id}`}>查看详情</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
