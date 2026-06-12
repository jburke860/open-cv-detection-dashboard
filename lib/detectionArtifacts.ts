import type { Detection, DetectionFile } from "@/lib/detectionTypes";
import { formatConfidence, withAssetVersion } from "@/lib/detectionUtils";

const ANNOTATION_COLORS = [
  "#22d3ee",
  "#34d399",
  "#fbbf24",
  "#e879f9",
  "#38bdf8",
  "#fb7185",
];

export function colorForLabel(label: string) {
  let hash = 0;
  for (let i = 0; i < label.length; i += 1) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  return ANNOTATION_COLORS[Math.abs(hash) % ANNOTATION_COLORS.length];
}

export function safeFilename(value: string) {
  const cleaned = value
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return cleaned || "detection-result";
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadTextFile(
  filename: string,
  content: string,
  mimeType: string
) {
  downloadBlob(filename, new Blob([content], { type: mimeType }));
}

function csvCell(value: string | number) {
  const text = String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function detectionsToCsv(detections: Detection[]) {
  const rows = [
    ["id", "label", "confidence", "x", "y", "width", "height"],
    ...detections.map((detection) => [
      detection.id,
      detection.label,
      detection.confidence,
      detection.box.x,
      detection.box.y,
      detection.box.width,
      detection.box.height,
    ]),
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image for export"));
    image.src = src;
  });
}

export async function downloadUrl(url: string, filename: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${filename}`);
  }

  downloadBlob(filename, await response.blob());
}

export function downloadRemoteUrl(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.target = "_blank";
  link.rel = "noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function downloadAnnotatedImage({
  imageSrc,
  sourceWidth,
  sourceHeight,
  detections,
  filename,
}: {
  imageSrc: string;
  sourceWidth: number;
  sourceHeight: number;
  detections: Detection[];
  filename: string;
}) {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = sourceWidth;
  canvas.height = sourceHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas export is not supported in this browser");
  }

  context.drawImage(image, 0, 0, sourceWidth, sourceHeight);
  context.lineWidth = Math.max(3, Math.round(sourceWidth / 420));
  context.font = `${Math.max(16, Math.round(sourceWidth / 70))}px Arial`;
  context.textBaseline = "top";

  for (const detection of detections) {
    const color = colorForLabel(detection.label);
    const label = `${detection.label} ${formatConfidence(detection.confidence)}`;
    const labelPadding = 6;
    const labelHeight = Math.max(24, Math.round(sourceWidth / 45));
    const labelWidth = context.measureText(label).width + labelPadding * 2;
    const labelY = Math.max(0, detection.box.y - labelHeight);

    context.strokeStyle = color;
    context.fillStyle = "rgba(2, 6, 23, 0.88)";
    context.strokeRect(
      detection.box.x,
      detection.box.y,
      detection.box.width,
      detection.box.height
    );
    context.fillRect(detection.box.x, labelY, labelWidth, labelHeight);
    context.fillStyle = color;
    context.fillText(label, detection.box.x + labelPadding, labelY + 4);
  }

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });

  if (!blob) {
    throw new Error("Failed to create annotated image");
  }

  downloadBlob(filename, blob);
}

export async function downloadAnnotatedDetectionFile(
  data: DetectionFile,
  detections: Detection[]
) {
  await downloadAnnotatedImage({
    imageSrc: withAssetVersion(data.image),
    sourceWidth: data.width,
    sourceHeight: data.height,
    detections,
    filename: `${safeFilename(data.title)}-annotated.png`,
  });
}
