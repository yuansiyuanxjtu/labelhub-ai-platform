import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { can } from "@/lib/auth/permissions";
import { resetDemoData } from "@/lib/demo/demoData";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const user = await getCurrentUser();
  if (!can(user.role, "demo:reset")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const result = await resetDemoData(prisma);

  return NextResponse.json({
    message: "Demo data reset",
    ...result,
  });
}
