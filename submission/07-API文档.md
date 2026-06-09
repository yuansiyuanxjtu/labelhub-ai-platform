# API 文档

本文档基于当前真实存在的 `app/api/**` 路由生成。没有实现的接口不在本文档中记录。

## 通用说明

- Base URL：`http://localhost:3000`
- 当前认证方式：本地 mock 当前用户与 mock RBAC。
- 核心写接口多使用统一响应结构 `{ ok, data }` / `{ ok, error }`。
- 部分读接口仍保持页面兼容响应，例如 `/api/review`、`/api/dashboard`、`/api/annotate/samples`。

统一成功响应示例：

```json
{
  "ok": true,
  "data": {}
}
```

统一错误响应示例：

```json
{
  "ok": false,
  "error": {
    "message": "Invalid request",
    "details": [
      {
        "path": "name",
        "message": "任务名称不能为空",
        "code": "too_small"
      }
    ]
  }
}
```

## Task

### 1. 获取任务列表

- Method：`GET`
- Path：`/api/tasks`
- 功能说明：返回当前用户可见的任务列表。
- 权限要求：`task:view`。`ADMIN` 可查看全部任务，`TASK_OWNER` 可查看自己拥有的任务。

Request 示例：

```http
GET /api/tasks
```

Response 示例：

```json
{
  "ok": true,
  "data": {
    "tasks": [
      {
        "id": "task_123",
        "name": "RAG 回答事实性评估",
        "description": "评估 RAG 回答是否忠于检索材料",
        "projectName": "Demo Project",
        "type": "QA_QUALITY",
        "status": "DRAFT",
        "instruction": "请根据任务说明完成标注",
        "reviewRubric": "{\"rules\":[\"事实一致性\"]}",
        "formSchema": "{\"fields\":[]}",
        "sampleCount": 10,
        "annotationCount": 4,
        "createdAt": "2026-06-08T00:00:00.000Z",
        "updatedAt": "2026-06-08T00:00:00.000Z"
      }
    ]
  }
}
```

错误响应示例：

```json
{
  "ok": false,
  "error": {
    "message": "Forbidden"
  }
}
```

### 2. 创建任务

- Method：`POST`
- Path：`/api/tasks`
- 功能说明：创建任务，并生成初始 `FormSchemaVersion` 与审计日志。
- 权限要求：`task:create`。当前 `ADMIN`、`TASK_OWNER` 具备权限。

Request 示例：

```json
{
  "name": "LLM 回答质量评估",
  "description": "用于评估模型回答质量",
  "instruction": "请阅读样本并按 rubric 完成标注。",
  "reviewRubric": "{\"rules\":[\"准确性\",\"完整性\",\"表达质量\"]}",
  "formSchema": "{\"fields\":[{\"id\":\"quality_score\",\"label\":\"质量评分\",\"type\":\"rating\",\"required\":true,\"min\":1,\"max\":5}]}"
}
```

Response 示例：

```json
{
  "ok": true,
  "data": {
    "task": {
      "id": "task_123"
    }
  }
}
```

错误响应示例：

```json
{
  "ok": false,
  "error": {
    "message": "Invalid request",
    "details": [
      {
        "path": "formSchema",
        "message": "默认表单 schema 不能为空",
        "code": "too_small"
      }
    ]
  }
}
```

### 3. 获取任务详情

- Method：`GET`
- Path：`/api/tasks/[id]`
- 功能说明：返回任务详情、样本摘要、当前 formSchema 版本和任务审计日志。
- 权限要求：`task:view`。非 `ADMIN` 用户只能访问自己拥有的任务。

Request 示例：

```http
GET /api/tasks/task_123
```

Response 示例：

```json
{
  "ok": true,
  "data": {
    "task": {
      "id": "task_123",
      "name": "RAG 回答事实性评估",
      "description": "评估 RAG 回答是否忠于检索材料",
      "projectName": "Demo Project",
      "type": "QA_QUALITY",
      "status": "DRAFT",
      "instruction": "请根据任务说明完成标注",
      "reviewRubric": "{\"rules\":[\"事实一致性\"]}",
      "formSchema": "{\"fields\":[]}",
      "sampleCount": 10,
      "annotationCount": 4,
      "exportJobCount": 1,
      "currentFormSchemaVersion": {
        "id": "schema_version_1",
        "version": 1,
        "createdAt": "2026-06-08T00:00:00.000Z",
        "changeNote": "Initial schema"
      },
      "samples": [
        {
          "id": "sample_123",
          "externalId": "RAG-001",
          "rawData": "{\"question\":\"...\"}",
          "status": "ASSIGNED",
          "assignedTo": {
            "name": "Mia Zhang",
            "email": "mia@example.com"
          }
        }
      ],
      "auditLogs": []
    }
  }
}
```

