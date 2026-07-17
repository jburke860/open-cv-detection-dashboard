"use client";

import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Slider } from "@/components/ui/Slider";
import {
  DETECTION_MODELS,
  getModelInfo,
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
  const modelInfo = getModelInfo(settings.model);

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
          disabled={disabled || modelInfo.noNms}
          onChange={(value) => update({ iouThreshold: value })}
          className="mt-3"
        />
        {modelInfo.noNms ? (
          <p className="mt-1.5 text-[11px] leading-4 text-ink-faint">
            {modelInfo.label} is NMS-free — this setting has no effect.
          </p>
        ) : null}
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

      {modelInfo.world ? (
        <div className="sm:col-span-2 xl:col-span-4">
          <label
            htmlFor="settings-class-prompt"
            className="text-xs font-medium text-ink-muted"
          >
            Classes to detect
          </label>
          <input
            id="settings-class-prompt"
            type="text"
            value={settings.classPrompt}
            disabled={disabled}
            onChange={(event) => update({ classPrompt: event.target.value })}
            placeholder="e.g. person, dog, red umbrella"
            className="mt-2 w-full rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-xs text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none disabled:opacity-50"
          />
          <p className="mt-1 text-[11px] leading-4 text-ink-faint">
            Comma-separated, free-form. Leave empty for the 80 standard
            classes; unusual prompts often need a lower confidence threshold.
          </p>
        </div>
      ) : null}
    </div>
  );
}
