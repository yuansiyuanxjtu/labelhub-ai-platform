import { NextResponse } from "next/server";
import { z } from "zod";
import { parseRequestBody } from "@/lib/api/response";
import { setCurrentRole } from "@/lib/auth/currentUser";
import type { AppRole } from "@/lib/auth/permissions";

const bodySchema = z.object({
  role: z.enum(["ADMIN", "TASK_OWNER", "ANNOTATOR", "REVIEWER"]),
});

export async function POST(request: Request) {
  const parsed = await parseRequestBody(request, bodySchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  await setCurrentRole(parsed.data.role as AppRole);
  return NextResponse.json({ ok: true });
}
