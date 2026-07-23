"use client";

import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { Sidebar } from "@/components/shell/Sidebar";
import { GitHubIcon } from "@/components/ui/GitHubIcon";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { Badge } from "@/components/ui/Badge";

const GITHUB_URL = "https://github.com/jburke860/open-cv-detection-dashboard";

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/": {
    title: "Detection Workspace",
    subtitle: "Upload, detect, analyze, and export results",
  },
  "/camera": {
    title: "Live Camera",
    subtitle: "Capture a frame and run detection on it",
  },
  "/batch": {
    title: "Batch Processing",
    subtitle: "Queue multiple images through the detection pipeline",
  },
};

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const page = PAGE_TITLES[pathname] ?? PAGE_TITLES["/"];

  return (
    <div className="flex min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 border-r border-line lg:block">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      {mobileNavOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-64 border-r border-line shadow-2xl">
            <Sidebar onNavigate={() => setMobileNavOpen(false)} />
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setMobileNavOpen(false)}
              className="absolute right-3 top-4 text-ink-muted hover:text-ink"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-line bg-surface-0/85 backdrop-blur">
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                aria-label="Open navigation"
                onClick={() => setMobileNavOpen(true)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface-1 text-ink-muted lg:hidden"
              >
                <Menu className="h-4 w-4" />
              </button>
              <div className="min-w-0">
                <h1 className="truncate font-mono text-xs font-semibold uppercase tracking-[0.14em] text-accent sm:text-sm">
                  {page.title}
                </h1>
                <p className="hidden truncate text-xs text-ink-muted sm:block">
                  {page.subtitle}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge tone="accent" dot pulse className="hidden sm:inline-flex">
                Live Demo
              </Badge>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                aria-label="View source on GitHub"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface-1 text-ink-muted transition hover:border-accent hover:text-accent"
              >
                <GitHubIcon className="h-4 w-4" />
              </a>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6">
          {/* Cap the content width so ultrawide monitors don't stretch the
              sample thumbnails and viewer into oversized, empty layouts. */}
          <div className="mx-auto w-full max-w-[1520px]">{children}</div>
        </main>

        <footer className="border-t border-line px-4 py-4 text-center text-xs text-ink-faint sm:px-6">
          Built with Next.js, Firebase, Cloud Run, and Ultralytics YOLO · Made by Jeremy
          Burke
        </footer>
      </div>
    </div>
  );
}
