import { NextResponse } from "next/server";
import { ZodError, type z, type ZodType } from "zod";
import type { ApiErrorResponse, ApiSuccessResponse, ApiValidationDetail } from "@/types/api";

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json<ApiSuccessResponse<T>>(
    {
      ok: true,
      data,
    },
    { status },
  );
}

export function errorResponse(message: string, status: number, details?: unknown) {
  const payload: ApiErrorResponse = {
    ok: false,
    error: {
      message,
      details,
    },
  };

  return NextResponse.json(payload, { status });
}

export async function parseRequestBody<TSchema extends ZodType>(
  request: Request,
  schema: TSchema,
): Promise<
  | {
      ok: true;
      data: z.infer<TSchema>;
    }
  | {
      ok: false;
      response: NextResponse<ApiErrorResponse>;
    }
> {
  try {
    const rawBody = await request.text();
    const body = rawBody.trim().length === 0 ? {} : (JSON.parse(rawBody) as unknown);
    const result = schema.safeParse(body);

    if (!result.success) {
      return {
        ok: false,
        response: errorResponse("Invalid request", 400, toValidationDetails(result.error)),
      };
    }

    return {
      ok: true,
      data: result.data as z.infer<TSchema>,
    };
  } catch {
    return {
      ok: false,
      response: errorResponse("Invalid request", 400, [
        {
          path: "$",
          message: "Malformed JSON body",
          code: "invalid_json",
        } satisfies ApiValidationDetail,
      ]),
    };
  }
}

function toValidationDetails(error: ZodError): ApiValidationDetail[] {
  return error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.join(".") : "$",
    message: issue.message,
    code: issue.code,
  }));
}