错误响应示例：

```json
{
  "ok": false,
  "error": {
    "message": "Task not found"
  }
}
```

### 4. 更新任务 formSchema

- Method：`PATCH`
- Path：`/api/tasks/[id]`
- 功能说明：更新任务 `formSchema`，创建新的 `FormSchemaVersion`，并记录审计日志。
- 权限要求：`task:update_schema`。当前 `ADMIN`、`TASK_OWNER` 具备权限。

Request 示例：

```json
{
  "formSchema": "{\"fields\":[{\"id\":\"quality_score\",\"label\":\"质量评分\",\"type\":\"rating\",\"required\":true,\"min\":1,\"max\":5}]}"
}
```

Response 示例：

```json
{
  "ok": true,
  "data": {
    "task": {
      "id": "task_123",
      "formSchema": "{\"fields\":[...]}",
      "currentFormSchemaVersionId": "schema_version_2",
      "currentFormSchemaVersion": 2,
      "updatedAt": "2026-06-08T00:00:00.000Z"
    }
  }
}
```

错误响应示例：

```json
{
  "ok": false,
  "error": {
    "message": "Invalid request",
    "details": [
      {
        "path": "formSchema",
        "message": "formSchema 不能为空",
        "code": "too_small"
      }
    ]
  }
}
```

## Sample

### 1. 获取当前标注员样本

- Method：`GET`
- Path：`/api/annotate/samples`
- 功能说明：返回当前 mock 标注员分配到的样本、任务信息和最近一条自己的 annotation。
- 权限要求：`annotation:view_assigned`。当前 `ADMIN`、`ANNOTATOR` 具备权限。

Request 示例：

```http
GET /api/annotate/samples
```

Response 示例：

```json
{
  "annotator": {
    "id": "user_annotator",
    "name": "Mia Zhang",
    "email": "mia@example.com"
  },
  "samples": [
    {
      "id": "sample_123",
      "taskId": "task_123",
      "externalId": "RAG-001",
      "rawData": "{\"question\":\"什么是产品 A？\"}",
      "status": "ASSIGNED",
      "updatedAt": "2026-06-08T00:00:00.000Z",
      "task": {
        "id": "task_123",
        "name": "RAG 回答事实性评估",
        "instruction": "请完成标注",
        "formSchema": "{\"fields\":[]}"
      },
      "annotation": null
    }
  ]
}
```

错误响应示例：

```json
{
  "message": "Forbidden"
}
```

## Annotation

### 1. 保存草稿或提交标注

- Method：`PUT`
- Path：`/api/annotate/samples/[id]/annotation`
- 功能说明：保存草稿或提交标注。提交时会根据任务 `formSchema` 校验 required 和字段类型，并记录 `formSchemaVersionId`。
- 权限要求：`annotation:submit`。当前 `ADMIN`、`ANNOTATOR` 具备权限。

Request 示例：

```json
{
  "annotationData": {
    "quality_score": 5,
    "risk_level": "LOW",
    "review_note": "回答质量良好，满足任务标准。"
  },
  "action": "submit"
}
```

Response 示例：

```json
{
  "ok": true,
  "data": {
    "sample": {
      "id": "sample_123",
      "status": "SUBMITTED",
      "updatedAt": "2026-06-08T00:00:00.000Z"
    },
    "annotation": {
      "id": "annotation_123",
      "annotationData": "{\"quality_score\":5}",
      "status": "SUBMITTED",
      "formSchemaVersionId": "schema_version_1",
      "submittedAt": "2026-06-08T00:00:00.000Z",
      "updatedAt": "2026-06-08T00:00:00.000Z"
    }
  }
}
```

错误响应示例：

```json
{
  "ok": false,
  "error": {
    "message": "Invalid request",
    "details": {
      "quality_score": "质量评分为必填项"
    }
  }
}
```

## AI Review

### 1. 触发 QualityGuard AI 预审

- Method：`POST`
- Path：`/api/annotations/[id]/ai-review`
- 功能说明：对已提交 annotation 触发 QualityGuard Agent 预审，写入 `AiReview`，更新 Annotation 与 Sample 状态，并记录审计日志。
- 权限要求：`ai_review:run`。当前 `ADMIN`、`TASK_OWNER`、`REVIEWER` 具备权限。

Request 示例：

```json
{}
```

Response 示例：

