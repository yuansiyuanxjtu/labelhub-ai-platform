export type AppRole = "ADMIN" | "TASK_OWNER" | "ANNOTATOR" | "REVIEWER";

export type AppAction =
  | "task:create"
  | "task:view"
  | "task:update_schema"
  | "sample:assign"
  | "annotation:view_assigned"
  | "annotation:submit"
  | "review:view"
  | "review:submit"
  | "ai_review:run"
  | "export:create"
  | "demo:reset";

type RuleMap = Record<AppRole, Set<AppAction>>;

const rules: RuleMap = {
  ADMIN: new Set<AppAction>([
    "task:create",
    "task:view",
    "task:update_schema",
    "sample:assign",
    "annotation:view_assigned",
    "annotation:submit",
    "review:view",
    "review:submit",
    "ai_review:run",
    "export:create",
    "demo:reset",
  ]),
  TASK_OWNER: new Set<AppAction>([
    "task:create",
    "task:view",
    "task:update_schema",
    "sample:assign",
    "export:create",
    "ai_review:run",
  ]),
  ANNOTATOR: new Set<AppAction>(["annotation:view_assigned", "annotation:submit"]),
  REVIEWER: new Set<AppAction>(["review:view", "review:submit", "ai_review:run"]),
};

export function can(role: AppRole, action: AppAction) {
  return rules[role].has(action);
}

export const roleLabelMap = {
  ADMIN: "管理员",
  TASK_OWNER: "任务负责人",
  ANNOTATOR: "标注员",
  REVIEWER: "审核员",
} as const satisfies Record<AppRole, string>;

export const roleShortLabelMap = {
  ADMIN: "ADMIN",
  TASK_OWNER: "OWNER",
  ANNOTATOR: "ANNOTATOR",
  REVIEWER: "REVIEWER",
} as const satisfies Record<AppRole, string>;
