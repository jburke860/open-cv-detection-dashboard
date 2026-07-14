"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  createDetectionJob,
  subscribeToDetectionJob,
  type DetectionJobRecord,
  type InferenceOptions,
} from "@/lib/detectionPipeline";

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const SLOW_START_MESSAGE_DELAY_MS = 5000;

export interface UploadPreview {
  file: File;
  previewUrl: string;
  width: number;
  height: number;
}

function readImageSize(src: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () =>
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("Failed to read uploaded image"));
    image.src = src;
  });
}

export function validateUploadFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return "Upload a JPG, PNG, or WebP image.";
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return "Images must be smaller than 10 MB.";
  }
  return null;
}

/**
 * Owns the full lifecycle of one live-inference upload: local preview,
 * Firebase upload, Cloud Run job creation, and Firestore status updates.
 */
export function useDetectionJobRunner() {
  const [preview, setPreview] = useState<UploadPreview | null>(null);
  const [job, setJob] = useState<DetectionJobRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [slowStartArmed, setSlowStartArmed] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      unsubscribeRef.current?.();
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const jobPending = job?.status === "queued" || job?.status === "running";
  const showSlowStartMessage = slowStartArmed && (busy || jobPending);

  useEffect(() => {
    if (!busy && !jobPending) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSlowStartArmed(true);
    }, SLOW_START_MESSAGE_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [busy, jobPending]);

  const clearJob = useCallback(() => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    setJob(null);
    setUploadProgress(0);
    setError(null);
  }, []);

  const selectFile = useCallback(
    async (file: File | null) => {
      clearJob();

      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      setPreview(null);

      if (!file) {
        return;
      }

      const validationError = validateUploadFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      previewUrlRef.current = previewUrl;

      try {
        const size = await readImageSize(previewUrl);
        setPreview({ file, previewUrl, ...size });
      } catch (readError) {
        URL.revokeObjectURL(previewUrl);
        previewUrlRef.current = null;
        setError(
          readError instanceof Error
            ? readError.message
            : "Failed to read uploaded image"
        );
      }
    },
    [clearJob]
  );

  const run = useCallback(
    async (options: InferenceOptions, fileOverride?: File) => {
      const file = fileOverride ?? preview?.file;
      if (!file) {
        setError("Choose an image first.");
        return;
      }

      setBusy(true);
      setError(null);
      setUploadProgress(0);
      setSlowStartArmed(false);
      unsubscribeRef.current?.();

      try {
        const jobId = await createDetectionJob({
          file,
          ...options,
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
      }
    },
    [preview]
  );

  const reset = useCallback(() => {
    void selectFile(null);
  }, [selectFile]);

  return {
    preview,
    job,
    busy,
    uploadProgress,
    error,
    showSlowStartMessage,
    selectFile,
    run,
    reset,
  };
}
