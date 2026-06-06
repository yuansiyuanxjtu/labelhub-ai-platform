"use client";

import { Card, CardContent } from "@/components/ui/card";

export function LoadingState({
  text = "正在加载...",
  rows = 3,
}: {
  text?: string;
  rows?: number;
}) {
  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-5 text-sm text-muted-foreground">{text}</CardContent>
      </Card>
      <div className="grid gap-3">
        {Array.from({ length: rows }).map((_, index) => (
          <Card key={index}>
            <CardContent className="space-y-3 p-4">
              <div className="h-5 w-44 rounded bg-secondary" />
              <div className="h-4 w-full rounded bg-secondary" />
              <div className="h-4 w-2/3 rounded bg-secondary" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
