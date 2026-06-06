import { PageHeader } from "@/components/layout/page-header";
import { TaskCreateAction } from "@/components/tasks/task-create-action";
import { TasksList } from "@/components/tasks/tasks-list";

export default function TasksPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Task Operations"
        title="任务管理"
        description="创建任务、配置动态标注表单与 AI 预审标准，并跟踪样本从标注到审核导出的生产进度。"
        actions={<TaskCreateAction />}
      />

      <TasksList />
    </div>
  );
}
