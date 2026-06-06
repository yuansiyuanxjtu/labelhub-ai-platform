"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { can, type AppRole } from "@/lib/auth/permissions";

export function TaskCreateAction() {
  const [role, setRole] = useState<AppRole>("ADMIN");

  useEffect(() => {
    void fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { user?: { role?: AppRole } }) => {
        if (data.user?.role) {
          setRole(data.user.role);
        }
      })
      .catch(() => {});
  }, []);

  if (!can(role, "task:create")) {
    return null;
  }

  return (
    <Button asChild>
      <Link href="/tasks/new">
        <Plus className="h-4 w-4" />
        新建任务
      </Link>
    </Button>
  );
}
