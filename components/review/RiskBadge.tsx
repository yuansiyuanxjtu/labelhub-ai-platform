import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

const riskCopy: Record<RiskLevel, { label: string; tone: string; dot: string }> = {
  HIGH: {
    label: "高风险",
    tone: "border-destructive/30 bg-destructive/10 text-destructive",
    dot: "bg-destructive",
  },
  MEDIUM: {
    label: "中风险",
    tone: "border-accent/40 bg-accent/15 text-accent-foreground",
    dot: "bg-accent",
  },
  LOW: {
    label: "低风险",
    tone: "border-primary/25 bg-primary/10 text-primary",
    dot: "bg-primary",
  },
};

export function RiskBadge({
  risk,
  showCode = false,
  className,
}: {
  risk: RiskLevel;
  showCode?: boolean;
  className?: string;
}) {
  const copy = riskCopy[risk];

  return (
    <Badge variant="outline" className={cn("gap-1.5 whitespace-nowrap", copy.tone, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", copy.dot)} />
      {copy.label}
      {showCode ? <span className="text-[10px] opacity-70">{risk}</span> : null}
    </Badge>
  );
}

export function getRiskLabel(risk: RiskLevel) {
  return riskCopy[risk].label;
}

export function getRiskAccentClass(risk: RiskLevel) {
  if (risk === "HIGH") return "border-l-destructive";
  if (risk === "MEDIUM") return "border-l-accent";
  return "border-l-primary";
}
