# Open Computer Vision Detection Dashboard

A deployed computer vision dashboard that visualizes **precomputed YOLOv8 object-detection results** on public urban-scene images. Built as a portfolio project to demonstrate computer vision output interpretation, bounding-box rendering, confidence scoring, class summaries, and frontend dashboard engineering without user accounts, private datasets, databases, or live model hosting.

## Live demo

[View the deployed dashboard](https://open-cv-detection-dashboard.vercel.app)

## Why I built it

This project complements my [Technical Paper AI Search Assistant](https://github.com/jburke860/technical-paper-ai-search) portfolio build by showing a different applied AI workflow: computer vision result review instead of document retrieval.

| Project                                      | Focus                                                                                            |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Technical Paper AI Search Assistant          | RAG, PDF processing, hybrid retrieval, local LLMs, backend APIs                                  |
| **Open Computer Vision Detection Dashboard** | Computer vision, model-output visualization, bounding boxes, confidence scores, and dashboard UI |

The goal of this project is not to build a production surveillance system. The goal is to show how object-detection outputs can be inspected, visualized, and summarized in a clean technical interface.

## Screenshots

### Dashboard UI — Detection Viewer

![Dashboard detection viewer](images/readme-screenshots/ui_p1.png)

### Dashboard UI — Detection Results

![Dashboard detection results table](images/readme-screenshots/ui_p2.png)

### Example Image Selection

![Example alternate detection image](images/readme-screenshots/example.png)

## Current features

* Deployed Next.js dashboard hosted on Vercel
* Public urban-scene image gallery
* Precomputed YOLOv8 detection JSON files
* Detection viewer with scaled bounding boxes
* Object labels and confidence scores rendered over images
* Hoverable detected-object list synced with box highlights
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
│   ├── DetectionViewer.tsx
│   ├── DetectionSummaryCards.tsx
│   ├── DetectionTable.tsx
│   └── ImageSelector.tsx
├── lib/
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

The deployed application loads public sample images and precomputed detection JSON files from the project’s static assets. It does not require a database, authentication system, backend API, GPU server, or cloud-hosted model.

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

* Public sample images
* Precomputed YOLOv8 detections
* Static JSON detection files
* Browser-based visualization
* Hosted frontend demo
* Optional local detection regeneration workflow

Not included:

* live webcam inference
* live browser inference
* user uploads
* authentication
* database storage
* production monitoring
* cloud model hosting
* private or sensitive image data

## Limitations

* Detection quality depends on the chosen sample images, YOLOv8n model behavior, and confidence threshold.
* Some low-confidence detections may be imperfect.
* The dashboard visualizes precomputed detections rather than running live inference in the browser.
* The project is not positioned as production-ready surveillance or security software.
* The image set is intentionally small to keep the demo focused and easy to review.

## Future improvements

Potential future extensions include:

* Confidence threshold slider
* Class-based filtering
* Side-by-side model comparison
* Detection export tools
* Larger public urban-scene image set
* FastAPI backend for optional model serving
* Live video or webcam inference
* User image upload workflow
* Optional security-oriented monitoring workflows after the static visualization demo is complete
