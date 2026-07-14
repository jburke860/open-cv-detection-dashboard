import { cn } from "@/lib/cn";

export function ProgressBar({
  value,
  tone = "accent",
  className,
}: {
  /** 0..1 */
  value: number;
  tone?: "accent" | "success" | "warning";
  className?: string;
}) {
  const width = `${Math.max(0, Math.min(1, value)) * 100}%`;
  const toneClass =
    tone === "success"
      ? "bg-success"
      : tone === "warning"
        ? "bg-warning"
        : "bg-accent";

  return (
    <div
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-surface-3",
        className
      )}
    >
      <div
        className={cn("h-full rounded-full transition-all", toneClass)}
        style={{ width }}
      />
    </div>
  );
}
