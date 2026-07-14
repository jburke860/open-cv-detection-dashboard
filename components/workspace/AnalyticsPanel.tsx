"use client";

import { Boxes, Crosshair, Gauge, Layers, Timer } from "lucide-react";
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
import { StatCard } from "@/components/ui/StatCard";
import { colorForLabel } from "@/lib/detectionArtifacts";
import type { Detection } from "@/lib/detectionTypes";
import { computeSummary, formatConfidence } from "@/lib/detectionUtils";

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

export function AnalyticsPanel({
  detections,
  runtimeMs,
}: {
  detections: Detection[];
  runtimeMs?: number;
}) {
  const summary = useMemo(() => computeSummary(detections), [detections]);

  const classData = useMemo(
    () =>
      Object.entries(summary.classCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([label, count]) => ({
          label,
          count,
          fill: colorForLabel(label),
        })),
    [summary.classCounts]
  );

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
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-5">
        <StatCard
          label="Detections"
          value={summary.totalDetections}
          icon={<Boxes className="h-4 w-4" />}
        />
        <StatCard
          label="Classes"
          value={summary.uniqueClasses}
          icon={<Layers className="h-4 w-4" />}
        />
        <StatCard
          label="Highest conf."
          value={formatConfidence(summary.highestConfidence)}
          icon={<Crosshair className="h-4 w-4" />}
        />
        <StatCard
          label="Avg conf."
          value={formatConfidence(summary.averageConfidence)}
          icon={<Gauge className="h-4 w-4" />}
        />
        <StatCard
          label="Inference"
          value={
            runtimeMs !== undefined ? `${(runtimeMs / 1000).toFixed(2)}s` : "—"
          }
          hint={runtimeMs !== undefined ? "Cloud Run runtime" : "Precomputed sample"}
          icon={<Timer className="h-4 w-4" />}
          className="col-span-2 sm:col-span-4 xl:col-span-1"
        />
      </div>

      {detections.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader title="Class frequency" />
            <CardBody className="h-56 p-2 sm:p-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={classData}
                  layout="vertical"
                  margin={{ top: 4, right: 12, bottom: 0, left: 4 }}
                >
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    stroke="var(--ink-faint)"
                    fontSize={11}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={82}
                    stroke="var(--ink-faint)"
                    fontSize={11}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--accent-soft)" }}
                    contentStyle={TOOLTIP_STYLE}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={14}>
                    {classData.map((entry) => (
                      <Cell key={entry.label} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

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
        </div>
      ) : null}
    </div>
  );
}
