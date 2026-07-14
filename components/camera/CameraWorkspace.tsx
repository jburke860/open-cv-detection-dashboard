"use client";

import { Aperture, Camera, CameraOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { InferenceSettingsFields } from "@/components/workspace/InferenceSettingsFields";
import { ResultExplorer } from "@/components/workspace/ResultExplorer";
import { jobStatusBadge } from "@/components/workspace/UploadControls";
import {
  DEFAULT_INFERENCE_OPTIONS,
  DETECTION_MODELS,
  isFirebaseConfigured,
  type InferenceOptions,
} from "@/lib/detectionPipeline";
import { useDetectionJobRunner } from "@/lib/useDetectionJobRunner";
import type { WorkspaceResult } from "@/lib/workspaceTypes";

export function CameraWorkspace() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [settings, setSettings] = useState<InferenceOptions>(
    DEFAULT_INFERENCE_OPTIONS
  );

  const runner = useDetectionJobRunner();
  const firebaseReady = isFirebaseConfigured();

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function startCamera() {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStreaming(true);
    } catch (error) {
      setCameraError(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Camera access was denied. Allow camera permissions and try again."
          : error instanceof Error
            ? error.message
            : "Failed to start the camera"
      );
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStreaming(false);
  }

  async function captureAndDetect() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) {
      setCameraError("The camera feed is not ready yet.");
      return;
    }

    setCapturing(true);
    setCameraError(null);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Canvas capture is not supported in this browser");
      }
      context.drawImage(video, 0, 0);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.92)
      );
      if (!blob) {
        throw new Error("Failed to capture a frame");
      }

      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, 19);
      const file = new File([blob], `camera-${timestamp}.jpg`, {
        type: "image/jpeg",
      });

      await runner.selectFile(file);
      await runner.run(settings, file);
    } catch (error) {
      setCameraError(
        error instanceof Error ? error.message : "Failed to capture frame"
      );
    } finally {
      setCapturing(false);
    }
  }

  const result: WorkspaceResult | null = runner.preview
    ? {
        key: runner.job?.id ?? `camera-${runner.preview.previewUrl}`,
        title: runner.preview.file.name,
        imageSrc: runner.preview.previewUrl,
        width: runner.job?.result?.width ?? runner.preview.width,
        height: runner.job?.result?.height ?? runner.preview.height,
        model:
          runner.job?.result?.model ??
          (DETECTION_MODELS.find((model) => model.id === settings.model)
            ?.label ??
            "YOLOv8n"),
        detections: runner.job?.result?.detections ?? [],
        kind: "upload",
        job: runner.job ?? undefined,
        runtimeMs: runner.job?.result?.runtimeMs,
      }
    : null;

  const jobActive =
    runner.busy ||
    runner.job?.status === "queued" ||
    runner.job?.status === "running";

  const overlayMessage = result
    ? jobActive
      ? "Detection in progress…"
      : runner.job?.status === "complete" && result.detections.length === 0
        ? "No objects were detected above the threshold."
        : runner.job?.status === "failed"
          ? (runner.job.error ?? "Detection failed.")
          : !runner.job
            ? "Frame captured — detection starting…"
            : undefined
    : undefined;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Capture settings"
          subtitle="Applied when a frame is sent through the detection pipeline"
        />
        <CardBody>
          <InferenceSettingsFields
            settings={settings}
            onChange={setSettings}
            disabled={jobActive}
          />
          {!firebaseReady ? (
            <p className="mt-3 text-xs text-warning">
              Camera detection needs the Firebase environment variables to be
              configured.
            </p>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Camera feed"
          subtitle="Frames are only uploaded when you press capture — the live feed never leaves your device"
          actions={
            <div className="flex items-center gap-2">
              {streaming ? (
                <>
                  <Button
                    variant="primary"
                    icon={<Aperture className="h-4 w-4" />}
                    disabled={capturing || jobActive || !firebaseReady}
                    onClick={() => void captureAndDetect()}
                  >
                    {capturing || jobActive
                      ? "Detecting…"
                      : "Capture & Detect"}
                  </Button>
                  <Button
                    icon={<CameraOff className="h-4 w-4" />}
                    onClick={stopCamera}
                  >
                    Stop
                  </Button>
                </>
              ) : (
                <Button
                  variant="primary"
                  icon={<Camera className="h-4 w-4" />}
                  onClick={() => void startCamera()}
                >
                  Start camera
                </Button>
              )}
            </div>
          }
        />
        <div className="relative bg-surface-0">
          <video
            ref={videoRef}
            playsInline
            muted
            className={`mx-auto max-h-105 w-auto ${streaming ? "block" : "hidden"}`}
          />
          {!streaming ? (
            <div className="flex min-h-56 flex-col items-center justify-center gap-2 text-sm text-ink-muted">
              <Camera className="h-8 w-8 text-ink-faint" />
              The camera is off. Start it to capture a frame for detection.
            </div>
          ) : null}
        </div>
        {cameraError ? (
          <p className="border-t border-line px-5 py-3 text-xs text-danger">
            {cameraError}
          </p>
        ) : null}
      </Card>

      {result ? (
        <ResultExplorer
          key={result.key}
          result={result}
          threshold={settings.confidenceThreshold}
          headerBadges={
            <Badge
              tone={jobStatusBadge(runner.job).tone}
              dot
              pulse={jobActive}
            >
              {jobStatusBadge(runner.job).label}
            </Badge>
          }
          overlayMessage={overlayMessage}
        />
      ) : null}
    </div>
  );
}
