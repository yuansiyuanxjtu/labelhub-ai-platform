# LabelHub Project Context

Codex 后续每次执行 LabelHub 相关任务前，应先阅读本文件，确认产品定位、核心链路、技术约束和 Demo 场景，再进行代码修改。

## 项目定位

LabelHub 是一个面向大模型训练与 Agent 评测的数据生产平台。

## 核心链路

任务创建 -> 动态表单配置 -> 样本上传 -> 标注员标注 -> AI 预审 -> 人工审核 -> 数据导出

## 核心亮点

1. JSON Schema 驱动的动态标注表单
2. QualityGuard Agent 自动预审
3. 状态机驱动的数据生产工作流
4. 多角色协作
5. JSON/CSV/JSONL 导出

## 技术栈

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Prisma
- SQLite local / PostgreSQL production

## 代码要求

- 不要硬编码业务字段。
- 动态表单必须由 `Task.formSchema` 渲染。
- AI 审核必须输出结构化 JSON。
- API Key 必须来自环境变量。
- 每次修改后运行 `lint` 和 `typecheck`。

## Demo 场景

客服问答质量评估：

- 输入包括 `user_query`、`model_answer`、`reference_answer`。
- 标注维度包括准确性、幻觉风险、合规风险、完整性、表达质量和修改建议。

## 执行提醒

开始任何新任务前：

1. 先阅读本文件。
2. 再查看与任务相关的代码和数据模型。
3. 保持现有产品链路一致，不绕过动态表单、状态机、QualityGuard Agent 或导出流程。
4. 修改完成后运行 `lint` 和 `typecheck`，并在结果中说明验证情况。
