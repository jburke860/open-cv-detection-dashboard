# Open Computer Vision Detection Dashboard

Made by Jeremy Burke.

A computer vision dashboard for reviewing YOLOv8 object-detection results. The current app includes a Firebase-ready one-image upload pipeline, downloadable result artifacts, and stable precomputed public samples for portfolio review.

## Live demo

[View the deployed dashboard](https://open-cv-detection-dashboard.vercel.app)

## Why I built it

This project complements my [Technical Paper AI Search Assistant](https://github.com/jburke860/technical-paper-ai-search) portfolio build by showing a different applied AI workflow: computer vision result review instead of document retrieval.

| Project                                      | Focus                                                                                            |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Technical Paper AI Search Assistant          | RAG, PDF processing, hybrid retrieval, local LLMs, backend APIs                                  |
| **Open Computer Vision Detection Dashboard** | Computer vision, model-output visualization, bounding boxes, confidence scores, and dashboard UI |

The goal of this project is not to build a production surveillance system. The goal is to show how object-detection outputs can be inspected, visualized, and summarized in a clean technical interface.

## Demo direction

The Technical Paper AI Research Assistant should stay a strong local demo for now because it depends on Ollama, local model files, local PDFs, embeddings, and heavier storage/compute.

This OpenCV dashboard is the better candidate for the next true live demo because it can show a complete image-processing pipeline:

1. User uploads one image.
2. Frontend writes the image to Firebase Cloud Storage.
3. Frontend creates a Firestore detection job.
4. Cloud Run runs Python, FastAPI, OpenCV, and YOLO.
5. Cloud Run saves an annotated image plus JSON/CSV result artifacts.
6. Firestore job status updates from queued to running to complete or failed.
7. User downloads the annotated image, JSON detections, and CSV detections.

YOLO can run in the browser with ONNX Runtime Web, but the Firebase plus Cloud Run path is better for this portfolio app because it demonstrates frontend upload handling, object storage, async job state, a containerized inference service, and downloadable artifacts.

## Screenshots

### Dashboard UI — Detection Viewer

![Dashboard detection viewer](images/readme-screenshots/ui_p1.png)

### Dashboard UI — Detection Results

![Dashboard detection results table](images/readme-screenshots/ui_p2.png)

### Example Image Selection

![Example alternate detection image](images/readme-screenshots/example.png)

## Current features

* Deployed Next.js dashboard hosted on Vercel
* One-image upload UI
* Firebase Storage and Firestore client adapter
* Optional Cloud Run API handoff through `NEXT_PUBLIC_DETECTION_API_URL`
* Firestore job status display
* Public urban-scene image gallery
* Precomputed YOLOv8 detection JSON files
* Detection viewer with scaled bounding boxes
* Object labels and confidence scores rendered over images
* Hoverable detected-object list synced with box highlights
* Confidence threshold slider
* Annotated image export
* JSON and CSV detection exports
* Summary cards for:

  * total detections
  * unique classes
  * highest confidence detection
  * average confidence
* Class count chips
* Detection results table with label, confidence, and source-image box coordinates
* “How it works” and limitations sections
* Optional Python script to regenerate detections locally

## Architecture

Upload inference architecture:

```text
User uploads image
        │
        ▼
Firebase Cloud Storage
        │
        │ create detection job
        ▼
Firestore job record: queued / running / complete / failed
        │
        │ trigger or API call
        ▼
Cloud Run Python/FastAPI/OpenCV/YOLO service
        │
        │ saves annotated image + JSON/CSV result
        ▼
Firebase Storage + Firestore
        │
        ▼
User downloads result from dashboard
```

Static sample architecture:

```text
Public urban-scene images
        │
        ▼
Optional local YOLOv8 inference script
        │
        ▼
Precomputed JSON detection files
        │
        ▼
Next.js dashboard
        │
        ▼
Deployed browser visualization
Bounding boxes · labels · confidence scores · summary cards · results table
```

## Tech stack

* **Next.js** with App Router
* **TypeScript**
* **Tailwind CSS**
* **Firebase SDK** for Storage, Firestore, and anonymous auth
* **Cloud Run** target for containerized Python/FastAPI/OpenCV/YOLO inference
* **Static JSON detection artifacts**
* **YOLOv8n** through Ultralytics for optional local detection generation
* **Vercel** for static frontend deployment
* **Public, non-sensitive sample images**

## Project structure

```text
open-cv-detection-dashboard/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── Dashboard.tsx
│   ├── UploadInferencePanel.tsx
│   ├── DetectionControls.tsx
│   ├── DetectionViewer.tsx
│   ├── DetectionSummaryCards.tsx
│   ├── DetectionTable.tsx
│   └── ImageSelector.tsx
├── lib/
│   ├── detectionArtifacts.ts
│   ├── detectionPipeline.ts
│   ├── detectionTypes.ts
│   └── detectionUtils.ts
├── public/
│   ├── images/
│   └── detections/
├── data/
│   └── sample_images/
├── scripts/
│   ├── generate_detections.py
│   └── requirements.txt
├── images/
│   └── readme-screenshots/
├── .env.example
└── README.md
```

## Local setup

Clone the repository and install dependencies:

```bash
git clone https://github.com/jburke860/open-cv-detection-dashboard.git
cd open-cv-detection-dashboard
npm install
npm run dev
```

Copy the environment example when wiring Firebase:

```bash
cp .env.example .env.local
```

Open the local app:

```text
http://localhost:3000
```

## Production build

```bash
npm run build
npm start
```

## Deployment

This project is deployed as a static Next.js dashboard on Vercel.

Without Firebase environment variables, the deployed app still loads public sample images and precomputed detection JSON files from static assets. With Firebase configured, the upload panel can create real detection jobs and listen for result status.

## Firebase and Cloud Run setup

Required frontend environment variables:

```text
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Optional Cloud Run endpoint:

```text
NEXT_PUBLIC_DETECTION_API_URL=https://your-cloud-run-service-url
```

If `NEXT_PUBLIC_DETECTION_API_URL` is set, the frontend calls:

```http
POST /jobs
Content-Type: application/json
```

```json
{
  "jobId": "firestore-job-id",
  "inputPath": "detection-jobs/{uid}/{jobId}/input/image.jpg",
  "outputPrefix": "detection-jobs/{uid}/{jobId}/output",
  "confidenceThreshold": 0.25,
  "originalName": "image.jpg"
}
```

The Cloud Run service should update `detectionJobs/{jobId}` in Firestore:

```json
{
  "status": "complete",
  "result": {
    "annotatedImagePath": "detection-jobs/{uid}/{jobId}/output/annotated.png",
    "jsonPath": "detection-jobs/{uid}/{jobId}/output/detections.json",
    "csvPath": "detection-jobs/{uid}/{jobId}/output/detections.csv",
    "width": 1280,
    "height": 720,
    "detections": []
  }
}
```

Use `status: "failed"` and an `error` string when inference fails.

## How detections were generated

The dashboard uses **precomputed object-detection results**. This keeps the deployed demo lightweight and easy to review because visitors do not need a GPU, model server, database, or local ML environment.

The workflow is:

1. Collect public urban-scene sample images.
2. Run YOLOv8 locally using the optional Python script.
3. Save bounding boxes, labels, confidence scores, and image metadata as JSON.
4. Load the static JSON files in the Next.js dashboard.
5. Render bounding boxes and detection summaries in the browser.

To regenerate detections locally:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r scripts/requirements.txt
python scripts/generate_detections.py
```

On Windows:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r scripts/requirements.txt
python scripts/generate_detections.py
```

The script reads sample images, runs YOLOv8n inference locally, and writes detection files to:

```text
public/detections/
```

## Detection JSON format

Each image has a matching JSON file containing image metadata and detection results.

```json
{
  "id": "city-street",
  "image": "/images/city-street.jpg",
  "title": "City Street",
  "width": 1280,
  "height": 853,
  "model": "YOLOv8n",
  "detections": [
    {
      "id": 1,
      "label": "car",
      "confidence": 0.87,
      "box": {
        "x": 420,
        "y": 180,
        "width": 120,
        "height": 340
      }
    }
  ]
}
```

Bounding-box coordinates use **source image pixels**. The dashboard scales each box to match the rendered image size in the browser.

## Example workflow

1. Select a public urban-scene image from the gallery.
2. Inspect the bounding boxes and confidence labels overlaid on the image.
3. Review the detected-object sidebar.
4. Compare summary cards for total detections, unique classes, highest confidence, and average confidence.
5. Browse the full detection table for class labels, confidence scores, and box coordinates.

## Current demo scope

This is intentionally a **deployed portfolio demo** focused on object-detection visualization and review.

Included:

* One-image upload panel
* Firebase-ready upload and job creation adapter
* Firestore job listener
* Cloud Run API handoff contract
* Result artifact download UI
* Public sample images
* Precomputed YOLOv8 detections
* Static JSON detection files
* Browser-based visualization
* Hosted frontend demo
* Optional local detection regeneration workflow

Not included:

* live webcam inference
* deployed Cloud Run inference service
* Firebase project configuration in this repo
* production authentication beyond anonymous Firebase sign-in
* production monitoring
* private or sensitive image data

## Limitations

* Detection quality depends on the chosen sample images, YOLOv8n model behavior, and confidence threshold.
* Some low-confidence detections may be imperfect.
* The upload UI requires Firebase environment variables before it can create real jobs.
* The inference path requires a separately deployed Cloud Run service.
* The project is not positioned as production-ready surveillance or security software.
* The image set is intentionally small to keep the demo focused and easy to review.

## Future improvements

Potential future extensions include:

* Deploy Python/FastAPI/OpenCV/YOLO service on Cloud Run
* Add Firebase Storage and Firestore security rules
* Add job cancellation and retry
* Class-based filtering
* Side-by-side model comparison
* Larger public urban-scene image set
* Live video or webcam inference
* Optional YOLOv8 ONNX Runtime Web mode for small-model browser inference
* Optional security-oriented monitoring workflows after the static visualization demo is complete
