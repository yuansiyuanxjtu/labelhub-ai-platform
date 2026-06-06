import { memo, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  formatPrimitive,
  isJsonObject,
  isLongText,
  isPrimitive,
  parseSampleRawData,
} from "@/lib/sample/formatSampleData";
import type { JsonValue } from "@/types/sample";

type SampleDataViewerProps = {
  title: string;
  rawData: string | JsonValue;
  description?: string;
  className?: string;
  contentClassName?: string;
  enableInternalScroll?: boolean;
};

export function SampleDataViewer({
  title,
  rawData,
  description,
  className,
  contentClassName,
  enableInternalScroll = true,
}: SampleDataViewerProps) {
  const data = useMemo(
    () => (typeof rawData === "string" ? parseSampleRawData(rawData) : rawData),
    [rawData],
  );
  const body = useMemo(() => <JsonValueView value={data} depth={0} />, [data]);

  return (
    <Card className={cn("overflow-hidden rounded-xl", className)}>
      <CardHeader className="space-y-2 border-b p-4">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base leading-6">{title}</CardTitle>
          <TypeBadge type={getValueType(data)} />
        </div>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </CardHeader>
      <CardContent className={cn("p-4", contentClassName)}>
        {enableInternalScroll ? (
          <ScrollArea className="max-h-[620px] pr-1">{body}</ScrollArea>
        ) : (
          body
        )}
      </CardContent>
    </Card>
  );
}

const JsonValueView = memo(function JsonValueView({
  value,
  depth,
}: {
  value: JsonValue;
  depth: number;
}) {
  if (isPrimitive(value)) {
    return <PrimitiveValue value={value} />;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <EmptyValue label="空数组" />;
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
            array
          </Badge>
          <span>{value.length} items</span>
        </div>
        <div className="space-y-3">
          {value.slice(0, 30).map((item, index) => (
            <details key={index} className="group rounded-lg border bg-background">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3">
                <span className="text-sm font-medium">Item {index + 1}</span>
                <TypeBadge type={getValueType(item)} />
              </summary>
              <div className="border-t p-3">
                <JsonValueView value={item} depth={depth + 1} />
              </div>
            </details>
          ))}
          {value.length > 30 ? (
            <p className="text-xs text-muted-foreground">
              仅展示前 30 项，剩余 {value.length - 30} 项。
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (isJsonObject(value)) {
    const entries = Object.entries(value);

    if (entries.length === 0) {
      return <EmptyValue label="空对象" />;
    }

    return (
      <div className={cn("grid gap-3", depth === 0 && "2xl:grid-cols-2")}>
        {entries.slice(0, 60).map(([key, item]) => (
          <div
            key={key}
            className={cn(
              "rounded-lg border bg-background p-3",
              shouldSpanFull(item) && depth === 0 && "2xl:col-span-2",
              depth > 0 && "border-dashed bg-secondary/15",
            )}
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <div>
                <p className="text-sm font-medium">{formatFieldLabel(key)}</p>
                <p className="font-mono text-[11px] text-muted-foreground">{key}</p>
              </div>
              <TypeBadge type={getValueType(item)} />
            </div>
            {shouldRenderAsJsonBlock(item, depth) ? (
              <pre className="max-h-80 overflow-auto rounded-lg bg-secondary/50 p-3 text-xs leading-5">
                {JSON.stringify(item, null, 2)}
              </pre>
            ) : (
              <JsonValueView value={item} depth={depth + 1} />
            )}
          </div>
        ))}
        {entries.length > 60 ? (
          <p className="text-xs text-muted-foreground">
            仅展示前 60 个字段，剩余 {entries.length - 60} 个。
          </p>
        ) : null}
      </div>
    );
  }

  return null;
});

function PrimitiveValue({ value }: { value: JsonValue }) {
  if (typeof value === "string" && isLongText(value)) {
    return (
      <div className="rounded-lg bg-secondary/45 p-3">
        <p className="whitespace-pre-wrap text-sm leading-7">{value}</p>
      </div>
    );
  }

  return (
    <p className="break-words rounded-md bg-secondary/25 px-2 py-1.5 text-sm leading-6">
      {formatPrimitive(value)}
    </p>
  );
}

function shouldRenderAsJsonBlock(value: JsonValue, depth: number) {
  if (depth < 1) {
    return false;
  }

  return isJsonObject(value) || Array.isArray(value);
}

function getValueType(value: JsonValue) {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value;
}

function TypeBadge({ type }: { type: string }) {
  return (
    <Badge variant="outline" className="h-5 px-1.5 py-0 text-[10px] font-medium text-muted-foreground">
      {type}
    </Badge>
  );
}

function EmptyValue({ label }: { label: string }) {
  return <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">{label}</p>;
}

function formatFieldLabel(key: string) {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function shouldSpanFull(value: JsonValue) {
  if (typeof value === "string") {
    return isLongText(value);
  }

  return isJsonObject(value) || Array.isArray(value);
}
