"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { Detection, DetectionFile } from "@/lib/detectionTypes";
import { formatConfidence, scaleBox, withAssetVersion } from "@/lib/detectionUtils";

const XL_BREAKPOINT_PX = 1280;

function useMinWidth(minWidth: number) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(min-width: ${minWidth}px)`);
    const onChange = () => setMatches(mediaQuery.matches);

    onChange();
    mediaQuery.addEventListener("change", onChange);
    return () => mediaQuery.removeEventListener("change", onChange);
  }, [minWidth]);

  return matches;
}

interface DetectionViewerProps {
  data: DetectionFile;
}

const BOX_COLORS = [
  "border-cyan-400 text-cyan-300",
  "border-emerald-400 text-emerald-300",
  "border-amber-400 text-amber-300",
  "border-fuchsia-400 text-fuchsia-300",
  "border-sky-400 text-sky-300",
  "border-rose-400 text-rose-300",
];

function colorForLabel(label: string) {
  let hash = 0;
  for (let i = 0; i < label.length; i += 1) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  return BOX_COLORS[Math.abs(hash) % BOX_COLORS.length];
}

export function DetectionViewer({ data }: DetectionViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [activeId, setActiveId] = useState<number | null>(null);
  const isXl = useMinWidth(XL_BREAKPOINT_PX);

  const updateDisplaySize = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const img = container.querySelector("img");
    if (!img) return;

    setDisplaySize({
      width: img.clientWidth,
      height: img.clientHeight,
    });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const img = container.querySelector("img");
    if (!img) return;

    updateDisplaySize();

    const observer = new ResizeObserver(() => {
      updateDisplaySize();
    });
    observer.observe(img);

    window.addEventListener("resize", updateDisplaySize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateDisplaySize);
    };
  }, [data.id, data.image, updateDisplaySize]);

  const sortedDetections = [...data.detections].sort(
    (a, b) => b.confidence - a.confidence
  );

  const sidebarHeight =
    isXl && displaySize.height > 0 ? displaySize.height : undefined;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Detection viewer</h2>
          <p className="mt-1 text-sm text-slate-400">
            Bounding boxes scaled to the rendered image size
          </p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-400">
          <span className="text-slate-300">{data.model}</span>
          <span className="mx-2 text-slate-600">•</span>
          {data.width} × {data.height}px
        </div>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
        <div
          ref={containerRef}
          className="relative self-start overflow-hidden rounded-xl border border-slate-800 bg-slate-950"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={withAssetVersion(data.image)}
            alt={data.title}
            className="block h-auto w-full"
            onLoad={updateDisplaySize}
          />
          {displaySize.width > 0 &&
            sortedDetections.map((detection) => (
              <DetectionBox
                key={detection.id}
                detection={detection}
                data={data}
                displaySize={displaySize}
                isActive={activeId === detection.id}
                onHover={setActiveId}
              />
            ))}
        </div>

        <aside
          className="flex w-full flex-col self-start overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 xl:w-auto"
          style={sidebarHeight !== undefined ? { height: sidebarHeight } : undefined}
        >
          <div className="shrink-0 border-b border-slate-800 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-100">
              Detected objects
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Hover a row to highlight its box
            </p>
          </div>
          <ul
            className={`min-h-0 flex-1 divide-y divide-slate-800 overflow-y-auto overscroll-contain ${
              isXl ? "" : "max-h-80"
            }`}
          >
            {sortedDetections.length === 0 ? (
              <li className="px-4 py-6 text-sm text-slate-400">
                No objects detected for this sample.
              </li>
            ) : (
              sortedDetections.map((detection) => (
                <li key={detection.id}>
                  <button
                    type="button"
                    className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition ${
                      activeId === detection.id
                        ? "bg-cyan-400/10"
                        : "hover:bg-slate-800/60"
                    }`}
                    onMouseEnter={() => setActiveId(detection.id)}
                    onMouseLeave={() => setActiveId(null)}
                    onFocus={() => setActiveId(detection.id)}
                    onBlur={() => setActiveId(null)}
                  >
                    <div>
                      <p className="text-sm font-medium capitalize text-slate-100">
                        {detection.label}
                      </p>
                      <p className="text-xs text-slate-400">
                        Box {detection.box.width}×{detection.box.height}px
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-cyan-300">
                      {formatConfidence(detection.confidence)}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </aside>
      </div>
    </section>
  );
}

function DetectionBox({
  detection,
  data,
  displaySize,
  isActive,
  onHover,
}: {
  detection: Detection;
  data: DetectionFile;
  displaySize: { width: number; height: number };
  isActive: boolean;
  onHover: (id: number | null) => void;
}) {
  const scaled = scaleBox(
    detection.box,
    data.width,
    data.height,
    displaySize.width,
    displaySize.height
  );
  const colorClass = colorForLabel(detection.label);

  return (
    <div
      className={`absolute border-2 transition ${colorClass} ${
        isActive ? "z-20 bg-white/10 shadow-[0_0_0_1px_rgba(255,255,255,0.35)]" : "z-10"
      }`}
      style={{
        left: scaled.left,
        top: scaled.top,
        width: scaled.width,
        height: scaled.height,
      }}
      onMouseEnter={() => onHover(detection.id)}
      onMouseLeave={() => onHover(null)}
    >
      <span
        className={`absolute -top-6 left-0 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-slate-950/90 ${colorClass.split(" ")[1]}`}
      >
        {detection.label} {formatConfidence(detection.confidence)}
      </span>
    </div>
  );
}
