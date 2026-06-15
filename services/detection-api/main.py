from __future__ import annotations

import csv
import json
import os
import tempfile
import time
from pathlib import Path
from typing import Optional

import cv2
import firebase_admin
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from firebase_admin import firestore, storage
from pydantic import BaseModel
from ultralytics import YOLO


PROJECT_ID = os.environ.get("FIREBASE_PROJECT_ID", "open-cv-detection-dashboard")
STORAGE_BUCKET = os.environ.get(
    "FIREBASE_STORAGE_BUCKET",
    "open-cv-detection-dashboard.firebasestorage.app",
)
MODEL_NAME = os.environ.get("YOLO_MODEL", "yolov8n.pt")

if not firebase_admin._apps:
    firebase_admin.initialize_app(
        options={
            "projectId": PROJECT_ID,
            "storageBucket": STORAGE_BUCKET,
        }
    )

db = firestore.client()
bucket = storage.bucket()
model = YOLO(MODEL_NAME)

app = FastAPI(title="Open CV Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://open-cv-detection-dashboard--open-cv-detection-dashboard.us-central1.hosted.app",
        "https://open-cv-detection-dashboard.vercel.app",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class JobRequest(BaseModel):
    jobId: str
    inputPath: str
    outputPrefix: str
    confidenceThreshold: Optional[float] = 0.25
    originalName: Optional[str] = None


def update_job(job_id: str, data: dict) -> None:
    data["updatedAt"] = firestore.SERVER_TIMESTAMP
    db.collection("detectionJobs").document(job_id).set(data, merge=True)


def download_blob(storage_path: str, local_path: str) -> None:
    blob = bucket.blob(storage_path)
    if not blob.exists():
        raise FileNotFoundError(f"Storage input not found: {storage_path}")
    blob.download_to_filename(local_path)


def upload_blob(local_path: str, storage_path: str, content_type: str) -> None:
    blob = bucket.blob(storage_path)
    blob.upload_from_filename(local_path, content_type=content_type)


def write_json(path: str, payload: dict) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)


def write_csv(path: str, detections: list[dict]) -> None:
    fields = ["id", "label", "confidence", "x", "y", "width", "height"]

    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()

        for det in detections:
            writer.writerow(
                {
                    "id": det["id"],
                    "label": det["label"],
                    "confidence": det["confidence"],
                    "x": det["box"]["x"],
                    "y": det["box"]["y"],
                    "width": det["box"]["width"],
                    "height": det["box"]["height"],
                }
            )


def run_detection(input_path: str, annotated_path: str, confidence: float) -> dict:
    results = model.predict(
        source=input_path,
        conf=confidence,
        verbose=False,
    )[0]

    height, width = results.orig_shape
    detections = []

    for index, box in enumerate(results.boxes, start=1):
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        class_id = int(box.cls[0])
        label = results.names[class_id]
        score = round(float(box.conf[0]), 4)

        detections.append(
            {
                "id": index,
                "label": label,
                "confidence": score,
                "box": {
                    "x": round(x1),
                    "y": round(y1),
                    "width": round(x2 - x1),
                    "height": round(y2 - y1),
                },
            }
        )

    annotated = results.plot()
    cv2.imwrite(annotated_path, annotated)

    return {
        "width": width,
        "height": height,
        "model": "YOLOv8n",
        "detections": detections,
    }


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/jobs")
def process_job(req: JobRequest):
    job_ref = db.collection("detectionJobs").document(req.jobId)
    job_doc = job_ref.get()

    if not job_doc.exists:
        raise HTTPException(status_code=404, detail="Firestore job not found")

    confidence = req.confidenceThreshold or 0.25
    confidence = max(0.01, min(confidence, 0.99))

    update_job(
        req.jobId,
        {
            "status": "running",
            "error": None,
            "startedAt": firestore.SERVER_TIMESTAMP,
        },
    )

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp = Path(tmpdir)

            suffix = Path(req.originalName or req.inputPath).suffix.lower()
            if suffix not in {".jpg", ".jpeg", ".png", ".webp"}:
                suffix = ".jpg"

            input_file = str(tmp / "input")
            annotated_file = str(tmp / "annotated.png")
            json_file = str(tmp / "detections.json")
            csv_file = str(tmp / "detections.csv")

            download_blob(req.inputPath, input_file)

            start = time.time()
            result_payload = run_detection(input_file, annotated_file, confidence)
            runtime_ms = int((time.time() - start) * 1000)

            annotated_storage_path = f"{req.outputPrefix}/annotated.png"
            json_storage_path = f"{req.outputPrefix}/detections.json"
            csv_storage_path = f"{req.outputPrefix}/detections.csv"

            json_payload = {
                "jobId": req.jobId,
                "inputPath": req.inputPath,
                "originalName": req.originalName,
                "confidenceThreshold": confidence,
                "runtimeMs": runtime_ms,
                **result_payload,
            }

            write_json(json_file, json_payload)
            write_csv(csv_file, result_payload["detections"])

            upload_blob(annotated_file, annotated_storage_path, "image/png")
            upload_blob(json_file, json_storage_path, "application/json")
            upload_blob(csv_file, csv_storage_path, "text/csv")

            update_job(
                req.jobId,
                {
                    "status": "complete",
                    "completedAt": firestore.SERVER_TIMESTAMP,
                    "result": {
                        "annotatedImagePath": annotated_storage_path,
                        "jsonPath": json_storage_path,
                        "csvPath": csv_storage_path,
                        "width": result_payload["width"],
                        "height": result_payload["height"],
                        "detections": result_payload["detections"],
                        "runtimeMs": runtime_ms,
                    },
                },
            )

            return {
                "ok": True,
                "jobId": req.jobId,
                "status": "complete",
                "detections": len(result_payload["detections"]),
            }

    except Exception as exc:
        import traceback

        print("Detection job failed:", flush=True)
        print(traceback.format_exc(), flush=True)

        update_job(
            req.jobId,
            {
                "status": "failed",
                "error": str(exc),
                "completedAt": firestore.SERVER_TIMESTAMP,
            },
        )
        raise HTTPException(status_code=500, detail=str(exc))