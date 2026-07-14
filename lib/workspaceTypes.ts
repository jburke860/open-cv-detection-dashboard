import type { DetectionJobRecord } from "@/lib/detectionPipeline";
import type { Detection } from "@/lib/detectionTypes";

/**
 * A single displayable detection result, regardless of whether it came from a
 * precomputed sample scene or a live upload job. The viewer, panels, and
 * exports all consume this shape so both paths share one code path.
 */
export interface WorkspaceResult {
  key: string;
  title: string;
  subtitle?: string;
  imageSrc: string;
  width: number;
  height: number;
  model: string;
  detections: Detection[];
  kind: "sample" | "upload";
  /** Present for uploads once the Cloud Run job exists. */
  job?: DetectionJobRecord;
  runtimeMs?: number;
}
