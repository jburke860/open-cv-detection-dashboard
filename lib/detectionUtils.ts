import type { Detection, DetectionFile, DetectionSummary } from "./detectionTypes";

/** Bump when sample images or detection JSON change to bust browser cache. */
export const ASSET_VERSION = "5";

export function withAssetVersion(path: string): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}v=${ASSET_VERSION}`;
}

export function computeSummary(detections: Detection[]): DetectionSummary {
  if (detections.length === 0) {
    return {
      totalDetections: 0,
      uniqueClasses: 0,
      highestConfidence: 0,
      averageConfidence: 0,
      classCounts: {},
    };
  }

  const classCounts: Record<string, number> = {};
  let confidenceSum = 0;
  let highestConfidence = 0;

  for (const detection of detections) {
    classCounts[detection.label] = (classCounts[detection.label] ?? 0) + 1;
    confidenceSum += detection.confidence;
    highestConfidence = Math.max(highestConfidence, detection.confidence);
  }

  return {
    totalDetections: detections.length,
    uniqueClasses: Object.keys(classCounts).length,
    highestConfidence,
    averageConfidence: confidenceSum / detections.length,
    classCounts,
  };
}

export function formatConfidence(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function scaleBox(
  box: Detection["box"],
  sourceWidth: number,
  sourceHeight: number,
  displayWidth: number,
  displayHeight: number
) {
  const scaleX = displayWidth / sourceWidth;
  const scaleY = displayHeight / sourceHeight;

  return {
    left: box.x * scaleX,
    top: box.y * scaleY,
    width: box.width * scaleX,
    height: box.height * scaleY,
  };
}

export const IMAGE_SAMPLES = [
  {
    id: "city-street",
    title: "City Street",
    description:
      "Urban roadway with vehicles, pedestrians, and traffic signals",
    imagePath: "/images/city-street.jpg",
    detectionPath: "/detections/city-street.json",
  },
  {
    id: "crosswalk",
    title: "Crosswalk",
    description:
      "Downtown crossing with pedestrians, vehicles, and street signals",
    imagePath: "/images/crosswalk.jpg",
    detectionPath: "/detections/crosswalk.json",
  },
  {
    id: "parking-lot",
    title: "Parking Lot",
    description:
      "Open parking area with parked vehicles and roadway context",
    imagePath: "/images/parking-lot.jpg",
    detectionPath: "/detections/parking-lot.json",
  },
  {
    id: "bike-lane",
    title: "Bike Lane",
    description:
      "Urban bike lane with cyclists, pedestrians, and street context",
    imagePath: "/images/bike-lane.jpg",
    detectionPath: "/detections/bike-lane.json",
  },
  {
    id: "urban-intersection",
    title: "Urban Intersection",
    description:
      "Busy intersection with vehicles, crosswalks, and mixed traffic",
    imagePath: "/images/urban-intersection.jpg",
    detectionPath: "/detections/urban-intersection.json",
  },
] as const;

export async function loadDetectionFile(
  path: string
): Promise<DetectionFile> {
  const response = await fetch(withAssetVersion(path), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load detections from ${path}`);
  }
  return response.json() as Promise<DetectionFile>;
}
