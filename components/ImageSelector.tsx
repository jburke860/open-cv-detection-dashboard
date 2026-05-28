"use client";

import type { ImageSample } from "@/lib/detectionTypes";
import { withAssetVersion } from "@/lib/detectionUtils";

interface ImageSelectorProps {
  samples: readonly ImageSample[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function ImageSelector({
  samples,
  selectedId,
  onSelect,
}: ImageSelectorProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Sample images</h2>
          <p className="mt-1 text-sm text-slate-400">
            Public urban-scene photos with precomputed YOLO detections
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {samples.map((sample) => {
          const isSelected = sample.id === selectedId;
          return (
            <button
              key={sample.id}
              type="button"
              onClick={() => onSelect(sample.id)}
              className={`group overflow-hidden rounded-xl border text-left transition ${
                isSelected
                  ? "border-cyan-400/80 bg-cyan-400/10 ring-1 ring-cyan-400/50"
                  : "border-slate-800 bg-slate-900/70 hover:border-slate-600 hover:bg-slate-900"
              }`}
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-slate-950">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={withAssetVersion(sample.imagePath)}
                  alt={sample.title}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                />
                {isSelected && (
                  <span className="absolute right-2 top-2 rounded-full bg-cyan-400 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-950">
                    Selected
                  </span>
                )}
              </div>
              <div className="space-y-1 p-3">
                <p className="text-sm font-medium text-slate-100">{sample.title}</p>
                <p className="line-clamp-2 text-xs text-slate-400">
                  {sample.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
