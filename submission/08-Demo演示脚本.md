# Demo 演示脚本

## 视频目标

建议时长：5 到 10 分钟。

这段视频要让评委看到：LabelHub 不是普通 CRUD 后台，而是一条面向大模型训练数据生产的完整工作流。演示覆盖三类角色：

- 任务负责人：创建任务、选择模板、配置动态表单。
- 标注员：查看分配样本、填写动态表单、提交 annotation。
- 审核员：查看 QualityGuard AI 预审、完成人工审核、导出数据。

录屏前建议先进入 `/demo` 点击 `Reset demo data`，保证演示数据处于稳定状态。

## 时间安排

| 时间 | 段落 | 页面 |
| --- | --- | --- |
| 0:00 - 0:50 | 开场与 Dashboard | `/dashboard` |
| 0:50 - 1:30 | Demo Mode 与角色切换 | `/demo` |
| 1:30 - 3:10 | 任务负责人链路 | `/tasks/new`、`/tasks/[id]` |
| 3:10 - 4:40 | 标注员链路 | `/annotate` |
| 4:40 - 6:40 | 审核员链路 | `/review` |
| 6:40 - 8:00 | 数据导出 | `/exports` |
| 8:00 - 9:00 | 工程亮点收束 | `/dashboard` 或 `/tasks/[id]` |

## 0. 录屏准备

当前页面：浏览器打开 `http://localhost:3000`。

要点击什么：

1. 进入 `/demo`。
2. 角色选择保持 `ADMIN`。
3. 点击 `Reset demo data`。
4. 等待重置成功后回到 `/dashboard`。

要讲什么：

“我先重置一份稳定的 Demo 数据。LabelHub 内置了三类任务：客服问答质量评估、RAG 回答事实性评估和 Agent 工具调用轨迹评估，每类任务都包含样本、部分标注、AI 预审和人工审核记录，方便完整演示主链路。”

展示技术亮点：

- Demo Mode 可以一键生成完整演示数据。
- 本地演示使用 `AI_PROVIDER=mock`，不会调用真实模型 API。

## 1. 开场与 Dashboard

当前页面：`/dashboard`

要点击什么：

- 打开左侧导航中的 `工作台`。
- 停留在指标卡片和可视化区域。

要讲什么：

“LabelHub 是一个面向大模型训练数据生产的数据标注平台。它的目标不是只做任务录入，而是把任务配置、动态表单标注、AI 预审、人工审核和数据导出串成一条可以追踪的数据生产链路。Dashboard 这里可以看到总任务数、样本数、已标注样本、待审核样本、AI 高风险样本、人工通过率和可导出样本数。”

展示技术亮点：

- 数据生产质量看板，而不是普通后台首页。
- 样本状态分布、AI 风险等级分布、最近任务进度和审核记录。
- 为后续审核和导出提供整体态势。

## 2. Demo Mode 与角色切换

当前页面：`/demo`

要点击什么：

1. 点击左侧导航 `Demo Mode`。
2. 展示角色选择下拉框。
3. 展示 `Reset demo data`、`Load demo task`、`Start as Annotator`、`Start as Reviewer` 四个操作卡片。

要讲什么：

“为了比赛演示，项目提供了 Demo Mode。这里可以切换 mock 角色，模拟任务负责人、标注员和审核员视角。真实登录系统还没有接入，但 API 和页面已经基于轻量 RBAC 做了权限控制，角色不同，可见按钮和可调用接口也会不同。”

展示技术亮点：

- 轻量 RBAC：`ADMIN`、`TASK_OWNER`、`ANNOTATOR`、`REVIEWER`。
- 一键重置数据，降低演示不确定性。
- 三大角色主链路清晰。

## 3. 任务负责人链路：创建任务与配置表单

当前页面：`/tasks/new`

要点击什么：

1. 从侧边栏点击 `新建任务`。
2. 在 `任务模板` 区域选择一个模板，例如 `RAG 事实性评估` 或 `Agent 工具调用轨迹评估`。
3. 展示模板自动填充的任务名称、描述、instruction、reviewRubric 和 formSchema。
4. 简单修改任务名称，例如加上 “Demo”。
5. 点击创建任务。
6. 创建成功后进入任务详情页。

要讲什么：

“任务负责人不需要从零开始写配置，可以从内置模板创建任务。模板会自动填充任务说明、AI 预审 rubric 和动态表单 schema。这里的关键点是：模板只负责初始化配置，不会污染通用表单渲染逻辑。后续标注页面依然完全由 `Task.formSchema` 渲染。”

展示技术亮点：

- 内置任务模板：LLM 回答质量评估、RAG 事实性评估、Agent 工具调用轨迹评估。
- 任务 instruction 和 reviewRubric 会作为 QualityGuard Agent 的输入。
- 创建任务时会生成初始 `FormSchemaVersion`。

### 3.1 任务详情：动态表单配置

当前页面：`/tasks/[id]`

要点击什么：

1. 切换到表单配置区域。
2. 展示左侧字段编辑和右侧实时预览。
3. 添加或复制一个字段。
4. 打开 required 开关。
5. 展示 JSON 查看模式。
6. 点击保存 formSchema。

要讲什么：

“这是 LabelHub 的核心能力之一：动态表单引擎。任务负责人可以配置字段类型、必填、帮助说明、默认值和校验规则。标注员端不会写死‘准确性’或‘幻觉风险’这类业务字段，而是根据当前任务的 formSchema 动态渲染。”

展示技术亮点：

- `FormSchemaEditor` 支持字段复制、排序、required、helpText、defaultValue、validation、实时预览和 JSON 查看。
- `FormRenderer` 完全基于 schema 渲染。
- formSchema 版本管理避免修改表单后影响历史标注。
- `AuditLog` 会记录 formSchema 更新。

