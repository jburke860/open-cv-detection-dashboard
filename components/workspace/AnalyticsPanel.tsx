"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DownloadsCard } from "@/components/workspace/DownloadsCard";
import { InsightsPanel } from "@/components/workspace/InsightsPanel";
import type { Detection } from "@/lib/detectionTypes";
import type { WorkspaceResult } from "@/lib/workspaceTypes";

const HISTOGRAM_BIN_SIZE = 0.1;

const CONFIDENCE_BANDS = [
  { name: "High (≥ 0.75)", min: 0.75, color: "var(--success)" },
  { name: "Medium (0.5 – 0.75)", min: 0.5, color: "var(--warning)" },
  { name: "Low (< 0.5)", min: 0, color: "var(--danger)" },
];

const TOOLTIP_STYLE = {
  backgroundColor: "var(--surface-2)",
  border: "1px solid var(--line-strong)",
  borderRadius: "0.5rem",
  fontSize: "12px",
  color: "var(--ink)",
};

/**
 * Full-width strip below the viewer: confidence charts, insights, and
 * exports. Headline counts and the per-class breakdown live in the
 * right-rail SummaryCard.
 */
export function AnalyticsPanel({
  result,
  visibleDetections: detections,
  threshold,
}: {
  result: WorkspaceResult;
  visibleDetections: Detection[];
  threshold: number;
}) {
  const histogramData = useMemo(() => {
    const bins = Array.from(
      { length: Math.round(1 / HISTOGRAM_BIN_SIZE) },
      (_, index) => ({
        bin: `${Math.round(index * HISTOGRAM_BIN_SIZE * 100)}–${Math.round(
          (index + 1) * HISTOGRAM_BIN_SIZE * 100
        )}%`,
        count: 0,
      })
    );

    for (const detection of detections) {
      const index = Math.min(
        bins.length - 1,
        Math.floor(detection.confidence / HISTOGRAM_BIN_SIZE)
      );
      bins[index].count += 1;
    }

    return bins;
  }, [detections]);

  const bandData = useMemo(
    () =>
      CONFIDENCE_BANDS.map((band, index) => {
        const upper = index === 0 ? Infinity : CONFIDENCE_BANDS[index - 1].min;
        return {
          name: band.name,
          color: band.color,
          value: detections.filter(
            (d) => d.confidence >= band.min && d.confidence < upper
          ).length,
        };
      }).filter((band) => band.value > 0),
    [detections]
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {detections.length > 0 ? (
        <>
          <Card>
        <CardHeader title="Confidence distribution" />
        <CardBody className="h-56 p-2 sm:p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={histogramData}
              margin={{ top: 4, right: 8, bottom: 0, left: -18 }}
            >
              <XAxis
                dataKey="bin"
                stroke="var(--ink-faint)"
                fontSize={10}
                interval={1}
              />
              <YAxis
                allowDecimals={false}
                stroke="var(--ink-faint)"
                fontSize={11}
              />
              <Tooltip
                cursor={{ fill: "var(--accent-soft)" }}
                contentStyle={TOOLTIP_STYLE}
              />
              <Bar
                dataKey="count"
                fill="var(--accent)"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Confidence bands" />
        <CardBody className="flex h-56 items-center gap-2 p-2 sm:p-3">
          <ResponsiveContainer width="55%" height="100%">
            <PieChart>
              <Pie
                data={bandData}
                dataKey="value"
                nameKey="name"
                innerRadius="55%"
                outerRadius="85%"
                paddingAngle={3}
                stroke="var(--surface-1)"
              >
                {bandData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
          <ul className="flex-1 space-y-2 text-xs">
            {bandData.map((band) => (
              <li
                key={band.name}
                className="flex items-center justify-between gap-2"
              >
                <span className="flex items-center gap-1.5 text-ink-muted">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: band.color }}
                  />
                  {band.name}
                </span>
                <span className="font-mono font-semibold text-ink">
                  {band.value}
                </span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
        </>
      ) : null}
      <InsightsPanel detections={detections} threshold={threshold} />
      <DownloadsCard result={result} visibleDetections={detections} />
    </div>
  );
}
