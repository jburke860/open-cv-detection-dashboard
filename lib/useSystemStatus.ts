"use client";

import { useCallback, useEffect, useState } from "react";

import {
  detectionApiUrl,
  isDetectionApiConfigured,
  isFirebaseConfigured,
} from "@/lib/detectionPipeline";

export type ServiceState = "checking" | "online" | "offline" | "unconfigured";

export interface SystemStatus {
  api: ServiceState;
  firebase: "configured" | "unconfigured";
  lastChecked: Date | null;
  refresh: () => void;
}

const REFRESH_INTERVAL_MS = 60_000;
/** Generous timeout: a cold Cloud Run instance has to boot and load the model. */
const HEALTH_TIMEOUT_MS = 20_000;

export function useSystemStatus(): SystemStatus {
  const [api, setApi] = useState<ServiceState>(
    isDetectionApiConfigured() ? "checking" : "unconfigured"
  );
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => {
    setApi((current) =>
      current === "unconfigured" ? current : "checking"
    );
    setTick((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!isDetectionApiConfigured()) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => controller.abort(),
      HEALTH_TIMEOUT_MS
    );

    fetch(`${detectionApiUrl}/health`, { signal: controller.signal })
      .then((response) => {
        if (!cancelled) {
          setApi(response.ok ? "online" : "offline");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setApi("offline");
        }
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (!cancelled) {
          setLastChecked(new Date());
        }
      });

    const interval = window.setInterval(refresh, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [tick, refresh]);

  return {
    api,
    firebase: isFirebaseConfigured() ? "configured" : "unconfigured",
    lastChecked,
    refresh,
  };
}
