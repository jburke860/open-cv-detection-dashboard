"use client";

import {
  Check,
  Copy,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { cn } from "@/lib/cn";
import { colorForLabel } from "@/lib/detectionArtifacts";
import type { Detection } from "@/lib/detectionTypes";
import { formatConfidence, scaleBox } from "@/lib/detectionUtils";
import type { WorkspaceResult } from "@/lib/workspaceTypes";

export type ViewerTab = "annotated" | "original" | "compare" | "data";

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

export interface ClassChip {
  label: string;
  count: number;
}

export function ViewerCard({
  result,
  visibleDetections,
  classChips,
  classFilter,
  onToggleClass,
  activeId,
  onActiveId,
  headerBadges,
  overlayMessage,
}: {
  result: WorkspaceResult;
  visibleDetections: Detection[];
  /** Per-class counts after threshold filtering, before class filtering. */
  classChips: ClassChip[];
  /** null means all classes are visible. */
  classFilter: Set<string> | null;
  onToggleClass: (label: string | null) => void;
  activeId: number | null;
  onActiveId: (id: number | null) => void;
  headerBadges?: ReactNode;
  overlayMessage?: string;
}) {
  const [tab, setTab] = useState<ViewerTab>("annotated");
  const [zoom, setZoom] = useState(1);
  const [comparePos, setComparePos] = useState(50);
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // The component stays mounted across image switches (remounting blanks
  // the stage for a frame), so reset per-image state during render instead.
  const [prevResultKey, setPrevResultKey] = useState(result.key);
  if (prevResultKey !== result.key) {
    setPrevResultKey(result.key);
    setTab("annotated");
    setZoom(1);
    setComparePos(50);
  }

  useEffect(() => {
    const onFullscreenChange = () =>
      setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const zoomIndex = ZOOM_LEVELS.indexOf(zoom);

  function zoomBy(direction: 1 | -1) {
    const index = zoomIndex === -1 ? 2 : zoomIndex;
    const next = ZOOM_LEVELS[index + direction];
    if (next) {
      setZoom(next);
    }
  }

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await cardRef.current?.requestFullscreen();
    }
  }

  async function copyData() {
    await navigator.clipboard.writeText(dataJson());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  function dataJson() {
    return JSON.stringify(
      {
        title: result.title,
        model: result.model,
        width: result.width,
        height: result.height,
        detections: visibleDetections,
      },
      null,
      2
    );
  }

  return (
    <Card
      className={cn("flex min-w-0 flex-col", fullscreen && "h-full rounded-none")}
      // Card renders a <section>; attach the fullscreen ref via wrapper below.
    >
      <div ref={cardRef} className="flex min-h-0 flex-1 flex-col bg-surface-1">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <h2 className="truncate text-sm font-semibold text-ink">
              {result.title}
            </h2>
            <Badge tone="neutral" className="hidden font-mono sm:inline-flex">
              {result.model}
            </Badge>
            <Badge tone="neutral" className="hidden font-mono md:inline-flex">
              {result.width} × {result.height}
            </Badge>
            {headerBadges}
          </div>
          <div className="flex items-center gap-2">
            <Tabs<ViewerTab>
              size="sm"
              items={[
                { value: "annotated", label: "Annotated" },
                { value: "original", label: "Original" },
                { value: "compare", label: "Compare" },
                { value: "data", label: "Data" },
              ]}
              value={tab}
              onChange={setTab}
            />
          </div>
        </div>

        {tab !== "data" ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2">
            <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-0.5">
              <FilterChip
                selected={classFilter === null}
                onClick={() => onToggleClass(null)}
              >
                All
              </FilterChip>
              {classChips.map((chip) => (
                <FilterChip
                  key={chip.label}
                  color={colorForLabel(chip.label)}
                  selected={classFilter?.has(chip.label) ?? false}
                  onClick={() => onToggleClass(chip.label)}
                >
                  {chip.label}
                  <span className="ml-1 font-mono text-[10px] opacity-75">
                    {chip.count}
                  </span>
                </FilterChip>
              ))}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <ViewerIconButton
                label="Zoom out"
                disabled={zoomIndex <= 0}
                onClick={() => zoomBy(-1)}
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </ViewerIconButton>
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="min-w-12 rounded-md px-1 py-1 text-center font-mono text-xs text-ink-muted transition hover:text-ink"
                aria-label="Reset zoom"
              >
                {Math.round(zoom * 100)}%
              </button>
              <ViewerIconButton
                label="Zoom in"
                disabled={zoomIndex === ZOOM_LEVELS.length - 1}
                onClick={() => zoomBy(1)}
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </ViewerIconButton>
              <ViewerIconButton label="Toggle fullscreen" onClick={toggleFullscreen}>
                {fullscreen ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
              </ViewerIconButton>
            </div>
          </div>
        ) : null}

        {tab === "data" ? (
          <div className="relative min-h-0 flex-1">
            <button
              type="button"
              onClick={copyData}
              className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-md border border-line bg-surface-2 px-2 py-1 text-xs text-ink-muted transition hover:text-accent"
            >
              {copied ? (
                <Check className="h-3 w-3" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
            <pre className="max-h-[60vh] overflow-auto p-4 font-mono text-xs leading-relaxed text-ink-muted">
              {dataJson()}
            </pre>
          </div>
        ) : (
          <ViewerStage
            result={result}
            visibleDetections={visibleDetections}
            tab={tab}
            zoom={zoom}
            comparePos={comparePos}
            onComparePos={setComparePos}
            activeId={activeId}
            onActiveId={onActiveId}
            overlayMessage={overlayMessage}
            fullscreen={fullscreen}
          />
        )}
      </div>
    </Card>
  );
}

function FilterChip({
  selected,
  color,
  onClick,
  children,
}: {
  selected: boolean;
  color?: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-xs capitalize transition",
        selected
          ? "border-accent/60 bg-accent-soft font-medium text-accent"
          : "border-line bg-surface-2 text-ink-muted hover:text-ink"
      )}
    >
      {color ? (
        <span
          className="mr-1.5 h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: color }}
        />
      ) : null}
      {children}
    </button>
  );
}

function ViewerIconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line bg-surface-2 text-ink-muted transition hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/** Never blow small images up beyond 2× their natural size at fit zoom. */
const MAX_FIT_UPSCALE = 2;

function ViewerStage({
  result,
  visibleDetections,
  tab,
  zoom,
  comparePos,
  onComparePos,
  activeId,
  onActiveId,
  overlayMessage,
  fullscreen,
}: {
  result: WorkspaceResult;
  visibleDetections: Detection[];
  tab: "annotated" | "original" | "compare";
  zoom: number;
  comparePos: number;
  onComparePos: (value: number) => void;
  activeId: number | null;
  onActiveId: (id: number | null) => void;
  overlayMessage?: string;
  fullscreen: boolean;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  // Layout effect so the first paint already has a measured stage — an
  // effect-driven measurement leaves a blank frame before the image appears.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const measure = () =>
      setStageSize({
        width: stage.clientWidth,
        height: stage.clientHeight,
      });

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  // Fit the image inside the fixed-height stage (like an image viewer),
  // then let zoom scale up from that fitted size.
  const stagePadding = 16;
  const fitScale =
    stageSize.width > 0 && result.width > 0 && result.height > 0
      ? Math.min(
          (stageSize.width - stagePadding) / result.width,
          (stageSize.height - stagePadding) / result.height,
          MAX_FIT_UPSCALE
        )
      : 0;
  const displaySize = {
    width: result.width * fitScale * zoom,
    height: result.height * fitScale * zoom,
  };

  function compareFromPointer(event: ReactPointerEvent<HTMLDivElement>) {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const raw = ((event.clientX - rect.left) / rect.width) * 100;
    onComparePos(Math.max(2, Math.min(98, raw)));
  }

  const showBoxes = tab === "annotated" || tab === "compare";

  return (
    <div
      ref={stageRef}
      className={cn(
        // flex-1 lets the stage absorb whatever height the layout gives the
        // card (e.g. matching the right rail), with a sane floor otherwise.
        "relative flex min-h-0 flex-1 overflow-auto bg-surface-0",
        !fullscreen && "min-h-[clamp(340px,52vh,640px)]"
      )}
    >
      <div
        ref={wrapperRef}
        className="relative m-auto shrink-0"
        style={{ width: displaySize.width, height: displaySize.height }}
        onPointerDown={
          tab === "compare"
            ? (event) => {
                draggingRef.current = true;
                event.currentTarget.setPointerCapture(event.pointerId);
                compareFromPointer(event);
              }
            : undefined
        }
        onPointerMove={
          tab === "compare"
            ? (event) => {
                if (draggingRef.current) compareFromPointer(event);
              }
            : undefined
        }
        onPointerUp={
          tab === "compare"
            ? () => {
                draggingRef.current = false;
              }
            : undefined
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={result.imageSrc}
          alt={result.title}
          className="block h-full w-full select-none"
          draggable={false}
        />

        {showBoxes && displaySize.width > 0 ? (
          <div
            className="absolute inset-0"
            style={
              tab === "compare"
                ? { clipPath: `inset(0 0 0 ${comparePos}%)` }
                : undefined
            }
          >
            {visibleDetections.map((detection) => (
              <BoxOverlay
                key={detection.id}
                detection={detection}
                sourceWidth={result.width}
                sourceHeight={result.height}
                displaySize={displaySize}
                isActive={activeId === detection.id}
                onHover={onActiveId}
              />
            ))}
          </div>
        ) : null}

        {tab === "compare" ? (
          <>
            <div
              className="pointer-events-none absolute inset-y-0 z-30 w-0.5 bg-accent shadow-[0_0_12px_var(--glow)]"
              style={{ left: `${comparePos}%` }}
            />
            <div
              className="pointer-events-none absolute top-1/2 z-30 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full border border-accent bg-surface-1 text-[10px] font-semibold text-accent shadow-lg"
              style={{ left: `${comparePos}%` }}
            >
              ⇔
            </div>
            <span className="pointer-events-none absolute left-2 top-2 z-30 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
              Original
            </span>
            <span className="pointer-events-none absolute right-2 top-2 z-30 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
              Annotated
            </span>
          </>
        ) : null}
      </div>

      {overlayMessage ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-30 flex justify-center px-4">
          <span className="rounded-full border border-line-strong bg-surface-1/95 px-3 py-1.5 text-xs text-ink-muted shadow-lg">
            {overlayMessage}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function BoxOverlay({
  detection,
  sourceWidth,
  sourceHeight,
  displaySize,
  isActive,
  onHover,
}: {
  detection: Detection;
  sourceWidth: number;
  sourceHeight: number;
  displaySize: { width: number; height: number };
  isActive: boolean;
  onHover: (id: number | null) => void;
}) {
  const scaled = scaleBox(
    detection.box,
    sourceWidth,
    sourceHeight,
    displaySize.width,
    displaySize.height
  );
  const color = colorForLabel(detection.label);

  return (
    <div
      className={cn(
        "absolute border-2 transition-shadow",
        isActive ? "z-20 shadow-[0_0_0_2px_rgba(255,255,255,0.4)]" : "z-10"
      )}
      style={{
        left: scaled.left,
        top: scaled.top,
        width: scaled.width,
        height: scaled.height,
        borderColor: color,
        backgroundColor: isActive ? `${color}26` : "transparent",
      }}
      onMouseEnter={() => onHover(detection.id)}
      onMouseLeave={() => onHover(null)}
    >
      <span
        className="absolute -top-5.5 left-0 whitespace-nowrap rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold"
        style={{ backgroundColor: "rgba(2, 6, 23, 0.88)", color }}
      >
        {detection.label} {formatConfidence(detection.confidence)}
      </span>
    </div>
  );
}
