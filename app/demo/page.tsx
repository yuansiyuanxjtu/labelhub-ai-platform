"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DatabaseZap, Play, RotateCcw, ShieldCheck, Tags } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { can } from "@/lib/auth/permissions";
import type { AppRole } from "@/lib/auth/permissions";

export default function DemoPage() {
  const router = useRouter();
  const [resetting, setResetting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [firstTaskId, setFirstTaskId] = useState("");
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

  async function switchRole(nextRole: AppRole) {
    setError("");
    try {
      const response = await fetch("/api/auth/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      if (!response.ok) {
        throw new Error("角色切换失败");
      }
      setRole(nextRole);
      setNotice(`已切换为 ${nextRole}`);
      router.refresh();
    } catch (switchError) {
      setError(switchError instanceof Error ? switchError.message : "角色切换失败");
    }
  }

  async function resetDemoData() {
    setResetting(true);
    setNotice("");
    setError("");

    try {
      const response = await fetch("/api/demo/reset", {
        method: "POST",
      });
      const data = (await response.json()) as {
        taskIds?: string[];
        taskCount?: number;
        sampleCount?: number;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(data.message ?? "Reset demo data failed");
      }

      setFirstTaskId(data.taskIds?.[0] ?? "");
      setNotice(`已重置 Demo 数据：${data.taskCount ?? 0} 个任务，${data.sampleCount ?? 0} 条样本。`);
      router.refresh();
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Reset demo data failed");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Demo Mode</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          一键生成比赛演示数据，覆盖任务配置、动态标注、QualityGuard AI 预审、人工审核和数据导出。
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>切换演示角色</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <select
            className="h-10 min-w-56 rounded-md border border-input bg-background px-3 text-sm"
            value={role}
            onChange={(event) => void switchRole(event.target.value as AppRole)}
          >
            <option value="ADMIN">ADMIN</option>
            <option value="TASK_OWNER">TASK_OWNER</option>
            <option value="ANNOTATOR">ANNOTATOR</option>
            <option value="REVIEWER">REVIEWER</option>
          </select>
          <p className="text-sm text-muted-foreground">
            切换后 API 和页面按钮会根据角色权限生效。
          </p>
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ActionCard
          title="Reset demo data"
          description="重置数据库并生成 3 个任务模板、30 条样本和完整链路数据。"
          icon={RotateCcw}
        >
          <Button
            onClick={() => void resetDemoData()}
            disabled={resetting || !can(role, "demo:reset")}
          >
            <RotateCcw className="h-4 w-4" />
            {resetting ? "Resetting" : "Reset demo data"}
          </Button>
        </ActionCard>

        <ActionCard
          title="Load demo task"
          description="打开第一个 Demo 任务，展示任务配置和动态表单能力。"
          icon={DatabaseZap}
        >
          <Button asChild variant="outline">
            <Link href={firstTaskId ? `/tasks/${firstTaskId}` : "/tasks"}>
              <Play className="h-4 w-4" />
              Load demo task
            </Link>
          </Button>
        </ActionCard>

        <ActionCard
          title="Start as Annotator"
          description="进入标注员工作台，体验样本数据和 schema 驱动表单。"
          icon={Tags}
        >
          <Button asChild variant="outline">
            <Link href="/annotate">
              <Tags className="h-4 w-4" />
              Start as Annotator
            </Link>
          </Button>
        </ActionCard>

        <ActionCard
          title="Start as Reviewer"
          description="进入人工审核工作台，查看 AI 预审证据并做审核决策。"
          icon={ShieldCheck}
        >
          <Button asChild variant="outline">
            <Link href="/review">
              <ShieldCheck className="h-4 w-4" />
              Start as Reviewer
            </Link>
          </Button>
        </ActionCard>
      </section>

      {notice ? (
        <p className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm text-primary">
          {notice}
        </p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>演示建议顺序</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {[
            "1. Reset demo data",
            "2. Load demo task 查看任务与表单",
            "3. Start as Annotator 提交标注",
            "4. 在标注后触发 AI 预审 API",
            "5. Start as Reviewer 完成人工审核",
            "6. 到 /exports 导出 JSONL",
          ].map((step) => (
            <div key={step} className="rounded-md border p-3 text-sm">
              {step}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ActionCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: typeof RotateCcw;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-secondary">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="min-h-12 text-sm leading-6 text-muted-foreground">{description}</p>
        {children}
      </CardContent>
    </Card>
  );
}