## 4. 标注员链路：查看样本与提交标注

当前页面：`/annotate`

要点击什么：

1. 从 Demo Mode 点击 `Start as Annotator`，或直接进入 `/annotate`。
2. 点击左侧样本列表中的一条样本。
3. 展示中间的原始样本数据。
4. 在右侧动态表单中填写评分、选择项、文本说明等字段。
5. 可先点击 `保存草稿`。
6. 再点击 `提交标注`。

要讲什么：

“现在切到标注员视角。左边是分配给当前标注员的样本列表，中间是样本原始数据，右边是动态表单。这里的原始数据不是固定客服 QA 字段，而是任意 JSON。比如 RAG 任务、Agent trace 任务，都可以用同一个 SampleDataViewer 展示。”

展示技术亮点：

- 三栏标注工作台：样本列表、通用 rawData、动态表单。
- `SampleDataViewer` 支持任意 JSON，不依赖业务字段名。
- 表单提交时根据 `Task.formSchema` 校验 required 和字段类型。
- 保存草稿会进入 `IN_PROGRESS`，提交后 Sample 进入 `SUBMITTED`。
- Annotation 会记录提交时使用的 `formSchemaVersionId`。

## 5. 审核员链路：AI 预审与人工审核

当前页面：`/review`

要点击什么：

1. 从 Demo Mode 点击 `Start as Reviewer`，或进入 `/review`。
2. 点击左侧待审核样本列表中的高风险或中风险样本。
3. 展示中间的 `原始样本` 和 `标注结果`。
4. 展示右侧 `AI 预审结果`：riskLevel、score、confidence、suggestion、issues、rubricEvidence、AI comment。
5. 在人工审核备注中输入一句审核依据。
6. 点击 `通过`、`退回重标` 或 `提交仲裁`。

要讲什么：

“QualityGuard Agent 不直接替代人做最终决策，它先基于任务 instruction、reviewRubric、formSchema、rawData 和 annotationData 做结构化预审。审核员在右侧可以看到风险等级、AI 建议、问题列表和 rubric evidence。最终是否通过，仍由人工审核员决定。”

展示技术亮点：

- QualityGuard Agent 输出结构化 JSON。
- MockProvider 不随机，基于必填缺失、类型不匹配、低评分、短文本说明和风险关键词生成结果。
- AI 预审失败时可 fallback 到规则审核。
- Review 页面展示 provider 和 fallback 状态标签。
- Human-in-the-loop：AI 辅助判断，人工最终确认。
- 人工审核会通过状态机把 Sample 更新为 `APPROVED`、`RETURNED` 或 `ESCALATED`。

## 6. 数据导出

当前页面：`/exports`

要点击什么：

1. 从侧边栏点击 `数据导出`。
2. 选择一个有 approved 样本的任务。
3. 选择导出格式，建议选择 `JSONL` 或 `OpenAI JSONL`。
4. 勾选或取消 `includeAiReview`、`includeHumanReview`、`includeTaskMetadata`。
5. 点击预览，展示前 3 条数据。
6. 点击导出或下载。

要讲什么：

“数据生产链路的最后一步是导出。LabelHub 默认只导出 APPROVED 样本，避免未审核数据流入训练集。导出内容可以包含样本原始数据、annotationData、AI 预审、人工审核和任务元数据。这里还支持 OpenAI fine-tuning style JSONL，方便后续进入训练或评测流水线。”

展示技术亮点：

- 默认只导出 `APPROVED` 样本。
- 支持 JSON、CSV、JSONL、OpenAI fine-tuning style JSONL。
- 导出前预览前 3 条数据。
- 创建 `ExportJob` 记录。
- 导出后通过状态机把 approved 样本流转到 `EXPORTED`。
- 导出操作写入 `AuditLog`。

## 7. 工程亮点收束

当前页面：`/dashboard` 或 `/tasks/[id]`

要点击什么：

1. 回到 `/dashboard` 展示指标变化。
2. 或进入任务详情，展示操作记录区域。

要讲什么：

“总结一下，LabelHub 重点展示的是一套数据生产平台的工程骨架：动态表单让任务通用化，通用 rawData viewer 让样本不绑定具体场景，QualityGuard Agent 做结构化预审，状态机保证流程一致，AuditLog 让关键操作可追踪，多格式导出让数据可以进入训练、评测和复盘流程。当前版本是比赛 Demo，不是完整商业系统，真实登录、生产数据库、真实 LLM provider 和异步导出会作为后续扩展。”

展示技术亮点：

- 动态表单引擎。
- 通用 rawData 展示。
- QualityGuard Agent。
- Human-in-the-loop 审核流。
- 工作流状态机。
- AuditLog 审计日志。
- 多格式导出。
- 核心测试覆盖：状态机、表单校验、Agent、导出服务。

## 截图清单

正式提交前建议放入 `submission/images/`：

1. Dashboard：质量看板首页，包含关键指标和分布区域。
2. Task Builder：`/tasks/new` 模板选择和 `/tasks/[id]` formSchema 编辑器。
3. Annotate：三栏标注工作台，展示样本列表、rawData 和动态表单。
4. Review：三栏审核工作台，展示 AI 预审结果和人工审核表单。
5. Export：导出配置、格式选择、预览前 3 条数据和导出记录。

## 录屏小贴士

- 建议录制前先执行一次 `Reset demo data`。
- 标注环节选择一条状态接近待处理的样本，避免演示时按钮不可用。
- 审核环节优先选择带有 AI review 的样本，最好选择中风险或高风险样本，视觉信息更完整。
- 导出环节选择已有 approved 样本的任务，否则预览会为空。
- 讲解时可以反复强调：Demo 使用 mock provider，不调用真实模型 API。