```json
{
  "ok": true,
  "data": {
    "aiReview": {
      "id": "ai_review_123",
      "annotationId": "annotation_123",
      "score": 0.86,
      "riskLevel": "MEDIUM",
      "issues": ["文本理由过短"],
      "suggestion": "HUMAN_REVIEW",
      "comment": "QualityGuard Agent 基于 rubric 发现风险，建议人工复核。",
      "confidence": 0.74,
      "rubricEvidence": [
        {
          "criterion": "Required field completeness",
          "result": "PASS",
          "reason": "所有必填字段均已填写。"
        }
      ],
      "updatedAt": "2026-06-08T00:00:00.000Z"
    }
  }
}
```

错误响应示例：

```json
{
  "ok": false,
  "error": {
    "message": "Only submitted annotations can be reviewed by QualityGuard Agent"
  }
}
```

## Human Review

### 1. 获取审核队列

- Method：`GET`
- Path：`/api/review`
- 功能说明：返回已完成 AI 预审、待人工审核或已经人工审核的 annotation 列表。
- 权限要求：`review:view`。当前 `ADMIN`、`REVIEWER` 具备权限。

Request 示例：

```http
GET /api/review
```

Response 示例：

```json
{
  "items": [
    {
      "id": "annotation_123",
      "status": "NEEDS_HUMAN_REVIEW",
      "annotationData": "{\"quality_score\":3}",
      "formSchemaVersion": {
        "id": "schema_version_1",
        "version": 1
      },
      "task": {
        "id": "task_123",
        "name": "RAG 回答事实性评估"
      },
      "sample": {
        "id": "sample_123",
        "externalId": "RAG-001",
        "rawData": "{\"question\":\"...\"}",
        "status": "AI_REVIEWED"
      },
      "annotator": {
        "name": "Mia Zhang",
        "email": "mia@example.com"
      },
      "aiReview": {
        "id": "ai_review_123",
        "score": 0.86,
        "riskLevel": "MEDIUM",
        "issues": ["文本理由过短"],
        "suggestion": "HUMAN_REVIEW",
        "confidence": 0.74,
        "rubricEvidence": [],
        "run": {
          "provider": "mock",
          "fallbackUsed": false,
          "status": "ok"
        },
        "updatedAt": "2026-06-08T00:00:00.000Z"
      },
      "humanReview": null,
      "updatedAt": "2026-06-08T00:00:00.000Z"
    }
  ]
}
```

错误响应示例：

```json
{
  "message": "Forbidden"
}
```

### 2. 提交人工审核

- Method：`POST`
- Path：`/api/review/[id]`
- 功能说明：提交人工审核结果，创建 `HumanReview`，并将 Sample 状态更新为 `APPROVED`、`RETURNED` 或 `ESCALATED`。
- 权限要求：`review:submit`。当前 `ADMIN`、`REVIEWER` 具备权限。

Request 示例：

```json
{
  "decision": "APPROVED",
  "comment": "审核通过，标注结果满足任务标准。"
}
```

Response 示例：

```json
{
  "ok": true,
  "data": {
    "annotation": {
      "id": "annotation_123",
      "status": "APPROVED",
      "updatedAt": "2026-06-08T00:00:00.000Z"
    },
    "sample": {
      "id": "sample_123",
      "status": "APPROVED",
      "updatedAt": "2026-06-08T00:00:00.000Z"
    },
    "humanReview": {
      "id": "human_review_123",
      "decision": "APPROVED",
      "comment": "审核通过，标注结果满足任务标准。",
      "reviewedAt": "2026-06-08T00:00:00.000Z",
      "reviewer": {
        "name": "Demo Reviewer",
        "email": "reviewer@example.com"
      }
    }
  }
}
```

错误响应示例：

```json
{
  "ok": false,
  "error": {
    "message": "Invalid request",
    "details": [
      {
        "path": "decision",
        "message": "Invalid enum value",
        "code": "invalid_enum_value"
      }
    ]
  }
}
```

## Export

### 1. 获取导出概览

- Method：`GET`
- Path：`/api/exports`
- 功能说明：返回可导出任务列表和最近导出记录。
- 权限要求：`export:create`。当前 `ADMIN`、`TASK_OWNER` 具备权限。

Request 示例：

```http
GET /api/exports
```

Response 示例：

```json
{
  "ok": true,
  "data": {
    "tasks": [
      {
        "id": "task_123",
        "name": "RAG 回答事实性评估",
        "approvedCount": 3
      }
    ],
    "jobs": [
      {
        "id": "export_job_123",
        "name": "rag-export-2026-06-08.jsonl",
        "taskName": "RAG 回答事实性评估",
        "format": "JSONL",
        "status": "COMPLETED",
        "rowCount": 3,
        "createdAt": "2026-06-08T00:00:00.000Z"
      }
    ]
  }
}
```

