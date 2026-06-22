"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

import {
  detectionsToCsv,
  downloadAnnotatedImage,
  downloadRemoteUrl,
  downloadTextFile,
  safeFilename,
} from "@/lib/detectionArtifacts";
import {
  createDetectionJob,
  getDetectionArtifactUrl,
  getMissingFirebaseConfig,
  isDetectionApiConfigured,
  isFirebaseConfigured,
  subscribeToDetectionJob,
  type DetectionJobRecord,
} from "@/lib/detectionPipeline";
import type { Detection } from "@/lib/detectionTypes";
import { formatConfidence } from "@/lib/detectionUtils";

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const SLOW_START_MESSAGE_DELAY_MS = 5000;

function getStatusLabel(status?: DetectionJobRecord["status"]) {
  switch (status) {
    case "queued":
      return "Queued";
    case "running":
      return "Running";
    case "complete":
      return "Complete";
    case "failed":
      return "Failed";
    default:
      return "Ready";
  }
}

function statusClass(status?: DetectionJobRecord["status"]) {
  switch (status) {
    case "complete":
      return "border-emerald-400/40 bg-emerald-400/10 text-emerald-200";
    case "failed":
      return "border-rose-400/40 bg-rose-400/10 text-rose-200";
    case "queued":
    case "running":
      return "border-amber-400/40 bg-amber-400/10 text-amber-200";
    default:
      return "border-slate-700 bg-slate-950 text-slate-300";
  }
}

function getImageSize(src: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };
    image.onerror = () => reject(new Error("Failed to read uploaded image"));
    image.src = src;
  });
}

function hasDetections(value: Detection[] | undefined): value is Detection[] {
  return Array.isArray(value) && value.length > 0;
}

