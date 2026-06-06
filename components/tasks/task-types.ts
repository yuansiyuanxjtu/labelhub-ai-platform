export type TaskListItem = {
  id: string;
  name: string;
  description: string;
  projectName: string;
  type: string;
  status: string;
  sampleCount: number;
  annotationCount: number;
  createdAt: string;
  updatedAt: string;
};

export type TaskDetail = TaskListItem & {
  instruction: string;
  reviewRubric: string;
  formSchema: string;
  currentFormSchemaVersion: {
    id: string;
    version: number;
    createdAt: string;
    changeNote: string | null;
  } | null;
  exportJobCount: number;
  samples: Array<{
    id: string;
    externalId: string | null;
    rawData: string;
    status: string;
    assignedTo: {
      name: string;
      email: string;
    } | null;
  }>;
  auditLogs?: Array<{
    id: string;
    actorId: string | null;
    actorName: string | null;
    action: string;
    entityType: string;
    entityId: string;
    beforeState: Record<string, unknown> | null;
    afterState: Record<string, unknown> | null;
    metadata: Record<string, unknown> | null;
    createdAt: string;
  }>;
};
