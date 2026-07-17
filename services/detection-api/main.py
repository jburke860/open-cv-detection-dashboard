from __future__ import annotations

import csv
import json
import os
import re
import tempfile
import threading
import time
from pathlib import Path
from typing import Optional

import cv2
import firebase_admin
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from firebase_admin import auth as firebase_auth
from firebase_admin import firestore, storage
from pydantic import BaseModel
from ultralytics import RTDETR, YOLO


PROJECT_ID = os.environ.get("FIREBASE_PROJECT_ID", "open-cv-detection-dashboard")
STORAGE_BUCKET = os.environ.get(
    "FIREBASE_STORAGE_BUCKET",
    "open-cv-detection-dashboard.firebasestorage.app",
)

DEFAULT_MODEL = "yolov8n"

# All weight files are baked into the Docker image (see Dockerfile), so
# lazy-loading a model never hits the network.
MODEL_SPECS: dict[str, dict] = {
    "yolov8n": {"file": "yolov8n.pt", "label": "YOLOv8n"},
    "yolov8s": {"file": "yolov8s.pt", "label": "YOLOv8s"},
    "yolo11n": {"file": "yolo11n.pt", "label": "YOLO11n"},
    "yolo11s": {"file": "yolo11s.pt", "label": "YOLO11s"},
    "yolo12n": {"file": "yolo12n.pt", "label": "YOLO12n"},
    "rtdetr-l": {"file": "rtdetr-l.pt", "label": "RT-DETR-L", "arch": "rtdetr"},
    "yolov8s-world": {
        "file": "yolov8s-worldv2.pt",
        "label": "YOLOv8s-World",
        "world": True,
    },
}

MAX_PROMPT_CLASSES = 20
MAX_PROMPT_CLASS_LENGTH = 40

if not firebase_admin._apps:
    firebase_admin.initialize_app(
        options={
            "projectId": PROJECT_ID,
            "storageBucket": STORAGE_BUCKET,
        }
    )

db = firestore.client()
bucket = storage.bucket()

_models: dict[str, YOLO] = {}
_default_world_names: dict[str, list[str]] = {}
_world_classes: dict[str, Optional[list[str]]] = {}
# Models are mutable (set_classes) and inference is CPU-bound anyway, so
# serialize access instead of racing FastAPI's threadpool.
_inference_lock = threading.Lock()


def get_model(key: str) -> YOLO:
    if key not in _models:
        spec = MODEL_SPECS[key]
        loader = RTDETR if spec.get("arch") == "rtdetr" else YOLO
        _models[key] = loader(spec["file"])
        if spec.get("world"):
            _default_world_names[key] = list(_models[key].names.values())
            _world_classes[key] = None
    return _models[key]


# Eagerly load the default model so the first request after a cold start
# only pays for inference, not model initialization.
get_model(DEFAULT_MODEL)

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


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(value, high))


def parse_class_prompt(raw: object) -> list[str]:
    """Sanitize the open-vocabulary class prompt from the job document."""
    if not isinstance(raw, str):
        return []

    classes: list[str] = []
    for part in raw.split(","):
        name = re.sub(r"[^a-zA-Z0-9 '\-]", "", part).strip().lower()
        name = name[:MAX_PROMPT_CLASS_LENGTH]
        if name and name not in classes:
            classes.append(name)

    return classes[:MAX_PROMPT_CLASSES]


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


def get_input_suffix(original_name: Optional[str], input_path: str) -> str:
    suffix = Path(original_name or input_path).suffix.lower()

    if suffix not in {".jpg", ".jpeg", ".png", ".webp"}:
        suffix = ".jpg"

    return suffix


