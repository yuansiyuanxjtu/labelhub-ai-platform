import { SampleDataViewer } from "@/components/sample/SampleDataViewer";
import type { JsonValue } from "@/types/sample";

export function AnnotationDataViewer({
  rawData,
  description,
  enableInternalScroll = false,
}: {
  rawData: string | JsonValue;
  description?: string;
  enableInternalScroll?: boolean;
}) {
  return (
    <SampleDataViewer
      title="标注结果"
      rawData={rawData}
      description={description}
      enableInternalScroll={enableInternalScroll}
    />
  );
}
