import type { JsonObject, JsonValue, SampleRawData } from "@/types/sample";

export function parseSampleRawData(rawData: string): JsonValue {
  try {
    return normalizeJsonValue(JSON.parse(rawData) as unknown);
  } catch {
    return rawData;
  }
}

export function parseSampleRawObject(rawData: string): SampleRawData {
  const parsed = parseSampleRawData(rawData);

  if (isJsonObject(parsed)) {
    return parsed;
  }

  return {
    value: parsed,
  };
}

export function isJsonObject(value: JsonValue): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isPrimitive(value: JsonValue) {
  return value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

export function isLongText(value: JsonValue) {
  return typeof value === "string" && (value.length > 120 || value.includes("\n"));
}

export function formatPrimitive(value: JsonValue) {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function normalizeJsonValue(value: unknown): JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(normalizeJsonValue);
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        normalizeJsonValue(item),
      ]),
    );
  }

  return String(value);
}
