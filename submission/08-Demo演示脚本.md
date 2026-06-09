# LabelHub Demo 演示说明

本文档面向比赛评委说明 LabelHub Demo 视频的覆盖范围、演示流程和技术重点。视频文件托管位置见 `submission/video/demo-video-link.md`。

- 视频时长：约 5 分钟左右，以 GitHub Release 附件实际播放时长为准。
- 覆盖范围：任务创建、动态表单配置、标注员标注、QualityGuard AI 预审、人工审核和数据导出。
- 覆盖角色：任务负责人、标注员、审核员。
- Demo 目标：展示 LabelHub 如何将大模型训练数据生产中的多角色协作、质量控制和数据导出串成一条可追踪的 human-in-the-loop 工作流。

## 1. Demo 目标

本视频用于展示 LabelHub 从任务创建、动态标注、AI 预审、人工审核到数据导出的完整数据生产链路。演示重点不只是页面 CRUD，而是说明平台如何通过动态表单、通用样本展示、结构化 AI 质检、状态机和审计日志，支撑多类型大模型训练与评测数据生产。

当前版本是比赛 Demo 和工程样板，默认使用本地 mock 数据与 mock AI provider，便于评委稳定复现主链路。

## 2. 角色说明

- 任务负责人：负责创建任务、选择任务模板、配置动态表单、维护标注说明和 AI 预审 rubric。
- 标注员：负责查看分配给自己的样本，基于任务 `formSchema` 填写动态标注表单并提交 annotation。
- 审核员：负责查看 QualityGuard AI 预审结果，结合原始样本、标注结果和 rubric evidence 做人工复核。

## 3. 演示流程概览

视频中的主要流程如下：

1. Dashboard 质量看板概览。
2. Demo Mode 初始化演示数据。
3. 任务管理与任务模板查看。
4. 新建任务与动态 `formSchema` 配置。
5. 标注员工作台完成样本标注。
6. QualityGuard Agent 自动预审。
7. 人工审核工作台完成复核。
8. 数据导出页面生成 JSON、CSV、JSONL 或 OpenAI JSONL。
9. 技术亮点总结。

## 4. 分阶段演示说明

### 4.1 Dashboard 质量看板

该阶段展示 `/dashboard` 页面。评委可以看到总任务数、总样本数、已标注样本数、待审核样本数、AI 高风险样本数、人工通过率和可导出样本数。

该页面解决的问题是让任务负责人快速了解数据生产质量和流程进度。系统在此处体现了质量看板能力，包括样本状态分布、AI 风险等级分布、最近任务进度、标注员工作量排行和最近审核记录。

### 4.2 Demo Mode 初始化演示数据

该阶段展示 `/demo` 页面。系统提供 Reset demo data、Load demo task、Start as Annotator 和 Start as Reviewer 等入口，用于快速生成和进入比赛演示链路。

该流程说明当前项目支持稳定的本地演示数据初始化。Demo Mode 会生成客服问答质量评估、RAG 回答事实性评估和 Agent 工具调用轨迹评估三类任务，并包含样本、部分 annotation、部分 AI review 和部分 human review。

### 4.3 任务管理与任务模板

该阶段展示 `/tasks` 和 `/tasks/new` 页面。评委可以看到任务队列、任务状态、样本规模、提交进度和创建任务入口。

该页面解决的问题是让任务负责人统一管理不同类型的数据生产任务。系统提供内置任务模板，包括 LLM 回答质量评估、RAG 事实性评估和 Agent 工具调用轨迹评估。模板用于初始化任务说明、AI 预审规则和动态表单 schema，但不会污染通用的表单渲染组件。

### 4.4 动态 formSchema 配置

该阶段展示任务创建和任务详情中的表单配置能力。评委可以看到任务负责人配置字段类型、必填项、帮助说明、默认值、校验规则，并通过实时预览和 JSON 查看模式检查 schema。

该流程体现了 LabelHub 的动态表单引擎：标注页面不硬编码具体业务字段，而是完全由 `Task.formSchema` 渲染。系统还通过 `FormSchemaVersion` 记录表单版本，避免任务负责人修改表单后影响历史标注。

### 4.5 标注员工作台

该阶段展示 `/annotate` 页面。页面采用三栏布局：左侧是样本列表，中间是原始样本数据，右侧是动态标注表单。

