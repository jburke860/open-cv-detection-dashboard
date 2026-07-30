import {
  getAnalytics,
  isSupported,
  logEvent,
  type Analytics,
} from "firebase/analytics";

import { getFirebaseApp, isFirebaseConfigured } from "@/lib/detectionPipeline";

let initPromise: Promise<Analytics | null> | null = null;

/**
 * Lazily initialize Google Analytics. Production-only so local dev
 * sessions don't pollute the property, and gated on isSupported() so
 * environments without analytics support (some embedded browsers,
 * cookie-blocked contexts) silently no-op.
 */
export function initAnalytics(): Promise<Analytics | null> {
  if (
    typeof window === "undefined" ||
    process.env.NODE_ENV !== "production" ||
    !isFirebaseConfigured()
  ) {
    return Promise.resolve(null);
  }

  initPromise ??= isSupported()
    .then((supported) => (supported ? getAnalytics(getFirebaseApp()) : null))
    .catch(() => null);

  return initPromise;
}

/** Fire-and-forget event logger; safe to call from any client code. */
export function trackEvent(
  name: string,
  params?: Record<string, string | number | boolean>
) {
  void initAnalytics().then((analytics) => {
    if (analytics) {
      logEvent(analytics, name, params);
    }
  });
}
