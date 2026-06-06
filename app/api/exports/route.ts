import {
  exportDataset,
  getExportOverview,
  previewExport,
} from "@/lib/services/exportService";
import { errorResponse, parseRequestBody, successResponse } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { can } from "@/lib/auth/permissions";
import { exportDatasetInput } from "@/lib/validators/api";

export async function GET() {
  const user = await getCurrentUser();
  if (!can(user.role, "export:create")) {
    return errorResponse("Forbidden", 403);
  }
  return successResponse(await getExportOverview());
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!can(user.role, "export:create")) {
    return errorResponse("Forbidden", 403);
  }
  const parsed = await parseRequestBody(request, exportDatasetInput);
  if (!parsed.ok) {
    return parsed.response;
  }

  const { mode, ...options } = parsed.data;

  try {
    if (mode === "preview") {
      return successResponse(await previewExport(options));
    }

    return successResponse(await exportDataset(options));
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "导出失败", 400);
  }
}
