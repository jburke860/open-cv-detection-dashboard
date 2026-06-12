"use client";

import { useState } from "react";

import type { Detection, DetectionFile } from "@/lib/detectionTypes";
import {
  detectionsToCsv,
  downloadAnnotatedDetectionFile,
  downloadTextFile,
  safeFilename,
} from "@/lib/detectionArtifacts";
import { formatConfidence } from "@/lib/detectionUtils";

interface DetectionControlsProps {
  data: DetectionFile;
  detections: Detection[];
  threshold: number;
  onThresholdChange: (value: number) => void;
}

export function DetectionControls({
  data,
  detections,
  threshold,
  onThresholdChange,
}: DetectionControlsProps) {
  const [exportError, setExportError] = useState<string | null>(null);
  const baseName = safeFilename(data.title);

  function handleJsonDownload() {
    setExportError(null);
    const payload = {
      ...data,
      confidenceThreshold: threshold,
      detections,
    };
    downloadTextFile(
      `${baseName}-detections.json`,
      JSON.stringify(payload, null, 2),
      "application/json"
    );
  }

  function handleCsvDownload() {
    setExportError(null);
    downloadTextFile(
      `${baseName}-detections.csv`,
      detectionsToCsv(detections),
      "text/csv"
    );
  }

  async function handleImageDownload() {
    setExportError(null);
    try {
      await downloadAnnotatedDetectionFile(data, detections);
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : "Failed to export image"
      );
    }
  }

  return (
    <section className="grid gap-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto]">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              Review controls
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {detections.length} detections at {formatConfidence(threshold)} or higher
            </p>
          </div>
          <span className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
            Threshold {formatConfidence(threshold)}
          </span>
        </div>

        <label className="mt-5 block text-sm font-medium text-slate-200">
          Confidence threshold
        </label>
        <input
          type="range"
          min="0"
          max="0.95"
          step="0.05"
          value={threshold}
          onChange={(event) => onThresholdChange(Number(event.target.value))}
          className="mt-3 h-2 w-full cursor-pointer accent-cyan-400"
        />
        <div className="mt-2 flex justify-between text-xs text-slate-500">
          <span>0%</span>
          <span>95%</span>
        </div>
        {exportError && (
          <p className="mt-3 text-sm text-rose-300">{exportError}</p>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-2 lg:justify-end">
        <button
          type="button"
          onClick={handleImageDownload}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-medium text-slate-100 transition hover:border-cyan-400 hover:text-cyan-200"
        >
          Download annotated image
        </button>
        <button
          type="button"
          onClick={handleJsonDownload}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-medium text-slate-100 transition hover:border-cyan-400 hover:text-cyan-200"
        >
          Download JSON
        </button>
        <button
          type="button"
          onClick={handleCsvDownload}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-medium text-slate-100 transition hover:border-cyan-400 hover:text-cyan-200"
        >
          Download CSV
        </button>
      </div>
    </section>
  );
}
