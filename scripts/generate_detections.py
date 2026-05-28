#!/usr/bin/env python3
"""
Generate precomputed YOLO detection JSON files for the dashboard.

Usage:
  python scripts/generate_detections.py

Reads images from public/images/ (what the Next.js app serves), mirrors them to
data/sample_images/, and writes JSON to public/detections/.
"""

from __future__ import annotations

import json
import shutil
from pathlib import Path

from ultralytics import YOLO

ROOT = Path(__file__).resolve().parents[1]
PUBLIC_IMAGE_DIR = ROOT / "public" / "images"
DATA_IMAGE_DIR = ROOT / "data" / "sample_images"
OUTPUT_DIR = ROOT / "public" / "detections"
MODEL_NAME = "yolov8n.pt"
CONFIDENCE_THRESHOLD = 0.20

TITLES = {
    "city-street": (
        "City Street",
        "Urban roadway with vehicles, pedestrians, and traffic signals",
    ),
    "crosswalk": (
        "Crosswalk",
        "Downtown crossing with pedestrians, vehicles, and street signals",
    ),
    "parking-lot": (
        "Parking Lot",
        "Open parking area with parked vehicles and roadway context",
    ),
    "bike-lane": (
        "Bike Lane",
        "Urban bike lane with cyclists, pedestrians, and street context",
    ),
    "urban-intersection": (
        "Urban Intersection",
        "Busy intersection with vehicles, crosswalks, and mixed traffic",
    ),
}


def sync_images_to_data() -> None:
    """Keep data/sample_images in sync with public/images."""
    DATA_IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    for image_path in sorted(PUBLIC_IMAGE_DIR.glob("*.jpg")):
        shutil.copy2(image_path, DATA_IMAGE_DIR / image_path.name)
        print(f"Synced {image_path.name} -> data/sample_images/")


def main() -> None:
    if not PUBLIC_IMAGE_DIR.exists():
        raise SystemExit(f"Image directory not found: {PUBLIC_IMAGE_DIR}")

    sync_images_to_data()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    model = YOLO(MODEL_NAME)

    image_paths = sorted(PUBLIC_IMAGE_DIR.glob("*.jpg"))
    if not image_paths:
        raise SystemExit(f"No images found in {PUBLIC_IMAGE_DIR}")

    for image_path in image_paths:
        sample_id = image_path.stem
        title, description = TITLES.get(
            sample_id,
            (sample_id.replace("-", " ").title(), "Public urban scene sample"),
        )

        results = model.predict(
            source=str(image_path),
            conf=CONFIDENCE_THRESHOLD,
            verbose=False,
        )[0]

        height, width = results.orig_shape
        detections = []

        for index, box in enumerate(results.boxes, start=1):
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            class_id = int(box.cls[0])
            label = results.names[class_id]
            confidence = round(float(box.conf[0]), 4)

            detections.append(
                {
                    "id": index,
                    "label": label,
                    "confidence": confidence,
                    "box": {
                        "x": round(x1),
                        "y": round(y1),
                        "width": round(x2 - x1),
                        "height": round(y2 - y1),
                    },
                }
            )

        payload = {
            "id": sample_id,
            "image": f"/images/{image_path.name}",
            "title": title,
            "description": description,
            "width": width,
            "height": height,
            "model": "YOLOv8n",
            "generatedBy": "Ultralytics YOLOv8 local inference (scripts/generate_detections.py)",
            "detections": detections,
        }

        output_path = OUTPUT_DIR / f"{sample_id}.json"
        output_path.write_text(json.dumps(payload, indent=2))
        print(f"Wrote {output_path.name} ({len(detections)} detections)")


if __name__ == "__main__":
    main()