评委可以看到样本 rawData 通过通用 `SampleDataViewer` 展示，支持任意 JSON 对象、数组、字符串、数字、布尔值和嵌套结构，不绑定客服 QA、RAG 或 Agent trace 中的某个固定字段。右侧表单由当前任务的 `formSchema` 驱动，并在提交时校验 required 字段和字段类型。

该流程说明标注员可以先保存草稿，也可以提交标注。提交后系统会更新 Sample 和 Annotation 状态，并记录提交时使用的 schema version。

### 4.6 QualityGuard Agent 自动预审

该阶段展示标注提交后的 AI 预审能力。QualityGuard Agent 的输入包括 task instruction、reviewRubric、formSchema、sample rawData 和 annotationData。

系统在此处体现结构化 AI 质检能力：Agent 输出严格 JSON，包含 `score`、`riskLevel`、`issues`、`suggestion`、`comment`、`confidence` 和 `rubricEvidence`。当前 Demo 默认使用 `MockProvider`，规则基于必填缺失、类型不匹配、低评分、短文本说明和通用风险关键词，保证演示稳定且不依赖真实 API。

### 4.7 人工审核工作台

该阶段展示 `/review` 页面。页面同样采用三栏布局：左侧是待审核样本列表，中间展示原始样本和标注结果，右侧展示 AI 预审结果和人工审核表单。

评委可以看到风险等级、AI 建议、问题类型、rubric evidence、confidence、provider 和 fallback 状态。审核员可以基于这些信息做出通过、退回重标或提交仲裁的最终决策。

该流程说明 LabelHub 采用 human-in-the-loop 审核方式：AI 负责辅助质检和风险提示，人工审核员负责最终质量决策。审核动作会通过工作流状态机更新 Sample 状态，并写入审计日志。

### 4.8 数据导出

该阶段展示 `/exports` 页面。评委可以看到任务选择、导出格式选择、导出选项和前 3 条数据预览。

该页面解决的问题是把审核通过的数据转化为可用于训练、评测和复盘的格式。当前支持 JSON、CSV、JSONL 和 OpenAI fine-tuning style JSONL。导出默认只包含 `APPROVED` 样本，并可选择是否包含 AI 预审结果、人工审核结果和 task metadata。

该流程说明导出操作会生成 `ExportJob` 记录，并通过状态机将已导出的样本流转到 `EXPORTED`。

## 5. 核心技术亮点

- 动态表单引擎：`FormRenderer` 完全基于 `Task.formSchema` 渲染，支持多字段类型、required、helpText、defaultValue 和 validation。
- 通用 rawData 展示：`SampleDataViewer` 支持任意 JSON 样本数据，不绑定固定业务字段。
- QualityGuard Agent：基于任务说明、rubric、formSchema、rawData 和 annotationData 生成结构化 AI 预审结果。
- Human-in-the-loop 审核流：AI 提供风险提示和证据，人工审核员做最终决策。
- 工作流状态机：集中管理 Sample 状态流转，避免页面和 API 中散落硬编码状态变更。
- AuditLog 审计留痕：记录任务、标注、AI 预审、人工审核和导出等关键操作。
- 多格式数据导出：支持 JSON、CSV、JSONL 和 OpenAI fine-tuning style JSONL。
- Mock Provider 保证演示稳定：默认不调用真实模型 API，也不依赖外部网络服务。

## 6. 复现方式

如果评委希望复现 Demo，可以参考以下文档：

- `submission/05-本地启动指南.md`
- `submission/06-演示环境说明.md`
- `README.md`

推荐本地复现流程：

1. 安装依赖并配置 `.env`。
2. 执行 Prisma generate、migrate 和 seed。
3. 启动 Next.js 开发服务。
4. 进入 `/demo` 重置演示数据。
5. 按照 Dashboard、任务创建、标注、审核、导出的顺序体验主链路。

## 7. 当前演示边界

- 当前默认使用 mock AI provider，保证演示稳定，不调用真实模型 API。
- 当前提交版本以本地完整运行和 GitHub Release 演示视频复现为主。
- 线上 serverless 环境对 SQLite 持久化支持有限，线上部署建议使用 Vercel + PostgreSQL，具体步骤见 `submission/06-演示环境说明.md`。
- 当前 RBAC 是 mock 角色切换，没有接入真实登录系统。
- 当前版本尚未实现批量文件上传、异步导出队列、真实 OpenAI provider 调用和完整团队管理。
