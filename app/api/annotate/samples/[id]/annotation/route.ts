import { getCurrentUser } from "@/lib/auth/currentUser";
import { can } from "@/lib/auth/permissions";
import { errorResponse, parseRequestBody, successResponse } from "@/lib/api/response";
import { isServiceError } from "@/lib/api/service-error";
import { submitAnnotation } from "@/lib/services/annotationService";
import { submitAnnotationInput } from "@/lib/validators/api";

type AnnotationRouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: AnnotationRouteContext) {
  const { id } = await context.params;
  const annotator = await getCurrentUser();
  if (!can(annotator.role, "annotation:submit")) {
    return errorResponse("Forbidden", 403);
  }
  const parsed = await parseRequestBody(request, submitAnnotationInput);

  if (!parsed.ok) {
    return parsed.response;
  }

  try {
    return successResponse(
      await submitAnnotation({
        sampleId: id,
        annotatorId: annotator.id,
        annotatorName: annotator.name,
        input: parsed.data,
      }),
    );
  } catch (error) {
    if (isServiceError(error)) {
      return errorResponse(error.message, error.status, error.details);
    }

    return errorResponse("Failed to submit annotation", 500);
  }
}