错误响应示例：

```json
{
  "ok": false,
  "error": {
    "message": "Forbidden"
  }
}
```

### 2. 预览或创建导出

- Method：`POST`
- Path：`/api/exports`
- 功能说明：预览前 3 条导出数据，或创建导出内容。导出默认只包含 `APPROVED` 样本。
- 权限要求：`export:create`。当前 `ADMIN`、`TASK_OWNER` 具备权限。

Request 示例：

```json
{
  "taskId": "task_123",
  "format": "OPENAI_JSONL",
  "includeAiReview": true,
  "includeHumanReview": true,
  "includeTaskMetadata": true,
  "mode": "preview"
}
```

Response 示例：

```json
{
  "ok": true,
  "data": {
    "records": [
      {
        "sampleId": "sample_123",
        "rawData": {
          "question": "..."
        },
        "annotationData": {
          "quality_score": 5
        },
        "taskId": "task_123",
        "taskName": "RAG 回答事实性评估",
        "exportedAt": "2026-06-08T00:00:00.000Z"
      }
    ],
    "content": "{\"messages\":[...]}",
    "rowCount": 1
  }
}
```

错误响应示例：

```json
{
  "ok": false,
  "error": {
    "message": "Invalid request",
    "details": [
      {
        "path": "format",
        "message": "Invalid enum value",
        "code": "invalid_enum_value"
      }
    ]
  }
}
```

## Demo

### 1. 获取 Dashboard 数据

- Method：`GET`
- Path：`/api/dashboard`
- 功能说明：返回 Dashboard 所需的指标、样本状态分布、AI 风险分布、最近任务、标注员工作量和最近审核记录。
- 权限要求：当前代码未对该接口做 RBAC 检查。

Request 示例：

```http
GET /api/dashboard
```

Response 示例：

```json
{
  "metrics": {
    "totalTasks": 3,
    "totalSamples": 30,
    "annotatedCount": 12,
    "pendingReviewCount": 5,
    "approvedSampleCount": 6,
    "highRiskCount": 3,
    "humanPassRate": 72,
    "exportableCount": 6
  },
  "sampleStatusDistribution": [
    {
      "status": "APPROVED",
      "count": 6
    }
  ],
  "aiRiskDistribution": [
    {
      "riskLevel": "HIGH",
      "count": 3
    }
  ],
  "recentTasks": [],
  "annotatorWorkloads": [],
  "recentReviews": [],
  "queues": {
    "submittedCount": 2,
    "aiReviewedCount": 4,
    "needsHumanReviewCount": 3
  }
}
```

错误响应示例：

```json
{
  "message": "Unexpected server error"
}
```

### 2. 重置 Demo 数据

- Method：`POST`
- Path：`/api/demo/reset`
- 功能说明：重置 Demo 数据，生成内置任务、样本、部分标注、AI review 和 human review。
- 权限要求：`demo:reset`。当前 `ADMIN` 具备权限。

Request 示例：

```json
{}
```

Response 示例：

```json
{
  "message": "Demo data reset",
  "tasks": 3,
  "samples": 30
}
```

错误响应示例：

```json
{
  "message": "Forbidden"
}
```

### 3. 获取当前 mock 用户

- Method：`GET`
- Path：`/api/auth/me`
- 功能说明：返回当前 mock 用户。
- 权限要求：无显式 RBAC 检查。

Request 示例：

```http
GET /api/auth/me
```

Response 示例：

```json
{
  "user": {
    "id": "user_admin",
    "name": "Demo Admin",
    "email": "admin@example.com",
    "role": "ADMIN"
  }
}
```

错误响应示例：

```json
{
  "message": "Unexpected server error"
}
```

### 4. 切换当前 mock 角色

- Method：`POST`
- Path：`/api/auth/role`
- 功能说明：切换 Demo 当前角色。用于演示不同角色下的页面和 API 权限。
- 权限要求：无显式 RBAC 检查；请求体 role 由 Zod 校验。

Request 示例：

```json
{
  "role": "REVIEWER"
}
```

Response 示例：

```json
{
  "ok": true
}
```

错误响应示例：

```json
{
  "ok": false,
  "error": {
    "message": "Invalid request",
    "details": [
      {
        "path": "role",
        "message": "Invalid enum value",
        "code": "invalid_enum_value"
      }
    ]
  }
}

```

