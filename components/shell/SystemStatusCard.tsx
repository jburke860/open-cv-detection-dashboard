"use client";

import { RefreshCw } from "lucide-react";

import { cn } from "@/lib/cn";
import type { ServiceState } from "@/lib/useSystemStatus";
import { useSystemStatus } from "@/lib/useSystemStatus";

function stateLabel(state: ServiceState) {
  switch (state) {
    case "online":
      return "Online";
    case "offline":
      return "Unreachable";
    case "checking":
      return "Checking…";
    default:
      return "Not configured";
  }
}

function stateDotClass(state: ServiceState) {
  switch (state) {
    case "online":
      return "bg-success cv-pulse-dot";
    case "offline":
      return "bg-danger";
    case "checking":
      return "bg-warning";
    default:
      return "bg-ink-faint";
  }
}

export function SystemStatusCard() {
  const status = useSystemStatus();

  return (
    <div className="rounded-xl border border-line bg-surface-2 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
          System status
        </p>
        <button
          type="button"
          aria-label="Refresh system status"
          onClick={status.refresh}
          className="text-ink-faint transition hover:text-accent"
        >
          <RefreshCw
            className={cn(
              "h-3.5 w-3.5",
              status.api === "checking" && "animate-spin"
            )}
          />
        </button>
      </div>
      <ul className="mt-2.5 space-y-2 text-xs">
        <li className="flex items-center justify-between gap-2">
          <span className="text-ink-muted">Cloud Run API</span>
          <span className="flex items-center gap-1.5 text-ink">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                stateDotClass(status.api)
              )}
            />
            {stateLabel(status.api)}
          </span>
        </li>
        <li className="flex items-center justify-between gap-2">
          <span className="text-ink-muted">Firebase</span>
          <span className="flex items-center gap-1.5 text-ink">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                status.firebase === "configured" ? "bg-success" : "bg-ink-faint"
              )}
            />
            {status.firebase === "configured" ? "Configured" : "Missing config"}
          </span>
        </li>
      </ul>
      {status.lastChecked ? (
        <p className="mt-2 text-[10px] text-ink-faint">
          Checked {status.lastChecked.toLocaleTimeString()}
        </p>
      ) : null}
    </div>
  );
}
