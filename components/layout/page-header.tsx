import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children?: ReactNode;
};

const valuePillars = [
  "Dynamic labeling workflow",
  "AI quality review",
  "Human-in-the-loop approval",
];

export function PageHeader({
  eyebrow = "LabelHub",
  title,
  description,
  actions,
  children,
}: PageHeaderProps) {
  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <Badge variant="secondary" className="w-fit">
            {eyebrow}
          </Badge>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {valuePillars.map((pillar) => (
              <Badge key={pillar} variant="outline" className="bg-background">
                {pillar}
              </Badge>
            ))}
          </div>
          {children}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
