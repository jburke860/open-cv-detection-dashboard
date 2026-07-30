"use client";

import { useEffect } from "react";

import { initAnalytics } from "@/lib/analytics";

/**
 * Starts Google Analytics on first client render. Page views (including
 * client-side route changes) are collected automatically by GA4's
 * enhanced measurement once the SDK is live.
 */
export function AnalyticsBoot() {
  useEffect(() => {
    void initAnalytics();
  }, []);

  return null;
}
