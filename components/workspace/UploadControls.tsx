"use client";

import { Play, SlidersHorizontal, UploadCloud, X } from "lucide-react";
import { useMemo, useRef, useState, type DragEvent } from "react";

import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Select } from "@/components/ui/Select";
import { Slider } from "@/components/ui/Slider";
import { cn } from "@/lib/cn";
import {
  DETECTION_MODELS,
  getMissingFirebaseConfig,
  isDetectionApiConfigured,
  isFirebaseConfigured,
  type DetectionJobRecord,
  type DetectionModelId,
  type InferenceOptions,
} from "@/lib/detectionPipeline";
import {
  ACCEPTED_IMAGE_TYPES,
  type useDetectionJobRunner,
} from "@/lib/useDetectionJobRunner";
import { formatConfidence } from "@/lib/detectionUtils";

export function jobStatusBadge(job: DetectionJobRecord | null): {
  tone: BadgeTone;
  label: string;
} {
  switch (job?.status) {
    case "queued":
      return { tone: "warning", label: "Queued" };
    case "running":
      return { tone: "warning", label: "Running" };
    case "complete":
      return { tone: "success", label: "Complete" };
    case "failed":
      return { tone: "danger", label: "Failed" };
    default:
      return { tone: "neutral", label: "Ready" };
  }
}

