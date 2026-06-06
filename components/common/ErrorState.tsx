"use client";

import type { ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ErrorState({
  title = "加载失败",
  message = "请稍后重试",
  onRetry,
  action,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  action?: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-start gap-3 p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-destructive">
          <AlertCircle className="h-4 w-4" />
          {title}
        </div>
        <p className="text-sm text-muted-foreground">{message}</p>
        <div className="flex items-center gap-2">
          {onRetry ? (
            <Button type="button" variant="outline" onClick={onRetry}>
              <RefreshCw className="h-4 w-4" />
              重试
            </Button>
          ) : null}
          {action}
        </div>
      </CardContent>
    </Card>
  );
}
