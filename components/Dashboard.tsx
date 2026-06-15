"use client";

import { useEffect, useMemo, useState } from "react";

import { DetectionSummaryCards } from "@/components/DetectionSummaryCards";
import { DetectionTable } from "@/components/DetectionTable";
import { DetectionControls } from "@/components/DetectionControls";
import { DetectionViewer } from "@/components/DetectionViewer";
import { ImageSelector } from "@/components/ImageSelector";
import { UploadInferencePanel } from "@/components/UploadInferencePanel";
import type { DetectionFile } from "@/lib/detectionTypes";
import {
  IMAGE_SAMPLES,
  computeSummary,
  loadDetectionFile,
} from "@/lib/detectionUtils";

export function Dashboard() {
  const [selectedId, setSelectedId] = useState<string>(IMAGE_SAMPLES[0].id);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.2);
  const [detectionCache, setDetectionCache] = useState<
    Record<string, DetectionFile>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedSample =
    IMAGE_SAMPLES.find((sample) => sample.id === selectedId) ?? IMAGE_SAMPLES[0];

  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      setLoading(true);
      setError(null);

      try {
        const entries = await Promise.all(
          IMAGE_SAMPLES.map(async (sample) => {
            const data = await loadDetectionFile(sample.detectionPath);
            return [sample.id, data] as const;
          })
        );

        if (!cancelled) {
          setDetectionCache(Object.fromEntries(entries));
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load detection data"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAll();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeData = detectionCache[selectedId];
  const filteredDetections = useMemo(
    () =>
      (activeData?.detections ?? []).filter(
        (detection) => detection.confidence >= confidenceThreshold
      ),
    [activeData, confidenceThreshold]
  );
  const filteredData = useMemo(
    () =>
      activeData
        ? {
            ...activeData,
            detections: filteredDetections,
          }
        : undefined,
    [activeData, filteredDetections]
  );
  const summary = useMemo(
    () => computeSummary(filteredDetections),
    [filteredDetections]
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">
              Portfolio project • Live Demo
            </p>
            <span className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-xs font-medium text-slate-300">
              Made by Jeremy Burke
            </span>
          </div>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Open Computer Vision Detection Dashboard
          </h1>
          <p className="mt-4 max-w-6xl text-base leading-7 text-slate-300">
          Upload an image or select a built-in sample scene to run live YOLOv8 object detection through a Firebase + Cloud Run pipeline. The demo uses YOLOv8n pretrained weights for fast detection of common objects such as people, vehicles, bicycles, and traffic-scene elements, then returns an annotated image plus JSON and CSV detection outputs.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 text-xs">
            {[
              "Next.js",
              "TypeScript",
              "Tailwind CSS",
              "Firebase",
              "Cloud Run",
              "YOLOv8",
              "Public urban scenes",
            ].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-slate-300"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
        <UploadInferencePanel />

        <ImageSelector
          samples={IMAGE_SAMPLES}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />

        {loading && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-6 py-10 text-center text-slate-400">
            Loading precomputed detections…
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-6 py-4 text-rose-200">
            {error}
          </div>
        )}

        {!loading && !error && activeData && filteredData && (
          <>
            <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 sm:p-5">
              <h2 className="text-xl font-semibold text-white">
                {selectedSample.title}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {selectedSample.description}
              </p>
            </section>

            <DetectionControls
              data={activeData}
              detections={filteredDetections}
              threshold={confidenceThreshold}
              onThresholdChange={setConfidenceThreshold}
            />
            <DetectionViewer key={selectedId} data={filteredData} />
            <DetectionSummaryCards summary={summary} />

            {Object.keys(summary.classCounts).length > 0 && (
              <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                  Class counts
                </h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(summary.classCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([label, count]) => (
                      <span
                        key={label}
                        className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-sm capitalize text-slate-200"
                      >
                        {label}{" "}
                        <span className="font-semibold text-cyan-300">
                          {count}
                        </span>
                      </span>
                    ))}
                </div>
              </section>
            )}

            <DetectionTable detections={filteredDetections} />
          </>
        )}

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="text-lg font-semibold text-slate-100">Why I built this</h2>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              I built this project to demonstrate an end-to-end computer vision workflow,
              not just a static model output. The goal was to show how a user-facing web
              app can accept an image upload, queue an inference job, process it in the
              cloud, and return usable detection artifacts. This mirrors how production
              AI tools are often structured: frontend interaction, secure file storage,
              job tracking, backend inference, and downloadable results.
            </p>
          </article>

          <article className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="text-lg font-semibold text-slate-100">
              What this project demonstrates
            </h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-300">
              <li>Next.js and TypeScript frontend development</li>
              <li>Firebase Authentication, Storage, and Firestore integration</li>
              <li>Cloud Run FastAPI backend deployment</li>
              <li>YOLOv8/OpenCV object detection</li>
              <li>Asynchronous job status tracking</li>
              <li>Annotated image, JSON, and CSV result generation</li>
              <li>A deployable portfolio demo with both sample images and live uploads</li>
            </ul>
          </article>
        </section>
      </main>

      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        Made by Jeremy Burke • Open CV Detection Dashboard • Public urban scene samples
      </footer>
    </div>
  );
}
