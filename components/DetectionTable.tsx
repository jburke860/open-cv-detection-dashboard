import type { Detection } from "@/lib/detectionTypes";
import { formatConfidence } from "@/lib/detectionUtils";

interface DetectionTableProps {
  detections: Detection[];
}

export function DetectionTable({ detections }: DetectionTableProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70">
      <div className="border-b border-slate-800 px-4 py-3">
        <h2 className="text-lg font-semibold text-slate-100">Detection results</h2>
        <p className="mt-1 text-sm text-slate-400">
          Label, confidence, and bounding-box coordinates in source image pixels
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-950/60 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Label</th>
              <th className="px-4 py-3 font-medium">Confidence</th>
              <th className="px-4 py-3 font-medium">X</th>
              <th className="px-4 py-3 font-medium">Y</th>
              <th className="px-4 py-3 font-medium">Width</th>
              <th className="px-4 py-3 font-medium">Height</th>
            </tr>
          </thead>
          <tbody>
            {detections.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-slate-400"
                >
                  No detections above the confidence threshold for this image.
                </td>
              </tr>
            ) : (
              detections.map((detection) => (
                <tr
                  key={detection.id}
                  className="border-t border-slate-800/80 text-slate-200"
                >
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">
                    {detection.id}
                  </td>
                  <td className="px-4 py-3 capitalize">{detection.label}</td>
                  <td className="px-4 py-3 font-medium text-cyan-300">
                    {formatConfidence(detection.confidence)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {detection.box.x}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {detection.box.y}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {detection.box.width}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {detection.box.height}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
