# Demo 视频链接

视频文件托管在 GitHub Release：

- [LabelHub Demo Video](https://github.com/yuansiyuanxjtu/labelhub-ai-platform/releases/download/v1.0.0/LabelHub-demo-video.mp4)

## 视频信息

- 托管方式：GitHub Release 附件。
- 视频时长：约 5 分钟左右，以 Release 附件实际播放时长为准。
- 覆盖角色：任务负责人、标注员、审核员。
- 覆盖链路：任务创建与模板选择 -> 动态表单配置 -> 标注员提交标注 -> QualityGuard AI 预审 -> 人工审核 -> 数据导出。
- 复现方式：如果线上环境不可用，评委可以按照 `submission/05-本地启动指南.md` 在本地启动项目，并按 `submission/08-Demo演示脚本.md` 复现完整主链路。

## 视频内容要求

视频时长：约 5 分钟左右。

视频内容包含：

1. Dashboard 质量看板概览。
2. Demo Mode 重置数据与角色切换。
3. 从任务模板创建任务，并展示动态 formSchema。
4. 标注员工作台提交一条标注。
5. 触发 QualityGuard AI 预审，并展示结构化结果。
6. 人工审核工作台完成通过、退回或仲裁。
7. 数据导出页面预览并下载 JSONL 或 OpenAI JSONL。
8. 简要讲解状态机、AuditLog、formSchema versioning 和 mock RBAC。