export function UploadInferencePanel() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.25);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [job, setJob] = useState<DetectionJobRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [showSlowStartMessage, setShowSlowStartMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const firebaseReady = isFirebaseConfigured();
  const apiReady = isDetectionApiConfigured();
  const missingConfig = useMemo(() => getMissingFirebaseConfig(), []);
  const baseName = safeFilename(file?.name ?? job?.inputName ?? "upload");
  const detections = job?.result?.detections;
  const canDownloadResults =
    job?.status === "complete" &&
    (Boolean(job.result?.annotatedImageUrl || job.result?.annotatedImagePath) ||
      hasDetections(detections));

  useEffect(() => {
    return () => {
      unsubscribeRef.current?.();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!busy) {
      return;
    }

    const timer = window.setTimeout(() => {
      setShowSlowStartMessage(true);
    }, SLOW_START_MESSAGE_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [busy]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setError(null);
    setJob(null);
    setShowSlowStartMessage(false);
    setUploadProgress(0);
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    if (!nextFile) {
      setFile(null);
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(nextFile.type)) {
      setFile(null);
      setError("Upload a JPG, PNG, or WebP image.");
      return;
    }

    setFile(nextFile);
    setPreviewUrl(URL.createObjectURL(nextFile));
  }

  async function handleStartJob() {
    if (!file) {
      setError("Choose one image first.");
      return;
    }

    if (!firebaseReady) {
      setError("Add the Firebase environment variables before starting a job.");
      return;
    }

    setBusy(true);
    setError(null);
    setShowSlowStartMessage(false);
    setUploadProgress(0);
    unsubscribeRef.current?.();

    try {
      const jobId = await createDetectionJob({
        file,
        confidenceThreshold,
        onUploadProgress: setUploadProgress,
      });

      unsubscribeRef.current = subscribeToDetectionJob(
        jobId,
        setJob,
        (snapshotError) => setError(snapshotError.message)
      );
    } catch (startError) {
      setError(
        startError instanceof Error
          ? startError.message
          : "Failed to create detection job"
      );
    } finally {
      setBusy(false);
      setShowSlowStartMessage(false);
    }
  }

  async function handleAnnotatedDownload() {
    if (!job) return;

    setError(null);

    try {
      const artifactUrl = await getDetectionArtifactUrl(job, "annotatedImage");
      if (artifactUrl) {
        downloadRemoteUrl(artifactUrl, `${baseName}-annotated.png`);
        return;
      }

      if (!previewUrl || !hasDetections(detections)) {
        setError("No annotated image or detection boxes are available yet.");
        return;
      }

      const size = await getImageSize(previewUrl);
      await downloadAnnotatedImage({
        imageSrc: previewUrl,
        sourceWidth: job.result?.width ?? size.width,
        sourceHeight: job.result?.height ?? size.height,
        detections,
        filename: `${baseName}-annotated.png`,
      });
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "Failed to download annotated image"
      );
    }
  }

  async function handleJsonDownload() {
    if (!job) return;

    setError(null);

    try {
      const artifactUrl = await getDetectionArtifactUrl(job, "json");
      if (artifactUrl) {
        downloadRemoteUrl(artifactUrl, `${baseName}-detections.json`);
        return;
      }

      downloadTextFile(
        `${baseName}-detections.json`,
        JSON.stringify(job, null, 2),
        "application/json"
      );
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "Failed to download JSON"
      );
    }
  }

  async function handleCsvDownload() {
    if (!job) return;

    setError(null);

    try {
      const artifactUrl = await getDetectionArtifactUrl(job, "csv");
      if (artifactUrl) {
        downloadRemoteUrl(artifactUrl, `${baseName}-detections.csv`);
        return;
      }

      if (!hasDetections(detections)) {
        setError("No detection rows are available for CSV export yet.");
        return;
      }

      downloadTextFile(
        `${baseName}-detections.csv`,
        detectionsToCsv(detections),
        "text/csv"
      );
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "Failed to download CSV"
      );
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70">
      <div className="border-b border-slate-800 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              Live upload inference
            </h2>
            <p className="mt-1 text-sm text-slate-400">
            Upload an image to run live object detection and download the annotated image, JSON results, and CSV results.
            </p>
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-medium ${statusClass(
              job?.status
            )}`}
          >
            {getStatusLabel(job?.status)}
          </span>
        </div>
      </div>

      <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,1.05fr)]">
        <div className="space-y-4">
          <label className="block rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-5 text-center transition hover:border-cyan-400/70">
            <input
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(",")}
              onChange={handleFileChange}
              className="sr-only"
            />
            <span className="block text-sm font-medium text-slate-100">
              Choose one image
            </span>
            <span className="mt-1 block text-xs text-slate-400">
              JPG, PNG, or WebP. The image is previewed locally before detection begins.
            </span>
          </label>

          {previewUrl ? (
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt={file?.name ?? "Uploaded preview"}
                className="max-h-[360px] w-full object-contain"
              />
            </div>
          ) : (
            <div className="flex min-h-64 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-sm text-slate-500">
              No upload selected
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label
                htmlFor="upload-confidence-threshold"
                className="text-sm font-medium text-slate-200"
              >
                Confidence threshold
              </label>
              <span className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
                {formatConfidence(confidenceThreshold)}
              </span>
            </div>
            <input
              id="upload-confidence-threshold"
              type="range"
              min="0"
              max="0.95"
              step="0.05"
              value={confidenceThreshold}
              onChange={(event) =>
                setConfidenceThreshold(Number(event.target.value))
              }
              className="mt-3 h-2 w-full cursor-pointer accent-cyan-400"
            />
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
            <h3 className="text-sm font-semibold text-slate-100">
              How this demo works
            </h3>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-300">
              <li>Upload an image to the dashboard.</li>
              <li>The image is stored securely in Firebase Storage.</li>
              <li>A Firestore job is created that tracks inference status.</li>
              <li>The image is processed with YOLOv8/OpenCV on Cloud Run.</li>
              <li>Download the annotated image, JSON, or CSV results.</li>
            </ol>
          </div>

          {!firebaseReady && (
            <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
              Add these env vars to enable uploads: {missingConfig.join(", ")}.
            </div>
          )}

          {firebaseReady && !apiReady && (
            <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-300">
              Firebase is configured. Add NEXT_PUBLIC_DETECTION_API_URL to call
              Cloud Run directly, or trigger Cloud Run from the Firestore job
              record.
            </div>
          )}

          {uploadProgress > 0 && uploadProgress < 1 && (
            <div>
              <div className="mb-2 flex justify-between text-xs text-slate-400">
                <span>Uploading</span>
                <span>{Math.round(uploadProgress * 100)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-cyan-400"
                  style={{ width: `${uploadProgress * 100}%` }}
                />
              </div>
            </div>
          )}

          {job && (
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-medium text-slate-100">Job {job.id}</span>
                <span>{getStatusLabel(job.status)}</span>
              </div>
              {(job.message || job.error) && (
                <p className="mt-2 text-slate-400">{job.error ?? job.message}</p>
              )}
              {hasDetections(detections) && (
                <p className="mt-2 text-slate-400">
                  {detections.length} detection rows available.
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-100">
              {error}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleStartJob}
              disabled={!file || busy || !firebaseReady}
              className="rounded-lg border border-cyan-400 bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500"
            >
              {busy ? "Starting..." : "Start Object Detection"}
            </button>
            <button
              type="button"
              onClick={handleAnnotatedDownload}
              disabled={!canDownloadResults}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-medium text-slate-100 transition hover:border-cyan-400 hover:text-cyan-200 disabled:cursor-not-allowed disabled:text-slate-600"
            >
              Download annotated image
            </button>
            <button
              type="button"
              onClick={handleJsonDownload}
              disabled={job?.status !== "complete"}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-medium text-slate-100 transition hover:border-cyan-400 hover:text-cyan-200 disabled:cursor-not-allowed disabled:text-slate-600"
            >
              Download JSON
            </button>
            <button
              type="button"
              onClick={handleCsvDownload}
              disabled={job?.status !== "complete"}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-medium text-slate-100 transition hover:border-cyan-400 hover:text-cyan-200 disabled:cursor-not-allowed disabled:text-slate-600"
            >
              Download CSV
            </button>
          </div>

          {showSlowStartMessage && (
            <p className="text-sm text-slate-400" role="status" aria-live="polite">
              This may take a minute.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
