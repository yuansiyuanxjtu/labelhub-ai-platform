import {
  createExport as createDatasetExport,
  getExportOverview as getDatasetExportOverview,
  previewExport as previewDatasetExport,
  type ExportOptions,
} from "@/lib/export/exportService";

export async function getExportOverview() {
  return getDatasetExportOverview();
}

export async function previewExport(options: ExportOptions) {
  return previewDatasetExport(options);
}

export async function exportDataset(options: ExportOptions) {
  return createDatasetExport(options);
}
