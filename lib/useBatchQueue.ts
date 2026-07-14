"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  createDetectionJob,
  subscribeToDetectionJob,
  type DetectionJobRecord,
  type InferenceOptions,
} from "@/lib/detectionPipeline";
import { validateUploadFile } from "@/lib/useDetectionJobRunner";

export type BatchItemStatus =
  | "pending"
  | "uploading"
  | "processing"
  | "complete"
  | "failed";

export interface BatchItem {
  id: string;
  file: File;
  previewUrl: string;
  width: number;
  height: number;
  status: BatchItemStatus;
  uploadProgress: number;
  job: DetectionJobRecord | null;
  error: string | null;
}

/** How many images are in flight at once against the detection service. */
const CONCURRENCY = 2;

let nextItemId = 0;

function readImageSize(src: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () =>
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("Failed to read image"));
    image.src = src;
  });
}

export function useBatchQueue() {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [running, setRunning] = useState(false);
  const unsubscribesRef = useRef<Array<() => void>>([]);
  const itemsRef = useRef<BatchItem[]>([]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    const unsubscribes = unsubscribesRef.current;
    return () => {
      // Intentionally read the latest values at unmount time: subscriptions
      // and object URLs accumulate over the queue's lifetime.
      for (const unsubscribe of unsubscribes.splice(0)) {
        unsubscribe();
      }
      for (const item of itemsRef.current) {
        URL.revokeObjectURL(item.previewUrl);
      }
    };
  }, []);

  const updateItem = useCallback(
    (id: string, partial: Partial<BatchItem>) => {
      setItems((current) =>
        current.map((item) =>
          item.id === id ? { ...item, ...partial } : item
        )
      );
    },
    []
  );

  const addFiles = useCallback(async (files: File[]) => {
    const additions: BatchItem[] = [];

    for (const file of files) {
      const validationError = validateUploadFile(file);
      const previewUrl = URL.createObjectURL(file);
      let width = 0;
      let height = 0;

      if (!validationError) {
        try {
          const size = await readImageSize(previewUrl);
          width = size.width;
          height = size.height;
        } catch {
          // Keep the item; it will fail at upload time with a clear error.
        }
      }

      additions.push({
        id: `batch-${nextItemId++}`,
        file,
        previewUrl,
        width,
        height,
        status: validationError ? "failed" : "pending",
        uploadProgress: 0,
        job: null,
        error: validationError,
      });
    }

    setItems((current) => [...current, ...additions]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((current) => {
      const item = current.find((entry) => entry.id === id);
      if (item) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return current.filter((entry) => entry.id !== id);
    });
  }, []);

  const clearFinished = useCallback(() => {
    setItems((current) => {
      for (const item of current) {
        if (item.status === "complete" || item.status === "failed") {
          URL.revokeObjectURL(item.previewUrl);
        }
      }
      return current.filter(
        (item) => item.status !== "complete" && item.status !== "failed"
      );
    });
  }, []);

  const start = useCallback(
    async (settings: InferenceOptions) => {
      const pendingIds = itemsRef.current
        .filter((item) => item.status === "pending")
        .map((item) => item.id);

      if (pendingIds.length === 0 || running) {
        return;
      }

      setRunning(true);
      let cursor = 0;

      const processItem = async (id: string) => {
        const item = itemsRef.current.find((entry) => entry.id === id);
        if (!item || item.status !== "pending") {
          return;
        }

        updateItem(id, { status: "uploading", error: null });

        try {
          const jobId = await Promise.resolve().then(async () => {
            const created = createDetectionJob({
              file: item.file,
              ...settings,
              onUploadProgress: (progress) => {
                updateItem(id, { uploadProgress: progress });
                if (progress >= 1) {
                  updateItem(id, { status: "processing" });
                }
              },
            });
            return created;
          });

          const unsubscribe = subscribeToDetectionJob(
            jobId,
            (job) => {
              updateItem(id, {
                job,
                status:
                  job.status === "complete"
                    ? "complete"
                    : job.status === "failed"
                      ? "failed"
                      : "processing",
                error: job.error ?? null,
              });
            },
            (error) => updateItem(id, { error: error.message })
          );
          unsubscribesRef.current.push(unsubscribe);
        } catch (error) {
          updateItem(id, {
            status: "failed",
            error:
              error instanceof Error
                ? error.message
                : "Failed to process image",
          });
        }
      };

      const worker = async () => {
        while (cursor < pendingIds.length) {
          const id = pendingIds[cursor];
          cursor += 1;
          await processItem(id);
        }
      };

      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, pendingIds.length) }, () =>
          worker()
        )
      );

      setRunning(false);
    },
    [running, updateItem]
  );

  return { items, running, addFiles, removeItem, clearFinished, start };
}
