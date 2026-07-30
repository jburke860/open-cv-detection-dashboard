"use client";

import { Braces, FileImage, Table2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { trackEvent } from "@/lib/analytics";
import {
  detectionsToCsv,
  downloadAnnotatedImage,
  downloadRemoteUrl,
  downloadTextFile,
  safeFilename,
} from "@/lib/detectionArtifacts";
import {
  getDetectionArtifactUrl,
  type DetectionArtifactKind,
} from "@/lib/detectionPipeline";
import type { Detection } from "@/lib/detectionTypes";
import type { WorkspaceResult } from "@/lib/workspaceTypes";

export function DownloadsCard({
  result,
  visibleDetections,
}: {
  result: WorkspaceResult;
  visibleDetections: Detection[];
}) {
  const [error, setError] = useState<string | null>(null);
  const baseName = safeFilename(result.title);
  const hasServerArtifacts =
    result.kind === "upload" && result.job?.status === "complete";

  async function downloadAnnotated() {
    setError(null);
    try {
      await downloadAnnotatedImage({
        imageSrc: result.imageSrc,
        sourceWidth: result.width,
        sourceHeight: result.height,
        detections: visibleDetections,
        filename: `${baseName}-annotated.png`,
      });
      trackEvent("export_downloaded", { format: "png", artifact: "client" });
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "Failed to export annotated image"
      );
    }
  }

  function downloadJson() {
    setError(null);
    downloadTextFile(
      `${baseName}-detections.json`,
      JSON.stringify(
        {
          title: result.title,
          model: result.model,
          width: result.width,
          height: result.height,
          detections: visibleDetections,
        },
        null,
        2
      ),
      "application/json"
    );
    trackEvent("export_downloaded", { format: "json", artifact: "client" });
  }

  function downloadCsv() {
    setError(null);
    downloadTextFile(
      `${baseName}-detections.csv`,
      detectionsToCsv(visibleDetections),
      "text/csv"
    );
    trackEvent("export_downloaded", { format: "csv", artifact: "client" });
  }

  async function downloadServerArtifact(kind: DetectionArtifactKind) {
    if (!result.job) return;
    setError(null);
    try {
      const url = await getDetectionArtifactUrl(result.job, kind);
      if (!url) {
        setError("That artifact is not available yet.");
        return;
      }
      const suffix =
        kind === "annotatedImage"
          ? "annotated.png"
          : kind === "json"
            ? "detections.json"
            : "detections.csv";
      downloadRemoteUrl(url, `${baseName}-${suffix}`);
      trackEvent("export_downloaded", {
        format: kind === "annotatedImage" ? "png" : kind,
        artifact: "server",
      });
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "Failed to download artifact"
      );
    }
  }

  const disabled = visibleDetections.length === 0;

  return (
    <Card>
      <CardHeader
        title="Export"
        subtitle="Files reflect the current threshold and class filters"
      />
      <CardBody className="space-y-2.5">
        <Button
          onClick={downloadAnnotated}
          disabled={disabled}
          icon={<FileImage className="h-4 w-4" />}
          className="w-full justify-start"
        >
          Annotated image (PNG)
        </Button>
        <Button
          onClick={downloadJson}
          disabled={disabled}
          icon={<Braces className="h-4 w-4" />}
          className="w-full justify-start"
        >
          Detections (JSON)
        </Button>
        <Button
          onClick={downloadCsv}
          disabled={disabled}
          icon={<Table2 className="h-4 w-4" />}
          className="w-full justify-start"
        >
          Detections (CSV)
        </Button>

        {hasServerArtifacts ? (
          <p className="pt-1 text-[11px] leading-4 text-ink-faint">
            Raw Cloud Run outputs:{" "}
            <button
              type="button"
              className="text-accent hover:underline"
              onClick={() => downloadServerArtifact("annotatedImage")}
            >
              annotated.png
            </button>
            {" · "}
            <button
              type="button"
              className="text-accent hover:underline"
              onClick={() => downloadServerArtifact("json")}
            >
              detections.json
            </button>
            {" · "}
            <button
              type="button"
              className="text-accent hover:underline"
              onClick={() => downloadServerArtifact("csv")}
            >
              detections.csv
            </button>
          </p>
        ) : null}

        {error ? <p className="text-xs text-danger">{error}</p> : null}
      </CardBody>
    </Card>
  );
}
