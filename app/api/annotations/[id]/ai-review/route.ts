import { errorResponse, parseRequestBody, successResponse } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { can } from "@/lib/auth/permissions";
import { isServiceError } from "@/lib/api/service-error";
import { runAiReview } from "@/lib/services/reviewService";
import { runAiReviewInput } from "@/lib/validators/api";

type AiReviewRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: AiReviewRouteContext) {
  const user = await getCurrentUser();
  if (!can(user.role, "ai_review:run")) {
    return errorResponse("Forbidden", 403);
  }
  const parsed = await parseRequestBody(request, runAiReviewInput);

  if (!parsed.ok) {
    return parsed.response;
  }

  const { id } = await context.params;
  try {
    return successResponse(await runAiReview(id));
  } catch (error) {
    if (isServiceError(error)) {
      return errorResponse(error.message, error.status, error.details);
    }
    return errorResponse("Failed to run AI review", 500);
  }
}
