"use client";

import { ImagePlus, Play, Trash2, X } from "lucide-react";
import { useMemo, useRef, useState, type DragEvent } from "react";

import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { InferenceSettingsFields } from "@/components/workspace/InferenceSettingsFields";
import { ResultExplorer } from "@/components/workspace/ResultExplorer";
import { cn } from "@/lib/cn";
import {
  DEFAULT_INFERENCE_OPTIONS,
  DETECTION_MODELS,
  isFirebaseConfigured,
  type InferenceOptions,
} from "@/lib/detectionPipeline";
import { useBatchQueue, type BatchItem } from "@/lib/useBatchQueue";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/useDetectionJobRunner";
import type { WorkspaceResult } from "@/lib/workspaceTypes";

function statusBadge(item: BatchItem): { tone: BadgeTone; label: string } {
  switch (item.status) {
    case "pending":
      return { tone: "neutral", label: "Queued" };
    case "uploading":
      return { tone: "warning", label: "Uploading" };
    case "processing":
      return { tone: "warning", label: "Processing" };
    case "complete":
      return { tone: "success", label: "Complete" };
    case "failed":
      return { tone: "danger", label: "Failed" };
  }
}

function itemToResult(
  item: BatchItem,
  settings: InferenceOptions
): WorkspaceResult {
  const modelLabel =
    DETECTION_MODELS.find((model) => model.id === settings.model)?.label ??
    "YOLO11n";

  return {
    key: `${item.id}-${item.job?.id ?? "local"}`,
    title: item.file.name,
    imageSrc: item.previewUrl,
    width: item.job?.result?.width ?? item.width,
    height: item.job?.result?.height ?? item.height,
    model: item.job?.result?.model ?? modelLabel,
    detections: item.job?.result?.detections ?? [],
    kind: "upload",
    job: item.job ?? undefined,
    runtimeMs: item.job?.result?.runtimeMs,
  };
}

