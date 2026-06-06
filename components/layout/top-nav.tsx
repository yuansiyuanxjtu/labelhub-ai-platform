 "use client";

import { Bell, Search, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AppRole } from "@/lib/auth/permissions";

export function TopNav() {
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

  return (
    <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <div className="lg:hidden">
          <p className="text-base font-semibold">LabelHub</p>
        </div>
        <div className="relative ml-auto w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="搜索任务、数据集或审核人" />
        </div>
        <Button variant="outline" size="icon" aria-label="通知">
          <Bell className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" aria-label="设置">
          <Settings className="h-4 w-4" />
        </Button>
        <div className="hidden h-9 items-center rounded-md border px-3 text-sm font-medium sm:flex">
          {formatRole(role)}
        </div>
      </div>
    </header>
  );
}

function formatRole(role: AppRole) {
  if (role === "TASK_OWNER") return "Task Owner";
  return role;
}
