import { ArrowDown } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { GitHubIcon } from "@/components/ui/GitHubIcon";

const TECH_TAGS = [
  "Next.js",
  "TypeScript",
  "Tailwind CSS",
  "Firebase",
  "Cloud Run",
  "FastAPI",
  "YOLOv8",
];

export function Hero() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-line bg-surface-1 px-5 py-6 sm:px-7 sm:py-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-40 blur-3xl"
        style={{ background: "var(--accent-soft)" }}
      />
      <div className="relative">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
            Portfolio project · Live demo
          </p>
          <Badge tone="neutral">Made by Jeremy Burke</Badge>
        </div>
        <h1 className="mt-2.5 max-w-2xl text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Open Computer Vision Detection Dashboard
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-muted">
          Upload an image or pick a sample scene, run live YOLOv8 object
          detection through a Firebase + Cloud Run pipeline, and export the
          annotated image plus JSON and CSV detection outputs.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {TECH_TAGS.map((tag) => (
            <Badge key={tag} tone="neutral">
              {tag}
            </Badge>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-2 text-sm">
          <a
            href="#workspace"
            className="inline-flex items-center gap-1.5 rounded-lg border border-accent-strong bg-accent px-3.5 py-2 font-semibold text-on-accent shadow-[0_0_18px_var(--glow)] transition hover:brightness-110"
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
      </div>
    </section>
  );
}