export function BatchWorkspace() {
  const queue = useBatchQueue();
  const [settings, setSettings] = useState<InferenceOptions>(
    DEFAULT_INFERENCE_OPTIONS
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const firebaseReady = isFirebaseConfigured();
  const pendingCount = queue.items.filter(
    (item) => item.status === "pending"
  ).length;
  const completedCount = queue.items.filter(
    (item) => item.status === "complete"
  ).length;
  const failedCount = queue.items.filter(
    (item) => item.status === "failed"
  ).length;

  const selectedItem =
    queue.items.find((item) => item.id === selectedId) ?? queue.items[0] ?? null;

  const aggregate = useMemo(() => {
    const completed = queue.items.filter((item) => item.status === "complete");
    const classCounts = new Map<string, number>();
    let totalDetections = 0;

    for (const item of completed) {
      for (const detection of item.job?.result?.detections ?? []) {
        if (detection.confidence < settings.confidenceThreshold) continue;
        totalDetections += 1;
        classCounts.set(
          detection.label,
          (classCounts.get(detection.label) ?? 0) + 1
        );
      }
    }

    return {
      totalDetections,
      classCounts: [...classCounts.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [queue.items, settings.confidenceThreshold]);

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    const files = [...(event.dataTransfer.files ?? [])];
    if (files.length > 0) {
      void queue.addFiles(files);
    }
  }

  const selectedResult = selectedItem
    ? itemToResult(selectedItem, settings)
    : null;

  const overlayMessage = selectedItem
    ? selectedItem.status === "pending"
      ? "Queued — start the batch to run detection."
      : selectedItem.status === "uploading" ||
          selectedItem.status === "processing"
        ? "Detection in progress…"
        : selectedItem.status === "failed"
          ? (selectedItem.error ?? "This image failed to process.")
          : selectedItem.job?.result?.detections?.length === 0
            ? "No objects were detected above the run threshold."
            : undefined
    : undefined;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Batch settings"
          subtitle="Applied to every image in the queue when you start the batch"
          actions={
            <Button
              variant="primary"
              icon={<Play className="h-4 w-4" />}
              disabled={
                pendingCount === 0 || queue.running || !firebaseReady
              }
              onClick={() => void queue.start(settings)}
            >
              {queue.running
                ? "Processing…"
                : `Run batch (${pendingCount})`}
            </Button>
          }
        />
        <CardBody>
          <InferenceSettingsFields
            settings={settings}
            onChange={setSettings}
            disabled={queue.running}
          />
          {!firebaseReady ? (
            <p className="mt-3 text-xs text-warning">
              Batch processing needs the Firebase environment variables to be
              configured.
            </p>
          ) : null}
        </CardBody>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={cn(
              "flex flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-6 text-center transition",
              dragActive
                ? "border-accent bg-accent-soft"
                : "border-line-strong bg-surface-1 hover:border-accent/60"
            )}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPTED_IMAGE_TYPES.join(",")}
              className="sr-only"
              onChange={(event) => {
                const files = [...(event.target.files ?? [])];
                if (files.length > 0) {
                  void queue.addFiles(files);
                }
                event.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex flex-col items-center gap-1.5"
            >
              <ImagePlus className="h-6 w-6 text-accent" />
              <span className="text-sm font-medium text-ink">
                Drop images here <span className="text-accent">or browse</span>
              </span>
              <span className="text-xs text-ink-faint">
                Add multiple JPG, PNG, or WebP files · up to 10 MB each
              </span>
            </button>
          </div>

          <Card>
            <CardHeader
              title={`Queue (${queue.items.length})`}
              subtitle={
                queue.items.length > 0
                  ? `${completedCount} complete · ${failedCount} failed`
                  : "Add images to build a batch"
              }
              actions={
                completedCount + failedCount > 0 ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Trash2 className="h-3.5 w-3.5" />}
                    onClick={() => queue.clearFinished()}
                    disabled={queue.running}
                  >
                    Clear finished
                  </Button>
                ) : undefined
              }
            />
            <ul className="max-h-130 divide-y divide-line overflow-y-auto">
              {queue.items.length === 0 ? (
                <li className="px-4 py-8 text-center text-xs text-ink-faint">
                  The queue is empty.
                </li>
              ) : (
                queue.items.map((item) => {
                  const badge = statusBadge(item);
                  const selected = selectedItem?.id === item.id;
                  const detectionCount =
                    item.job?.result?.detections?.length ?? null;
                  return (
                    <li key={item.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedId(item.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            setSelectedId(item.id);
                          }
                        }}
                        className={cn(
                          "flex w-full cursor-pointer items-center gap-3 px-3.5 py-2.5 text-left transition",
                          selected ? "bg-accent-soft" : "hover:bg-surface-2"
                        )}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.previewUrl}
                          alt={item.file.name}
                          className="h-11 w-11 shrink-0 rounded-lg border border-line object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-ink">
                            {item.file.name}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <Badge
                              tone={badge.tone}
                              dot
                              pulse={
                                item.status === "uploading" ||
                                item.status === "processing"
                              }
                              className="px-2 py-0 text-[10px]"
                            >
                              {badge.label}
                            </Badge>
                            {detectionCount !== null ? (
                              <span className="font-mono text-[10px] text-ink-faint">
                                {detectionCount} objs
                              </span>
                            ) : null}
                          </div>
                          {item.status === "uploading" ? (
                            <ProgressBar
                              value={item.uploadProgress}
                              className="mt-1.5"
                            />
                          ) : null}
                          {item.error && item.status === "failed" ? (
                            <p className="mt-1 truncate text-[10px] text-danger">
                              {item.error}
                            </p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          aria-label={`Remove ${item.file.name}`}
                          disabled={
                            item.status === "uploading" ||
                            item.status === "processing"
                          }
                          onClick={(event) => {
                            event.stopPropagation();
                            queue.removeItem(item.id);
                            if (selectedId === item.id) {
                              setSelectedId(null);
                            }
                          }}
                          className="shrink-0 rounded-md p-1 text-ink-faint transition hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </Card>

          {completedCount > 0 ? (
            <Card>
              <CardHeader
                title="Batch totals"
                subtitle={`Across ${completedCount} processed image${completedCount === 1 ? "" : "s"} at the current threshold`}
              />
              <CardBody>
                <p className="font-mono text-2xl font-semibold text-ink">
                  {aggregate.totalDetections}
                  <span className="ml-2 text-sm font-normal text-ink-muted">
                    total detections
                  </span>
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {aggregate.classCounts.map(([label, count]) => (
                    <Badge key={label} tone="neutral" className="capitalize">
                      {label}
                      <span className="ml-1 font-mono text-accent">
                        {count}
                      </span>
                    </Badge>
                  ))}
                </div>
              </CardBody>
            </Card>
          ) : null}
        </div>

        <div className="min-w-0">
          {selectedResult ? (
            <ResultExplorer
              key={selectedResult.key}
              result={selectedResult}
              threshold={settings.confidenceThreshold}
              headerBadges={
                selectedItem ? (
                  <Badge
                    tone={statusBadge(selectedItem).tone}
                    dot
                    pulse={
                      selectedItem.status === "uploading" ||
                      selectedItem.status === "processing"
                    }
                  >
                    {statusBadge(selectedItem).label}
                  </Badge>
                ) : undefined
              }
              overlayMessage={overlayMessage}
            />
          ) : (
            <div className="flex min-h-80 items-center justify-center rounded-2xl border border-dashed border-line-strong bg-surface-1 text-sm text-ink-muted">
              Add images to the queue to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
