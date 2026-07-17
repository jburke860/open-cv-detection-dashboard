"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { AboutSection } from "@/components/workspace/AboutSection";
import { AnalyticsPanel } from "@/components/workspace/AnalyticsPanel";
import { DetectionsPanel } from "@/components/workspace/DetectionsPanel";
import { Hero } from "@/components/workspace/Hero";
import { SampleScenes } from "@/components/workspace/SampleScenes";
import { SummaryCard } from "@/components/workspace/SummaryCard";
import {
  UploadControls,
  jobStatusBadge,
} from "@/components/workspace/UploadControls";
import { ViewerCard, type ClassChip } from "@/components/workspace/ViewerCard";
import {
  DEFAULT_INFERENCE_OPTIONS,
  DETECTION_MODELS,
  type InferenceOptions,
} from "@/lib/detectionPipeline";
import type { DetectionFile } from "@/lib/detectionTypes";
import {
  IMAGE_SAMPLES,
  loadDetectionFile,
  withAssetVersion,
} from "@/lib/detectionUtils";
import { useDetectionJobRunner } from "@/lib/useDetectionJobRunner";
import type { WorkspaceResult } from "@/lib/workspaceTypes";

type Source = "sample" | "upload";

export function Workspace() {
  const [sampleCache, setSampleCache] = useState<Record<string, DetectionFile>>(
    {}
  );
  const [samplesLoading, setSamplesLoading] = useState(true);
  const [samplesError, setSamplesError] = useState<string | null>(null);
  const [selectedSampleId, setSelectedSampleId] = useState<string>(
    IMAGE_SAMPLES[0].id
  );
  const [source, setSource] = useState<Source>("sample");
  const [settings, setSettings] = useState<InferenceOptions>(
    DEFAULT_INFERENCE_OPTIONS
  );
  const threshold = settings.confidenceThreshold;
  const [classFilter, setClassFilter] = useState<Set<string> | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);

  const runner = useDetectionJobRunner();

  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      setSamplesLoading(true);
      setSamplesError(null);
      try {
        const entries = await Promise.all(
          IMAGE_SAMPLES.map(async (sample) => {
            const data = await loadDetectionFile(sample.detectionPath);
            return [sample.id, data] as const;
          })
        );
        if (!cancelled) {
          setSampleCache(Object.fromEntries(entries));
        }
      } catch (error) {
        if (!cancelled) {
          setSamplesError(
            error instanceof Error
              ? error.message
              : "Failed to load sample detections"
          );
        }
      } finally {
        if (!cancelled) {
          setSamplesLoading(false);
        }
      }
    }

    void loadAll();
    return () => {
      cancelled = true;
    };
  }, []);

  // Selecting a file switches the workspace to the upload; clearing it
  // falls back to the sample gallery. Adjusted during render (not in an
  // effect) per React's derived-state guidance.
  const hasPreview = Boolean(runner.preview);
  const [prevHasPreview, setPrevHasPreview] = useState(hasPreview);
  if (prevHasPreview !== hasPreview) {
    setPrevHasPreview(hasPreview);
    setSource(hasPreview ? "upload" : "sample");
  }

  const result: WorkspaceResult | null = useMemo(() => {
    if (source === "upload" && runner.preview) {
      const { preview, job } = runner;
      return {
        key: job?.id ?? `upload-${preview.file.name}-${preview.file.size}`,
        title: preview.file.name,
        imageSrc: preview.previewUrl,
        width: job?.result?.width ?? preview.width,
        height: job?.result?.height ?? preview.height,
        model:
          job?.result?.model ??
          (DETECTION_MODELS.find((model) => model.id === settings.model)
            ?.label ??
            "YOLOv8n"),
        detections: job?.result?.detections ?? [],
        kind: "upload",
        job: job ?? undefined,
        runtimeMs: job?.result?.runtimeMs,
      };
    }

    const sample = IMAGE_SAMPLES.find((item) => item.id === selectedSampleId);
    const data = sample ? sampleCache[sample.id] : undefined;
    if (!sample || !data) {
      return null;
    }

    return {
      key: `sample-${sample.id}`,
      title: data.title,
      subtitle: data.description,
      imageSrc: withAssetVersion(data.image),
      width: data.width,
      height: data.height,
      model: data.model,
      detections: data.detections,
      kind: "sample",
    };
  }, [source, runner, selectedSampleId, sampleCache, settings.model]);

  // Filters and selection are per-image; clear them when the image changes.
  const resultKey = result?.key ?? null;
  const [prevResultKey, setPrevResultKey] = useState(resultKey);
  if (prevResultKey !== resultKey) {
    setPrevResultKey(resultKey);
    setClassFilter(null);
    setActiveId(null);
  }

  const thresholdFiltered = useMemo(
    () =>
      (result?.detections ?? []).filter(
        (detection) => detection.confidence >= threshold
      ),
    [result, threshold]
  );

  const classChips: ClassChip[] = useMemo(() => {
    const counts = new Map<string, number>();
    for (const detection of thresholdFiltered) {
      counts.set(detection.label, (counts.get(detection.label) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count }));
  }, [thresholdFiltered]);

  const visibleDetections = useMemo(
    () =>
      classFilter
        ? thresholdFiltered.filter((detection) =>
            classFilter.has(detection.label)
          )
        : thresholdFiltered,
    [thresholdFiltered, classFilter]
  );

  const toggleClass = useCallback((label: string | null) => {
    if (label === null) {
      setClassFilter(null);
      return;
    }
    setClassFilter((previous) => {
      const next = new Set(previous ?? []);
      if (next.has(label)) {
        next.delete(label);
        return next.size === 0 ? null : next;
      }
      next.add(label);
      return next;
    });
  }, []);

  const handleActiveId = useCallback((id: number | null) => {
    setActiveId(id);
  }, []);

  const overlayMessage = useMemo(() => {
    if (!result) return undefined;
    if (result.kind === "upload") {
      if (!result.job) {
        return "Run detection to generate bounding boxes.";
      }
      if (result.job.status === "queued" || result.job.status === "running") {
        return "Detection in progress…";
      }
      if (result.job.status === "complete" && result.detections.length === 0) {
        return "No objects were detected above the run threshold.";
      }
    }
    if (result.detections.length > 0 && thresholdFiltered.length === 0) {
      return "No detections at this confidence threshold — lower it to see more.";
    }
    return undefined;
  }, [result, thresholdFiltered.length]);

  const headerBadges =
    result?.kind === "upload" ? (
      <Badge
        tone={jobStatusBadge(result.job ?? null).tone}
        dot
        pulse={
          result.job?.status === "queued" || result.job?.status === "running"
        }
      >
        {jobStatusBadge(result.job ?? null).label}
      </Badge>
    ) : (
      <Badge tone="neutral">Precomputed</Badge>
    );

  return (
    <div className="space-y-6">
      <Hero />

      <div id="workspace" className="scroll-mt-20 space-y-4">
        <UploadControls
          runner={runner}
          settings={settings}
          onSettingsChange={setSettings}
        />

        <SampleScenes
          samples={IMAGE_SAMPLES}
          selectedId={source === "sample" ? selectedSampleId : null}
          onSelect={(id) => {
            setSelectedSampleId(id);
            setSource("sample");
          }}
        />

        {samplesError ? (
          <div className="rounded-xl border border-danger/40 bg-danger-soft px-5 py-4 text-sm text-danger">
            {samplesError}
          </div>
        ) : null}

        {samplesLoading && !result ? (
          <div className="rounded-2xl border border-line bg-surface-1 px-6 py-16 text-center text-sm text-ink-muted">
            Loading precomputed detections…
          </div>
        ) : null}

        {result ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
            {/* The viewer stretches to match the rail height, and the rail's
                detections list flexes, so neither column leaves a gap. */}
            <ViewerCard
              key={result.key}
              result={result}
              visibleDetections={visibleDetections}
              classChips={classChips}
              classFilter={classFilter}
              onToggleClass={toggleClass}
              activeId={activeId}
              onActiveId={handleActiveId}
              headerBadges={headerBadges}
              overlayMessage={overlayMessage}
            />
            <div className="flex flex-col gap-4">
              <SummaryCard
                detections={visibleDetections}
                runtimeMs={result.runtimeMs}
              />
              <DetectionsPanel
                detections={visibleDetections}
                activeId={activeId}
                onActiveId={handleActiveId}
              />
            </div>
            <div className="min-w-0 xl:col-span-2">
              <AnalyticsPanel
                result={result}
                visibleDetections={visibleDetections}
                threshold={threshold}
              />
            </div>
          </div>
        ) : null}
      </div>

      <AboutSection />
    </div>
  );
}
