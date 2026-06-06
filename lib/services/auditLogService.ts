import { prisma } from "@/lib/prisma";

type JsonRecord = Record<string, unknown>;

type AuditLogState = JsonRecord | null | undefined;

type CreateAuditLogInput = {
  actorId?: string | null;
  actorName?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  beforeState?: AuditLogState;
  afterState?: AuditLogState;
  metadata?: JsonRecord;
};

export type AuditLogItem = {
  id: string;
  actorId: string | null;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string;
  beforeState: JsonRecord | null;
  afterState: JsonRecord | null;
  metadata: JsonRecord | null;
  createdAt: string;
};

export async function createAuditLog(input: CreateAuditLogInput) {
  return prisma.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      actorName: input.actorName ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      beforeState: serializeJson(input.beforeState),
      afterState: serializeJson(input.afterState),
      metadata: serializeJson(input.metadata),
    },
  });
}

export async function getAuditLogsByEntity(entityType: string, entityId: string, limit = 30) {
  const logs = await prisma.auditLog.findMany({
    where: {
      entityType,
      entityId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });

  return logs.map(toAuditLogItem);
}

export async function getRecentAuditLogs(limit = 30) {
  const logs = await prisma.auditLog.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });

  return logs.map(toAuditLogItem);
}

function toAuditLogItem(log: {
  id: string;
  actorId: string | null;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string;
  beforeState: string | null;
  afterState: string | null;
  metadata: string | null;
  createdAt: Date;
}): AuditLogItem {
  return {
    id: log.id,
    actorId: log.actorId,
    actorName: log.actorName,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    beforeState: parseJsonRecord(log.beforeState),
    afterState: parseJsonRecord(log.afterState),
    metadata: parseJsonRecord(log.metadata),
    createdAt: log.createdAt.toISOString(),
  };
}

function serializeJson(value: AuditLogState | JsonRecord) {
  if (!value) {
    return null;
  }

  return JSON.stringify(sanitize(value));
}

function parseJsonRecord(value: string | null): JsonRecord | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return typeof parsed === "object" && parsed !== null ? (parsed as JsonRecord) : null;
  } catch {
    return null;
  }
}

function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitize);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const source = value as JsonRecord;
  const target: JsonRecord = {};

  for (const [key, raw] of Object.entries(source)) {
    const keyLower = key.toLowerCase();
    if (
      keyLower.includes("api_key") ||
      keyLower.includes("apikey") ||
      keyLower.includes("token") ||
      keyLower.includes("password") ||
      keyLower.includes("secret")
    ) {
      target[key] = "[REDACTED]";
      continue;
    }

    target[key] = sanitize(raw);
  }

  return target;
}