export function UploadControls({
  runner,
  settings,
  onSettingsChange,
}: {
  runner: ReturnType<typeof useDetectionJobRunner>;
  settings: InferenceOptions;
  onSettingsChange: (settings: InferenceOptions) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const firebaseReady = isFirebaseConfigured();
  const apiReady = isDetectionApiConfigured();
  const missingConfig = useMemo(() => getMissingFirebaseConfig(), []);

  const { preview, job, busy, uploadProgress, error, showSlowStartMessage } =
    runner;
  const status = jobStatusBadge(job);
  const jobActive =
    busy || job?.status === "queued" || job?.status === "running";
  const selectedModel =
    DETECTION_MODELS.find((model) => model.id === settings.model) ??
    DETECTION_MODELS[0];

  function update(partial: Partial<InferenceOptions>) {
    onSettingsChange({ ...settings, ...partial });
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      void runner.selectFile(file);
    }
  }

  return (
    <Card>
      <CardBody className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_auto]">
        {/* Dropzone */}
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={cn(
            "relative flex min-h-28 flex-col items-center justify-center rounded-xl border border-dashed px-4 py-5 text-center transition",
            dragActive
              ? "border-accent bg-accent-soft"
              : "border-line-strong bg-surface-2 hover:border-accent/60"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            className="sr-only"
            onChange={(event) => {
              void runner.selectFile(event.target.files?.[0] ?? null);
              event.target.value = "";
            }}
          />
          {preview ? (
            <div className="flex w-full items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.previewUrl}
                alt={preview.file.name}
                className="h-14 w-14 shrink-0 rounded-lg border border-line object-cover"
              />
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-medium text-ink">
                  {preview.file.name}
                </p>
                <p className="font-mono text-[11px] text-ink-faint">
                  {preview.width} × {preview.height} ·{" "}
                  {(preview.file.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
              <button
                type="button"
                aria-label="Remove selected image"
                onClick={() => runner.reset()}
                className="shrink-0 rounded-md border border-line bg-surface-1 p-1.5 text-ink-muted transition hover:text-danger"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex flex-col items-center gap-1.5"
            >
              <UploadCloud className="h-6 w-6 text-accent" />
              <span className="text-sm font-medium text-ink">
                Drag & drop an image here{" "}
                <span className="text-accent">or browse</span>
              </span>
              <span className="text-xs text-ink-faint">
                JPG, PNG, or WebP · up to 10 MB
              </span>
            </button>
          )}
        </div>

        {/* Model + threshold */}
        <div className="flex flex-col justify-center gap-3">
          <div className="flex items-center gap-2">
            <label
              htmlFor="model-select"
              className="w-24 shrink-0 text-xs font-medium text-ink-muted"
            >
              Model
            </label>
            <Select
              id="model-select"
              value={settings.model}
              onChange={(value) => update({ model: value as DetectionModelId })}
              className="min-w-0 flex-1"
            >
              {DETECTION_MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label} — {model.hint}
                </option>
              ))}
            </Select>
          </div>

          {selectedModel.world ? (
            <div>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="class-prompt"
                  className="w-24 shrink-0 text-xs font-medium text-ink-muted"
                >
                  Classes
                </label>
                <input
                  id="class-prompt"
                  type="text"
                  value={settings.classPrompt}
                  onChange={(event) =>
                    update({ classPrompt: event.target.value })
                  }
                  placeholder="e.g. person, dog, red umbrella"
                  className="min-w-0 flex-1 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-xs text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
                />
              </div>
              <p className="mt-1 pl-26 text-[11px] leading-4 text-ink-faint">
                Comma-separated, free-form. Leave empty for the 80 standard
                classes; unusual prompts often need a lower confidence
                threshold.
              </p>
            </div>
          ) : null}

          <div>
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="confidence-threshold"
                className="text-xs font-medium text-ink-muted"
              >
                Confidence threshold
              </label>
              <Badge tone="accent" className="font-mono">
                {formatConfidence(settings.confidenceThreshold)}
              </Badge>
            </div>
            <Slider
              id="confidence-threshold"
              min={0.05}
              max={0.9}
              step={0.05}
              value={settings.confidenceThreshold}
              onChange={(value) => update({ confidenceThreshold: value })}
              className="mt-2"
            />
          </div>

          <button
            type="button"
            onClick={() => setAdvancedOpen((open) => !open)}
            className="inline-flex items-center gap-1.5 self-start text-xs font-medium text-ink-muted transition hover:text-accent"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Advanced settings
            <span className="font-mono text-[10px] text-ink-faint">
              IoU {settings.iouThreshold.toFixed(2)} · max{" "}
              {settings.maxDetections}
            </span>
          </button>
        </div>

        {/* Run */}
        <div className="flex flex-col items-stretch justify-center gap-2 lg:w-48">
          <Button
            variant="primary"
            disabled={!preview || jobActive || !firebaseReady}
            onClick={() => void runner.run(settings)}
            icon={<Play className="h-4 w-4" />}
            className="w-full"
          >
            {jobActive ? "Detecting…" : "Run Detection"}
          </Button>
          <div className="flex items-center justify-center gap-2">
            <Badge tone={status.tone} dot pulse={jobActive}>
              {status.label}
            </Badge>
            {job?.result?.runtimeMs !== undefined ? (
              <span className="font-mono text-[11px] text-ink-faint">
                {selectedModel.label} · {(job.result.runtimeMs / 1000).toFixed(2)}s
              </span>
            ) : null}
          </div>
        </div>
      </CardBody>

      {advancedOpen ? (
        <div className="grid gap-4 border-t border-line px-4 py-3.5 sm:grid-cols-2 sm:px-5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="iou-threshold"
                className="text-xs font-medium text-ink-muted"
              >
                NMS IoU threshold
              </label>
              <Badge tone="neutral" className="font-mono">
                {settings.iouThreshold.toFixed(2)}
              </Badge>
            </div>
            <Slider
              id="iou-threshold"
              min={0.1}
              max={0.9}
              step={0.05}
              value={settings.iouThreshold}
              disabled={selectedModel.noNms}
              onChange={(value) => update({ iouThreshold: value })}
              className="mt-2"
            />
            <p className="mt-1.5 text-[11px] leading-4 text-ink-faint">
              {selectedModel.noNms
                ? `${selectedModel.label} is NMS-free — this setting has no effect.`
                : "Lower values merge overlapping boxes more aggressively during non-maximum suppression."}
            </p>
          </div>
          <div>
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="max-detections"
                className="text-xs font-medium text-ink-muted"
              >
                Max detections
              </label>
              <Badge tone="neutral" className="font-mono">
                {settings.maxDetections}
              </Badge>
            </div>
            <Slider
              id="max-detections"
              min={10}
              max={300}
              step={10}
              value={settings.maxDetections}
              onChange={(value) => update({ maxDetections: value })}
              className="mt-2"
            />
            <p className="mt-1.5 text-[11px] leading-4 text-ink-faint">
              Caps how many objects the model may return for one image.
            </p>
          </div>
        </div>
      ) : null}

      {(uploadProgress > 0 && uploadProgress < 1) ||
      error ||
      showSlowStartMessage ||
      !firebaseReady ||
      (firebaseReady && !apiReady) ||
      job?.error ? (
        <div className="space-y-2.5 border-t border-line px-4 py-3 sm:px-5">
          {uploadProgress > 0 && uploadProgress < 1 ? (
            <div>
              <div className="mb-1.5 flex justify-between text-[11px] text-ink-muted">
                <span>Uploading to Firebase Storage</span>
                <span className="font-mono">
                  {Math.round(uploadProgress * 100)}%
                </span>
              </div>
              <ProgressBar value={uploadProgress} />
            </div>
          ) : null}

          {showSlowStartMessage ? (
            <p className="text-xs text-ink-muted" role="status" aria-live="polite">
              Cold start in progress — the Cloud Run instance is waking up.
              This can take up to a minute.
            </p>
          ) : null}

          {(error || job?.error) && (
            <p className="text-xs text-danger">{error ?? job?.error}</p>
          )}

          {!firebaseReady ? (
            <p className="text-xs text-warning">
              Uploads are disabled — missing env vars:{" "}
              {missingConfig.join(", ")}.
            </p>
          ) : null}

          {firebaseReady && !apiReady ? (
            <p className="text-xs text-ink-muted">
              Firebase is configured. Add NEXT_PUBLIC_DETECTION_API_URL to call
              the Cloud Run detection service.
            </p>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
