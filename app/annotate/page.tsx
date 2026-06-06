"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { AnnotateWorkspace, type AnnotateSample } from "@/components/annotate/annotate-workspace";
import { PageHeader } from "@/components/layout/page-header";
import { Progress } from "@/components/ui/progress";
import { validateAnnotationValue } from "@/lib/annotation-validation";
import type { FormValue } from "@/lib/form-schema";

export default function AnnotatePage() {
  const [samples, setSamples] = useState<AnnotateSample[]>([]);
  const [currentSampleId, setCurrentSampleId] = useState("");
  const [value, setValue] = useState<FormValue>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const visibleSamples = useMemo(() => samples.slice(0, 200), [samples]);
  const currentSample = useMemo(
    () => visibleSamples.find((sample) => sample.id === currentSampleId) ?? visibleSamples[0],
    [visibleSamples, currentSampleId],
  );
  const submittedCount = useMemo(
    () => samples.filter((sample) => sample.status === "SUBMITTED").length,
    [samples],
  );
  const completionRate = useMemo(
    () => (samples.length === 0 ? 0 : Math.round((submittedCount / samples.length) * 100)),
    [samples.length, submittedCount],
  );

  useEffect(() => {
    let mounted = true;

    async function loadSamples() {
      try {
        const response = await fetch("/api/annotate/samples", { cache: "no-store" });

        if (!response.ok) {
          throw new Error("样本队列加载失败");
        }

        const data = (await response.json()) as { samples: AnnotateSample[] };

        if (mounted) {
          setSamples(data.samples);
          setCurrentSampleId(data.samples[0]?.id ?? "");
          setError("");
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : "样本队列加载失败");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadSamples();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setValue(parseAnnotationValue(currentSample?.annotation?.annotationData));
    setFormErrors({});
    setNotice("");
  }, [currentSample?.id, currentSample?.annotation?.annotationData]);

  function selectSample(sample: AnnotateSample) {
    setCurrentSampleId(sample.id);
  }

  async function saveAnnotation(action: "draft" | "submit") {
    if (!currentSample) {
      return;
    }

    if (action === "submit") {
      const nextErrors = validateAnnotationValue(currentSample.task.formSchema, value);

      if (Object.keys(nextErrors).length > 0) {
        setFormErrors(nextErrors);
        setNotice("");
        return;
      }
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`/api/annotate/samples/${currentSample.id}/annotation`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, annotationData: value }),
      });
      const data = (await response.json()) as {
        sample?: { id: string; status: string; updatedAt: string };
        annotation?: AnnotateSample["annotation"];
        errors?: Record<string, string>;
        message?: string;
      };

      if (!response.ok) {
        if (data.errors) {
          setFormErrors(data.errors);
        }

        throw new Error(data.message ?? (action === "submit" ? "提交失败" : "保存草稿失败"));
      }

      if (data.sample && data.annotation) {
        const nextSample = data.sample;
        const nextAnnotation = data.annotation;

        setSamples((current) =>
          current.map((sample) =>
            sample.id === nextSample.id
              ? {
                  ...sample,
                  status: nextSample.status,
                  updatedAt: nextSample.updatedAt,
                  annotation: nextAnnotation,
                }
              : sample,
          ),
        );
      }

      setFormErrors({});
      setNotice(action === "submit" ? "标注已提交" : "草稿已保存");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "操作失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Annotator Workspace"
        title="数据标注工作台"
        description="查看分配给自己的样本，基于任务 formSchema 填写动态标注表单，并将结果提交给 QualityGuard Agent 预审。"
      >
        <div className="flex max-w-xl items-center gap-3">
          <Progress value={completionRate} />
          <span className="w-28 text-sm text-muted-foreground">
            {submittedCount}/{samples.length} submitted
          </span>
        </div>
      </PageHeader>

      {loading ? (
        <LoadingState text="正在加载样本队列..." rows={2} />
      ) : error && samples.length === 0 ? (
        <ErrorState
          title="样本队列加载失败"
          message={error}
          onRetry={() => window.location.reload()}
        />
      ) : visibleSamples.length === 0 ? (
        <EmptyState title="暂无分配样本" description="当前没有分配给你的待标注样本。" />
      ) : currentSample ? (
        <AnnotateWorkspace
          samples={visibleSamples}
          currentSample={currentSample}
          value={value}
          formErrors={formErrors}
          saving={saving}
          notice={notice}
          error={error}
          onSelectSample={selectSample}
          onChangeValue={(nextValue) => {
            setValue(nextValue);
            setNotice("");
          }}
          onSaveDraft={() => void saveAnnotation("draft")}
          onSubmit={() => void saveAnnotation("submit")}
        />
      ) : null}
    </div>
  );
}

function parseAnnotationValue(annotationData?: string | null): FormValue {
  if (!annotationData) {
    return {};
  }

  try {
    return JSON.parse(annotationData) as FormValue;
  } catch {
    return {};
  }
}
