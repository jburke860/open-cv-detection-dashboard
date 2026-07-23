"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Card, CardHeader } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/cn";
import { colorForLabel } from "@/lib/detectionArtifacts";
import type { Detection } from "@/lib/detectionTypes";
import { formatConfidence } from "@/lib/detectionUtils";

type SortKey = "confidence" | "size" | "label";

function sortDetections(detections: Detection[], sortKey: SortKey) {
  const sorted = [...detections];
  switch (sortKey) {
    case "size":
      return sorted.sort(
        (a, b) => b.box.width * b.box.height - a.box.width * a.box.height
      );
    case "label":
      return sorted.sort(
        (a, b) =>
          a.label.localeCompare(b.label) || b.confidence - a.confidence
      );
    default:
      return sorted.sort((a, b) => b.confidence - a.confidence);
  }
}

export function DetectionsPanel({
  detections,
  activeId,
  onActiveId,
}: {
  detections: Detection[];
  activeId: number | null;
  onActiveId: (id: number | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("confidence");

  const rows = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    const filtered = trimmed
      ? detections.filter((detection) =>
          detection.label.toLowerCase().includes(trimmed)
        )
      : detections;
    return sortDetections(filtered, sortKey);
  }, [detections, query, sortKey]);

  return (
    <Card>
      <CardHeader
        title={`Detections (${detections.length})`}
        subtitle="Click a row to highlight and inspect"
      />
      <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search objects…"
            className="w-full rounded-lg border border-line bg-surface-2 py-1.5 pl-8 pr-2 text-xs text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
          />
        </div>
        <Select
          aria-label="Sort detections"
          value={sortKey}
          onChange={(value) => setSortKey(value as SortKey)}
          className="shrink-0 [&>select]:py-1.5 [&>select]:text-xs"
        >
          <option value="confidence">Confidence</option>
          <option value="size">Box size</option>
          <option value="label">Label</option>
        </Select>
      </div>

      <ul className="max-h-105 divide-y divide-line overflow-y-auto overscroll-contain">
        {rows.length === 0 ? (
          <li className="px-4 py-8 text-center text-xs text-ink-faint">
            {detections.length === 0
              ? "No detections to show."
              : "No detections match your search."}
          </li>
        ) : (
          rows.map((detection) => {
            const color = colorForLabel(detection.label);
            const active = activeId === detection.id;
            return (
              <li key={detection.id}>
                <button
                  type="button"
                  onClick={() => onActiveId(active ? null : detection.id)}
                  onMouseEnter={() => onActiveId(detection.id)}
                  onMouseLeave={() => {
                    if (!active) onActiveId(null);
                  }}
                  className={cn(
                    "w-full px-3.5 py-2.5 text-left transition",
                    active ? "bg-accent-soft" : "hover:bg-surface-2"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="truncate text-sm font-medium capitalize text-ink">
                        {detection.label}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-xs font-semibold text-accent">
                      {formatConfidence(detection.confidence)}
                    </span>
                  </div>
                  <p className="mt-1 pl-4 font-mono text-[11px] text-ink-faint">
                    x{detection.box.x} y{detection.box.y} ·{" "}
                    {detection.box.width}×{detection.box.height}px
                  </p>
                  {active ? (
                    <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 rounded-lg border border-line bg-surface-2 p-2.5 pl-3 font-mono text-[11px] text-ink-muted">
                      <dt>Center</dt>
                      <dd className="text-right text-ink">
                        {Math.round(detection.box.x + detection.box.width / 2)},{" "}
                        {Math.round(detection.box.y + detection.box.height / 2)}
                      </dd>
                      <dt>Area</dt>
                      <dd className="text-right text-ink">
                        {(
                          detection.box.width * detection.box.height
                        ).toLocaleString()}{" "}
                        px²
                      </dd>
                      <dt>Detection ID</dt>
                      <dd className="text-right text-ink">#{detection.id}</dd>
                    </dl>
                  ) : null}
                </button>
              </li>
            );
          })
        )}
      </ul>
    </Card>
  );
}
