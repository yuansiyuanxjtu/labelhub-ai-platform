"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ClipboardCheck,
  DatabaseZap,
  Download,
  FlaskConical,
  FilePlus2,
  LayoutDashboard,
  ListChecks,
  Tags,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { can, type AppAction } from "@/lib/auth/permissions";

const navItems = [
  { href: "/dashboard", label: "工作台", icon: LayoutDashboard, action: null },
  { href: "/demo", label: "Demo Mode", icon: FlaskConical, action: null },
  { href: "/tasks", label: "任务管理", icon: ListChecks, action: "task:view" as AppAction },
  { href: "/tasks/new", label: "新建任务", icon: FilePlus2, action: "task:create" as AppAction },
  { href: "/annotate", label: "数据标注", icon: Tags, action: "annotation:view_assigned" as AppAction },
  { href: "/review", label: "人工审核", icon: ClipboardCheck, action: "review:view" as AppAction },
  { href: "/exports", label: "数据导出", icon: Download, action: "export:create" as AppAction },
];

export function Sidebar() {
  const pathname = usePathname();
  const { role } = useCurrentUser();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-card lg:block">
      <div className="flex h-16 items-center gap-3 border-b px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <DatabaseZap className="h-5 w-5" />
        </div>
        <div>
          <p className="text-base font-semibold">LabelHub</p>
          <p className="text-xs text-muted-foreground">Training Data Ops</p>
        </div>
      </div>
      <nav className="space-y-1 px-3 py-4">
        {navItems
          .filter((item) => (item.action ? can(role, item.action) : true))
          .map((item) => {
          const active = isNavItemActive(item.href, pathname);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground",
                active && "bg-secondary text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
          })}
      </nav>
      <div className="absolute bottom-0 w-full border-t p-4">
        <div className="rounded-md bg-secondary p-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <BarChart3 className="h-4 w-4 text-primary" />
            AI 预审模式
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            当前为 mock 流程，不会调用真实模型 API。
          </p>
        </div>
      </div>
    </aside>
  );
}

function isNavItemActive(href: string, pathname: string) {
  const normalizedPathname = normalizePath(pathname);

  if (href === "/tasks") {
    return (
      normalizedPathname === "/tasks" ||
      /^\/tasks\/(?!new$)[^/]+$/.test(normalizedPathname)
    );
  }

  return normalizedPathname === href;
}

function normalizePath(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}
