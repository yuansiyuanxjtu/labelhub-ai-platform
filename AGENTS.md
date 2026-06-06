# AGENTS.md

Codex 后续在本项目中执行任何开发任务前，必须先阅读本文件和 `PROJECT_CONTEXT.md`，再开始分析、修改或验证。

## 1. 项目定位

LabelHub 是面向大模型训练数据生产的数据标注平台。

## 2. 核心链路

任务创建 -> 动态表单配置 -> 样本上传 -> 人工标注 -> AI 预审 -> 人工审核 -> 数据导出。

## 3. 核心原则

- 不允许硬编码标注字段。
- 所有标注页面必须由 `Task.formSchema` 渲染。
- AI 预审必须输出结构化 JSON。
- 工作流状态必须集中管理。
- API Key 必须来自环境变量。
- 修改代码后必须运行 `lint` 和 `typecheck`。

## 4. 技术栈

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Prisma
- SQLite / PostgreSQL

## 5. 代码规范

- 业务类型集中放在 `/types`。
- 数据库访问集中放在 `/lib/db` 或 server actions。
- Agent 逻辑集中放在 `/lib/agents`。
- 动态表单组件集中放在 `/components/form-builder`。
- 页面组件尽量保持轻量，避免承载复杂业务逻辑。

## 6. 验证命令

每次修改后运行：

```bash
npm run lint
npm run typecheck
```

如项目存在测试脚本，还需要运行：

```bash
npm run test
```
