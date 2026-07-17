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
          Or choose a sample scene
        </h2>
        <p className="hidden text-xs text-ink-muted sm:block">
          Public urban-scene photos with precomputed YOLO11n detections
        </p>
      </div>
      <div className="mt-2.5 grid grid-cols-3 gap-2.5 sm:grid-cols-5">
        {samples.map((sample) => {
          const selected = sample.id === selectedId;
          return (
            <button
              key={sample.id}
              type="button"
              onClick={() => onSelect(sample.id)}
              title={sample.description}
              className={cn(
                "group relative overflow-hidden rounded-lg border text-left transition",
                selected
                  ? "border-accent shadow-[0_0_14px_var(--glow)]"
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
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent pt-6" />
                <p
                  className={cn(
                    "absolute bottom-1.5 left-2 right-2 truncate text-[11px] font-semibold",
                    selected ? "text-accent" : "text-white"
                  )}
                >
                  {sample.title}
                </p>
                {selected ? (
                  <span className="absolute right-1.5 top-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-accent text-on-accent">
                    <Check className="h-3 w-3" />
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
