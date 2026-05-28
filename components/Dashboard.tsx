"use client";

import { useEffect, useMemo, useState } from "react";

import { DetectionSummaryCards } from "@/components/DetectionSummaryCards";
import { DetectionTable } from "@/components/DetectionTable";
import { DetectionViewer } from "@/components/DetectionViewer";
import { ImageSelector } from "@/components/ImageSelector";
import type { DetectionFile } from "@/lib/detectionTypes";
import {
  IMAGE_SAMPLES,
  computeSummary,
  loadDetectionFile,
} from "@/lib/detectionUtils";

export function Dashboard() {
  const [selectedId, setSelectedId] = useState<string>(IMAGE_SAMPLES[0].id);
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
  const summary = useMemo(
    () => computeSummary(activeData?.detections ?? []),
    [activeData]
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">
            Portfolio project • Local MVP
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Open Computer Vision Detection Dashboard
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
            Static Next.js dashboard for precomputed YOLO detections on public
            urban-scene images—bounding boxes, confidence scores, class
            summaries, and frontend visualization without live inference,
            accounts, or private data.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 text-xs">
            {[
              "Next.js",
              "TypeScript",
              "Tailwind CSS",
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

        {!loading && !error && activeData && (
          <>
            <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 sm:p-5">
              <h2 className="text-xl font-semibold text-white">
                {selectedSample.title}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {selectedSample.description}
              </p>
            </section>

            <DetectionViewer data={activeData} />
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

            <DetectionTable detections={activeData.detections} />
          </>
        )}

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="text-lg font-semibold text-slate-100">How it works</h2>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-300">
              <li>Download or collect public urban-scene sample images.</li>
              <li>
                Run YOLOv8 locally once with{" "}
                <code className="rounded bg-slate-950 px-1.5 py-0.5 text-cyan-300">
                  scripts/generate_detections.py
                </code>
                .
              </li>
              <li>Save bounding boxes, labels, and confidence scores as JSON.</li>
              <li>
                Load the static files in this Next.js dashboard and render boxes
                over each image.
              </li>
            </ol>
            <p className="mt-4 text-sm text-slate-400">
              All images are public, non-sensitive samples intended for portfolio
              demonstration only.
            </p>
          </article>

          <article className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="text-lg font-semibold text-slate-100">
              Limitations & future improvements
            </h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-300">
              <li>No live webcam or video inference in this MVP.</li>
              <li>No user uploads, authentication, or database.</li>
              <li>Detections are precomputed offline, not served by a model API.</li>
              <li>Not positioned as production-ready surveillance software.</li>
            </ul>
            <p className="mt-4 text-sm text-slate-400">
              Future versions may add live inference, FastAPI model serving, camera
              streams, and security-oriented monitoring workflows after the static
              visualization MVP is solid.
            </p>
          </article>
        </section>
      </main>

      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        Open CV Detection Dashboard • Static local MVP • Public urban scene samples
      </footer>
    </div>
  );
}
