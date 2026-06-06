import { getCurrentUser } from "@/lib/auth/currentUser";
import { can } from "@/lib/auth/permissions";
import { errorResponse, parseRequestBody, successResponse } from "@/lib/api/response";
import { isServiceError } from "@/lib/api/service-error";
import { submitHumanReview } from "@/lib/services/reviewService";
import { submitHumanReviewInput } from "@/lib/validators/api";

type HumanReviewRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: HumanReviewRouteContext) {
  const { id } = await context.params;
  const reviewer = await getCurrentUser();
  if (!can(reviewer.role, "review:submit")) {
    return errorResponse("Forbidden", 403);
  }
  const parsed = await parseRequestBody(request, submitHumanReviewInput);
  if (!parsed.ok) {
    return parsed.response;
  }

  try {
    return successResponse(
      await submitHumanReview({
        annotationId: id,
        reviewerId: reviewer.id,
        reviewerName: reviewer.name,
        input: parsed.data,
      }),
    );
  } catch (error) {
    if (isServiceError(error)) {
      return errorResponse(error.message, error.status, error.details);
    }
    return errorResponse("Failed to submit human review", 500);
  }
}
