import { ArrowDown, ScanSearch } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { GitHubIcon } from "@/components/ui/GitHubIcon";
import { colorForLabel } from "@/lib/detectionArtifacts";
import { withAssetVersion } from "@/lib/detectionUtils";

const TECH_TAGS = [
  "Next.js",
  "TypeScript",
  "Tailwind CSS",
  "Firebase",
  "Cloud Run",
  "FastAPI",
  "Ultralytics YOLO",
  "RT-DETR",
];

/**
 * Real YOLO11n detections from public/detections/urban-intersection.json,
 * converted to percentages of the 1331 × 749 source image so the hero
 * illustration shows genuine model output, not invented boxes.
 */
const HERO_BOXES = [
  { label: "motorcycle", conf: "71%", x: 87.8, y: 68.9, w: 10.5, h: 10.1, showLabel: true },
  { label: "motorcycle", conf: "69%", x: 26.4, y: 68.8, w: 13.4, h: 16.6, showLabel: true },
  { label: "car", conf: "66%", x: 40.6, y: 64.5, w: 14.4, h: 11.7, showLabel: true },
  { label: "motorcycle", conf: "62%", x: 3.1, y: 69.8, w: 14.8, h: 24.4, showLabel: true },
  { label: "person", conf: "52%", x: 66.0, y: 64.1, w: 1.7, h: 6.5, showLabel: false },
  { label: "car", conf: "48%", x: 95.3, y: 64.0, w: 4.7, h: 7.6, showLabel: false },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-line bg-surface-1">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full opacity-50 blur-3xl"
        style={{ background: "var(--accent-soft)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-16 h-64 w-64 rounded-full opacity-30 blur-3xl"
        style={{ background: "var(--accent-soft)" }}
      />

      <div className="relative grid items-center gap-8 px-5 py-7 sm:px-8 sm:py-9 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
              Portfolio project // Live demo
            </p>
            <Badge tone="neutral">Made by Jeremy Burke</Badge>
          </div>

          <h1 className="mt-4 max-w-xl font-display text-3xl font-bold leading-[1.1] tracking-tight text-ink sm:text-[2.5rem]">
            Detect. Understand.
            <br />
            <span className="text-accent">Deploy with confidence.</span>
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-6 text-ink-muted">
            Upload an image or pick a sample scene, run live object detection
            with seven models — YOLOv8 through YOLO12, RT-DETR, and
            open-vocabulary YOLO-World — through a Firebase + Cloud Run
            pipeline, and export the annotated image plus JSON and CSV
            outputs.
          </p>

          <div className="mt-5 flex flex-wrap gap-2 text-sm">
            {/* On desktop the workspace is already visible below the hero,
                so the jump link only earns its place on small screens. */}
            <a
              href="#workspace"
              className="inline-flex items-center gap-1.5 rounded-lg border border-accent-strong bg-accent px-3.5 py-2 font-semibold text-on-accent shadow-[0_0_18px_var(--glow)] transition hover:brightness-110 lg:hidden"
            >
              <ArrowDown className="h-4 w-4" />
              Try the demo
            </a>
            <a
              href="https://github.com/jburke860/open-cv-detection-dashboard"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-surface-1 px-3.5 py-2 font-medium text-ink transition hover:border-accent hover:text-accent"
            >
              <GitHubIcon className="h-4 w-4" />
              View source
            </a>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            {TECH_TAGS.map((tag) => (
              <Badge key={tag} tone="neutral">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        <div className="hidden lg:block">
          <HeroIllustration />
        </div>
      </div>
    </section>
  );
}

/** Annotated sample frame with real detections and a scanning sweep. */
function HeroIllustration() {
  return (
    <figure className="relative overflow-hidden rounded-xl border border-line-strong bg-surface-0 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
      <div className="flex items-center justify-between border-b border-line bg-surface-1 px-3 py-2">
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-ink-muted">
          <ScanSearch className="h-3.5 w-3.5 text-accent" />
          urban-intersection.jpg
        </span>
        <span className="font-mono text-[10px] text-ink-faint">
          YOLO11n · 22 objects
        </span>
      </div>

      <div className="relative aspect-[16/9] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={withAssetVersion("/images/urban-intersection.jpg")}
          alt="Urban intersection sample with YOLO11 bounding boxes"
          className="h-full w-full object-cover"
        />

        {HERO_BOXES.map((box, index) => {
          const color = colorForLabel(box.label);
          return (
            <div
              key={`${box.label}-${index}`}
              className="cv-box-in absolute rounded-[3px] border-2"
              style={{
                left: `${box.x}%`,
                top: `${box.y}%`,
                width: `${box.w}%`,
                height: `${box.h}%`,
                borderColor: color,
                animationDelay: `${0.15 + index * 0.12}s`,
              }}
            >
              {box.showLabel ? (
                <span
                  className="absolute -top-4.5 left-0 whitespace-nowrap rounded px-1 py-px font-mono text-[9px] font-semibold"
                  style={{ backgroundColor: "rgba(2, 6, 23, 0.88)", color }}
                >
                  {box.label} {box.conf}
                </span>
              ) : null}
            </div>
          );
        })}

        <div
          aria-hidden
          className="cv-scan-line pointer-events-none absolute inset-x-0 h-px bg-accent shadow-[0_0_14px_2px_var(--glow)]"
        />
      </div>

      <figcaption className="flex items-center justify-between border-t border-line bg-surface-1 px-3 py-2 text-[10px] text-ink-faint">
        <span>Real YOLO11n output from the sample gallery</span>
        <span className="flex items-center gap-1 font-medium text-success">
          <span className="cv-pulse-dot h-1.5 w-1.5 rounded-full bg-success" />
          Pipeline live
        </span>
      </figcaption>
    </figure>
  );
}
