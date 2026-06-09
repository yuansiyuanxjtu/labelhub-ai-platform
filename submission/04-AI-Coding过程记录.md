# AI Coding 过程记录

## 协作方式

本项目采用 AI 辅助开发方式，由 Codex 在同一工作区中完成代码阅读、实现、验证和文档整理。每轮开发遵循 `AGENTS.md` 与 `PROJECT_CONTEXT.md` 中的工程原则。

## 主要阶段

1. 项目初始化：创建 Next.js App Router 项目结构、基础 layout、sidebar、顶部导航和 README。
2. 数据建模：设计 Prisma schema，覆盖 User、Project、Task、Sample、Annotation、AiReview、HumanReview、ExportJob 等模型，并加入 seed 数据。
3. 任务管理：实现任务列表、创建任务、任务详情和 API。
4. 动态表单：实现 `FormRenderer` 与 `FormSchemaEditor`，让标注页由 `Task.formSchema` 驱动。
5. 标注工作台：实现样本列表、原始数据展示、草稿保存和提交标注。
6. AI 预审：实现 QualityGuard Agent、provider 抽象、mock provider 和结构化预审结果。
7. 人工审核：实现审核队列、AI 结果展示、人工审核操作和状态流转。
8. 数据导出与 Dashboard：实现导出服务、导出页面、质量看板和多格式导出。
9. 通用化修复：去除客服 QA 专用字段读取，改为任意 JSON rawData 渲染。
10. 工程化增强：增加 Zod 校验、service 分层、审计日志、Agent 可靠性、prompt 模板、formSchema 版本管理、任务模板和轻量 RBAC。
11. UI 与可维护性优化：优化 Review/Annotate 三栏布局，拆分组件，补齐 loading、empty、error 状态。
12. 交付打包：创建 `submission/` 目录和比赛提交材料。

## 验证方式

开发过程中按要求运行：

```bash
npm run lint
npm run typecheck
npm run test
```

本次交付打包阶段不修改核心业务代码，仅新增提交材料。

## AI 辅助开发边界

AI 主要用于代码生成、重构建议、测试补齐和文档整理。涉及真实生产环境的认证、真实 LLM 调用、部署、监控和异步队列等能力没有被夸大为已实现功能。

