export const metrics = [
  { label: "活跃任务", value: "12", change: "+3 本周" },
  { label: "待标注样本", value: "8,420", change: "覆盖 6 个数据集" },
  { label: "AI 预审通过率", value: "91.6%", change: "mock scorer" },
  { label: "人工审核队列", value: "327", change: "P0: 42 条" },
];

export const tasks = [
  {
    id: "task-safety-dialogue",
    name: "安全对话偏好标注",
    type: "Pairwise Preference",
    owner: "Nora Chen",
    status: "进行中",
    progress: 68,
    samples: 3600,
    reviewers: 4,
  },
  {
    id: "task-finance-qa",
    name: "金融问答事实性审核",
    type: "Fact QA",
    owner: "Alex Lin",
    status: "审核中",
    progress: 82,
    samples: 1250,
    reviewers: 2,
  },
  {
    id: "task-code-eval",
    name: "代码解释质量评估",
    type: "Rubric Scoring",
    owner: "Mia Zhang",
    status: "草稿",
    progress: 15,
    samples: 980,
    reviewers: 3,
  },
];

export const annotationFields = [
  { label: "答案完整性", type: "单选", value: "完整 / 部分 / 不完整" },
  { label: "事实错误", type: "多选", value: "时间、实体、数值、引用" },
  { label: "标注说明", type: "文本", value: "记录判断依据" },
];

export const reviewItems = [
  { id: "REV-2048", task: "金融问答事实性审核", risk: "高", aiScore: 0.42 },
  { id: "REV-2049", task: "安全对话偏好标注", risk: "中", aiScore: 0.73 },
  { id: "REV-2050", task: "代码解释质量评估", risk: "低", aiScore: 0.91 },
];

export const exports = [
  { name: "safety_dialogue_v3.jsonl", rows: 2400, format: "JSONL", status: "已生成" },
  { name: "finance_factqa_review.csv", rows: 780, format: "CSV", status: "生成中" },
  { name: "code_eval_rubric.parquet", rows: 430, format: "Parquet", status: "待配置" },
];
