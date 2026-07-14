"use client";

import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Slider } from "@/components/ui/Slider";
import {
  DETECTION_MODELS,
  type DetectionModelId,
  type InferenceOptions,
} from "@/lib/detectionPipeline";
import { formatConfidence } from "@/lib/detectionUtils";

/** Compact model + threshold controls shared by the batch and camera pages. */
export function InferenceSettingsFields({
  settings,
  onChange,
  disabled,
}: {
  settings: InferenceOptions;
  onChange: (settings: InferenceOptions) => void;
  disabled?: boolean;
}) {
  function update(partial: Partial<InferenceOptions>) {
    onChange({ ...settings, ...partial });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div>
        <label
          htmlFor="settings-model"
          className="text-xs font-medium text-ink-muted"
        >
          Model
        </label>
        <Select
          id="settings-model"
          value={settings.model}
          disabled={disabled}
          onChange={(value) => update({ model: value as DetectionModelId })}
          className="mt-2 w-full"
        >
          {DETECTION_MODELS.map((model) => (
            <option key={model.id} value={model.id}>
              {model.label} — {model.hint}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor="settings-confidence"
            className="text-xs font-medium text-ink-muted"
          >
            Confidence
          </label>
          <Badge tone="accent" className="font-mono">
            {formatConfidence(settings.confidenceThreshold)}
          </Badge>
        </div>
        <Slider
          id="settings-confidence"
          min={0.05}
          max={0.9}
          step={0.05}
          value={settings.confidenceThreshold}
          disabled={disabled}
          onChange={(value) => update({ confidenceThreshold: value })}
          className="mt-3"
        />
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor="settings-iou"
            className="text-xs font-medium text-ink-muted"
          >
            NMS IoU
          </label>
          <Badge tone="neutral" className="font-mono">
            {settings.iouThreshold.toFixed(2)}
          </Badge>
        </div>
        <Slider
          id="settings-iou"
          min={0.1}
          max={0.9}
          step={0.05}
          value={settings.iouThreshold}
          disabled={disabled}
          onChange={(value) => update({ iouThreshold: value })}
          className="mt-3"
        />
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor="settings-max"
            className="text-xs font-medium text-ink-muted"
          >
            Max detections
          </label>
          <Badge tone="neutral" className="font-mono">
            {settings.maxDetections}
          </Badge>
        </div>
        <Slider
          id="settings-max"
          min={10}
          max={300}
          step={10}
          value={settings.maxDetections}
          disabled={disabled}
          onChange={(value) => update({ maxDetections: value })}
          className="mt-3"
        />
      </div>
    </div>
  );
}
