"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";
import { useMemo } from "react";

import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import type { Detection } from "@/lib/detectionTypes";
import { computeSummary, formatConfidence } from "@/lib/detectionUtils";

interface Insight {
  tone: "success" | "warning" | "info";
  text: string;
}

const TONE_ICONS: Record<Insight["tone"], LucideIcon> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
};

const TONE_CLASSES: Record<Insight["tone"], string> = {
  success: "text-success",
  warning: "text-warning",
  info: "text-info",
};

/** Rule-based observations computed from the actual detections on screen. */
function buildInsights(detections: Detection[], threshold: number): Insight[] {
  const insights: Insight[] = [];
  const summary = computeSummary(detections);

  if (detections.length === 0) {
    insights.push({
      tone: "info",
      text:
        threshold > 0.3
          ? `No detections at ${formatConfidence(threshold)}. Try lowering the confidence threshold.`
          : "No detections in view. Try another image or lower the threshold.",
    });
    return insights;
  }

  const lowConfidence = detections.filter((d) => d.confidence < 0.4);
  if (lowConfidence.length > 0) {
    insights.push({
      tone: "warning",
      text: `${lowConfidence.length} detection${lowConfidence.length === 1 ? "" : "s"} below 40% confidence — review them or raise the threshold to filter them out.`,
    });
  } else if (detections.every((d) => d.confidence >= 0.75)) {
    insights.push({
      tone: "success",
      text: "All detections are high confidence (≥ 75%).",
    });
  } else {
    insights.push({
      tone: "success",
      text: `Average confidence is ${formatConfidence(summary.averageConfidence)} across ${detections.length} detections.`,
    });
  }

  const dominant = Object.entries(summary.classCounts).sort(
    (a, b) => b[1] - a[1]
  )[0];
  if (dominant && dominant[1] / detections.length > 0.5 && summary.uniqueClasses > 1) {
    insights.push({
      tone: "info",
      text: `Scene is dominated by "${dominant[0]}" (${dominant[1]} of ${detections.length} detections).`,
    });
  }

  if (threshold < 0.2 && detections.length > 20) {
    insights.push({
      tone: "info",
      text: `Dense scene at a low threshold — try 40–50% for fewer, higher-quality detections.`,
    });
  }

  const tiny = detections.filter(
    (d) => d.box.width * d.box.height < 32 * 32
  );
  if (tiny.length > 0) {
    insights.push({
      tone: "info",
      text: `${tiny.length} very small object${tiny.length === 1 ? "" : "s"} (under 32×32px) — small boxes are more error-prone at this model size.`,
    });
  }

  return insights.slice(0, 4);
}

export function InsightsPanel({
  detections,
  threshold,
}: {
  detections: Detection[];
  threshold: number;
}) {
  const insights = useMemo(
    () => buildInsights(detections, threshold),
    [detections, threshold]
  );

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-1.5">
            <Lightbulb className="h-3.5 w-3.5 text-accent" />
            Insights
          </span>
        }
        subtitle="Computed from the detections in view"
      />
      <ul className="divide-y divide-line">
        {insights.map((insight) => {
          const Icon = TONE_ICONS[insight.tone];
          return (
            <li
              key={insight.text}
              className="flex items-start gap-2.5 px-4 py-3 text-xs leading-5 text-ink-muted"
            >
              <Icon
                className={cn(
                  "mt-0.5 h-3.5 w-3.5 shrink-0",
                  TONE_CLASSES[insight.tone]
                )}
              />
              {insight.text}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
