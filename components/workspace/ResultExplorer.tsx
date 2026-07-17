"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";

import { AnalyticsPanel } from "@/components/workspace/AnalyticsPanel";
import { DetectionsPanel } from "@/components/workspace/DetectionsPanel";
import { SummaryCard } from "@/components/workspace/SummaryCard";
import { ViewerCard, type ClassChip } from "@/components/workspace/ViewerCard";
import type { WorkspaceResult } from "@/lib/workspaceTypes";

/**
 * Full result view (viewer + detections + insights + exports) around one
 * WorkspaceResult. Parents should key this component by result.key so
 * filters and selection reset between images.
 */
export function ResultExplorer({
  result,
  threshold,
  headerBadges,
  overlayMessage,
}: {
  result: WorkspaceResult;
  threshold: number;
  headerBadges?: ReactNode;
  overlayMessage?: string;
}) {
  const [classFilter, setClassFilter] = useState<Set<string> | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);

  const thresholdFiltered = useMemo(
    () =>
      result.detections.filter(
        (detection) => detection.confidence >= threshold
      ),
    [result.detections, threshold]
  );

  const classChips: ClassChip[] = useMemo(() => {
    const counts = new Map<string, number>();
    for (const detection of thresholdFiltered) {
      counts.set(detection.label, (counts.get(detection.label) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count }));
  }, [thresholdFiltered]);

  const visibleDetections = useMemo(
    () =>
      classFilter
        ? thresholdFiltered.filter((detection) =>
            classFilter.has(detection.label)
          )
        : thresholdFiltered,
    [thresholdFiltered, classFilter]
  );

  const toggleClass = useCallback((label: string | null) => {
    if (label === null) {
      setClassFilter(null);
      return;
    }
    setClassFilter((previous) => {
      const next = new Set(previous ?? []);
      if (next.has(label)) {
        next.delete(label);
        return next.size === 0 ? null : next;
      }
      next.add(label);
      return next;
    });
  }, []);

  const handleActiveId = useCallback((id: number | null) => {
    setActiveId(id);
  }, []);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      {/* The viewer stretches to match the rail height, and the rail's
          detections list flexes, so neither column leaves a gap. */}
      <ViewerCard
        result={result}
        visibleDetections={visibleDetections}
        classChips={classChips}
        classFilter={classFilter}
        onToggleClass={toggleClass}
        activeId={activeId}
        onActiveId={handleActiveId}
        headerBadges={headerBadges}
        overlayMessage={overlayMessage}
      />
      <div className="flex flex-col gap-4">
        <SummaryCard
          detections={visibleDetections}
          runtimeMs={result.runtimeMs}
        />
        <DetectionsPanel
          detections={visibleDetections}
          activeId={activeId}
          onActiveId={handleActiveId}
        />
      </div>
      <div className="min-w-0 xl:col-span-2">
        <AnalyticsPanel
          result={result}
          visibleDetections={visibleDetections}
          threshold={threshold}
        />
      </div>
    </div>
  );
}
