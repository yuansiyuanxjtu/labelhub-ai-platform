import { Bot, Braces, FileText, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewTaskForm } from "@/components/tasks/new-task-form";

const steps = [
  { title: "任务描述", icon: FileText, copy: "定义数据范围、质量目标和标注边界。" },
  { title: "动态表单", icon: Braces, copy: "默认 schema 会作为后续样本标注表单的基础。" },
  { title: "AI 预审", icon: Bot, copy: "reviewRubric 用于模拟 AI 质检规则，不接真实模型 API。" },
  { title: "人工审核", icon: ShieldCheck, copy: "审核员按任务标准处理冲突样本和低置信度样本。" },
];

export default function NewTaskPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">新建任务</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          创建任务后会自动跳转到任务详情页，方便继续上传样本与分配标注。
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>任务配置</CardTitle>
          </CardHeader>
          <CardContent>
            <NewTaskForm />
          </CardContent>
        </Card>

        <div className="space-y-4">
          {steps.map((step) => {
            const Icon = step.icon;

            return (
              <Card key={step.title}>
                <CardContent className="flex gap-3 p-4">
                  <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{step.title}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {step.copy}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
