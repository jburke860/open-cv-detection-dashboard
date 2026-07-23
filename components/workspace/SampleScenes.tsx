"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/cn";
import type { ImageSample } from "@/lib/detectionTypes";
import { withAssetVersion } from "@/lib/detectionUtils";

export function SampleScenes({
  samples,
  selectedId,
  onSelect,
}: {
  samples: readonly ImageSample[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <section>
      <div className="flex items-baseline gap-2.5">
        <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ink">
          Sample scenes
        </h2>
        <p className="text-xs text-ink-muted">
          Public urban-scene photos with precomputed YOLO11n detections
        </p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {samples.map((sample) => {
          const selected = sample.id === selectedId;
          return (
            <button
              key={sample.id}
              type="button"
              onClick={() => onSelect(sample.id)}
              className={cn(
                "group relative overflow-hidden rounded-xl border text-left transition",
                selected
                  ? "border-accent shadow-[0_0_16px_var(--glow)]"
                  : "border-line hover:border-line-strong"
              )}
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-surface-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={withAssetVersion(sample.imagePath)}
                  alt={sample.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
                {selected ? (
                  <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-on-accent">
                    <Check className="h-3 w-3" />
                  </span>
                ) : null}
              </div>
              <div className="bg-surface-1 px-2.5 py-2">
                <p
                  className={cn(
                    "truncate text-xs font-semibold",
                    selected ? "text-accent" : "text-ink"
                  )}
                >
                  {sample.title}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-ink-faint">
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
