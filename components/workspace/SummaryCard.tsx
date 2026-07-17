"use client";

import { useMemo } from "react";

import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { colorForLabel } from "@/lib/detectionArtifacts";
import type { Detection } from "@/lib/detectionTypes";
import { computeSummary, formatConfidence } from "@/lib/detectionUtils";

/**
 * Concept-style right-rail summary: headline numbers plus per-class
 * share bars for the currently visible detections.
 */
export function SummaryCard({
  detections,
  runtimeMs,
}: {
  detections: Detection[];
  runtimeMs?: number;
}) {
  const summary = useMemo(() => computeSummary(detections), [detections]);

  const classRows = useMemo(() => {
    const total = detections.length || 1;
    return Object.entries(summary.classCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({
        label,
        count,
        share: (count / total) * 100,
        color: colorForLabel(label),
      }));
  }, [detections.length, summary.classCounts]);

  return (
    <Card>
      <CardHeader
        title="Detection summary"
        subtitle={
          runtimeMs !== undefined
            ? `Cloud Run inference · ${(runtimeMs / 1000).toFixed(2)}s`
            : "Precomputed sample detections"
        }
      />
      <CardBody>
        <div className="grid grid-cols-3 divide-x divide-line rounded-lg border border-line bg-surface-2/60">
          <SummaryStat
            value={String(summary.totalDetections)}
            label="Detections"
          />
          <SummaryStat
            value={String(summary.uniqueClasses)}
            label="Classes"
          />
          <SummaryStat
            value={formatConfidence(summary.averageConfidence)}
            label="Avg conf."
          />
        </div>

        {classRows.length > 0 ? (
          <div className="mt-4">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
              Detections by class
            </p>
            <ul className="mt-2.5 space-y-2.5">
              {classRows.map((row) => (
                <li key={row.label}>
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="flex items-center gap-1.5 capitalize text-ink">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: row.color }}
                      />
                      {row.label}
                    </span>
                    <span className="font-mono text-[11px] text-ink-muted">
                      {row.count}{" "}
                      <span className="text-ink-faint">
                        ({row.share.toFixed(0)}%)
                      </span>
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${row.share}%`,
                        backgroundColor: row.color,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-4 text-xs text-ink-muted">
            No detections to summarize yet.
          </p>
        )}
      </CardBody>
    </Card>
  );
}

function SummaryStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="px-3 py-3 text-center">
      <p className="font-display text-xl font-medium text-ink">{value}</p>
      <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-ink-faint">
        {label}
      </p>
    </div>
  );
}
