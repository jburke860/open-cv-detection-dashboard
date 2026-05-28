import type { DetectionSummary } from "@/lib/detectionTypes";
import { formatConfidence } from "@/lib/detectionUtils";

interface DetectionSummaryCardsProps {
  summary: DetectionSummary;
}

const cards = [
  {
    key: "total",
    label: "Total detections",
    getValue: (summary: DetectionSummary) => summary.totalDetections.toString(),
  },
  {
    key: "classes",
    label: "Unique classes",
    getValue: (summary: DetectionSummary) => summary.uniqueClasses.toString(),
  },
  {
    key: "highest",
    label: "Highest confidence",
    getValue: (summary: DetectionSummary) =>
      summary.totalDetections > 0
        ? formatConfidence(summary.highestConfidence)
        : "—",
  },
  {
    key: "average",
    label: "Average confidence",
    getValue: (summary: DetectionSummary) =>
      summary.totalDetections > 0
        ? formatConfidence(summary.averageConfidence)
        : "—",
  },
] as const;

export function DetectionSummaryCards({ summary }: DetectionSummaryCardsProps) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article
          key={card.key}
          className="rounded-xl border border-slate-800 bg-slate-900/70 p-4"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {card.label}
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-50">
            {card.getValue(summary)}
          </p>
        </article>
      ))}
    </section>
  );
}