def verify_caller(authorization: Optional[str]) -> str:
    """Verify the Firebase ID token and return the caller's uid."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    token = authorization.split(" ", 1)[1]
    try:
        decoded = firebase_auth.verify_id_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid auth token")

    return decoded["uid"]


def run_detection(
    model_key: str,
    input_path: str,
    annotated_path: str,
    confidence: float,
    iou: float,
    max_detections: int,
    prompt_classes: list[str],
) -> dict:
    model = get_model(model_key)
    spec = MODEL_SPECS[model_key]

    with _inference_lock:
        if spec.get("world"):
            # set_classes mutates the cached model; only re-embed the text
            # prompt when it actually changed since the previous job.
            wanted = prompt_classes or None
            if _world_classes.get(model_key) != wanted:
                model.set_classes(wanted or _default_world_names[model_key])
                _world_classes[model_key] = wanted

        results = model.predict(
            source=input_path,
            conf=confidence,
            iou=iou,
            max_det=max_detections,
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
        "model": spec["label"],
        "detections": detections,
    }


@app.get("/health")
def health():
    return {"ok": True, "models": sorted(MODEL_SPECS)}


@app.post("/jobs")
def process_job(req: JobRequest, authorization: Optional[str] = Header(None)):
    uid = verify_caller(authorization)

    job_ref = db.collection("detectionJobs").document(req.jobId)
    job_doc = job_ref.get()

    if not job_doc.exists:
        raise HTTPException(status_code=404, detail="Firestore job not found")

    # All job parameters come from the Firestore document (created under
    # Firestore security rules), never from the request body — the caller
    # only proves ownership.
    job = job_doc.to_dict() or {}

    if job.get("ownerId") != uid:
        raise HTTPException(status_code=403, detail="Not your job")

    job_input = job.get("input") or {}
    input_path = job_input.get("storagePath")
    original_name = job_input.get("originalName")
    output_prefix = job.get("outputPrefix")

    owned_prefix = f"detection-jobs/{uid}/"
    if (
        not input_path
        or not output_prefix
        or not str(input_path).startswith(owned_prefix)
        or not str(output_prefix).startswith(owned_prefix)
    ):
        raise HTTPException(status_code=400, detail="Job has invalid storage paths")

    model_key = job.get("model") or DEFAULT_MODEL
    if model_key not in MODEL_SPECS:
        raise HTTPException(status_code=400, detail=f"Unknown model: {model_key}")

    confidence = clamp(float(job.get("confidenceThreshold") or 0.25), 0.01, 0.99)
    iou = clamp(float(job.get("iouThreshold") or 0.45), 0.05, 0.95)
    max_detections = int(clamp(float(job.get("maxDetections") or 100), 1, 300))
    prompt_classes = (
        parse_class_prompt(job.get("classPrompt"))
        if MODEL_SPECS[model_key].get("world")
        else []
    )

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

            suffix = get_input_suffix(original_name, input_path)

            input_file = str(tmp / f"input{suffix}")
            annotated_file = str(tmp / "annotated.png")
            json_file = str(tmp / "detections.json")
            csv_file = str(tmp / "detections.csv")

            download_blob(input_path, input_file)

            start = time.time()
            result_payload = run_detection(
                model_key,
                input_file,
                annotated_file,
                confidence,
                iou,
                max_detections,
                prompt_classes,
            )
            runtime_ms = int((time.time() - start) * 1000)

            annotated_storage_path = f"{output_prefix}/annotated.png"
            json_storage_path = f"{output_prefix}/detections.json"
            csv_storage_path = f"{output_prefix}/detections.csv"

            json_payload = {
                "jobId": req.jobId,
                "inputPath": input_path,
                "originalName": original_name,
                "confidenceThreshold": confidence,
                "iouThreshold": iou,
                "maxDetections": max_detections,
                "classPrompt": ", ".join(prompt_classes) if prompt_classes else None,
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
                        "model": result_payload["model"],
                        "detections": result_payload["detections"],
                        "runtimeMs": runtime_ms,
                        "iouThreshold": iou,
                        "maxDetections": max_detections,
                        "classPrompt": ", ".join(prompt_classes)
                        if prompt_classes
                        else None,
                    },
                },
            )

            return {
                "ok": True,
                "jobId": req.jobId,
                "status": "complete",
                "model": result_payload["model"],
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
