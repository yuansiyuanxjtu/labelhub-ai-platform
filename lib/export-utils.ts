type ExportFormat = "JSON" | "CSV" | "JSONL";

export type ExportRecord = {
  task: {
    id: string;
    name: string;
    description: string;
    instruction: string;
    reviewRubric: string;
    formSchema: string;
  };
  sample: {
    id: string;
    externalId: string | null;
    rawData: unknown;
  };
  annotationData: unknown;
  aiReview: unknown;
  humanReview: unknown;
};

export function buildExportContent(records: ExportRecord[], format: ExportFormat) {
  if (format === "JSON") {
    return {
      content: JSON.stringify({ exportedAt: new Date().toISOString(), records }, null, 2),
      mimeType: "application/json",
      extension: "json",
    };
  }

  if (format === "JSONL") {
    return {
      content: records.map((record) => JSON.stringify(record)).join("\n"),
      mimeType: "application/x-ndjson",
      extension: "jsonl",
    };
  }

  return {
    content: toCsv(records),
    mimeType: "text/csv",
    extension: "csv",
  };
}

export function parseJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function toCsv(records: ExportRecord[]) {
  const headers = [
    "task_id",
    "task_name",
    "sample_id",
    "sample_external_id",
    "rawData",
    "annotationData",
    "aiReview",
    "humanReview",
  ];
  const rows = records.map((record) => [
    record.task.id,
    record.task.name,
    record.sample.id,
    record.sample.externalId ?? "",
    JSON.stringify(record.sample.rawData),
    JSON.stringify(record.annotationData),
    JSON.stringify(record.aiReview),
    JSON.stringify(record.humanReview),
  ]);

  return [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
}

function escapeCsv(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}
