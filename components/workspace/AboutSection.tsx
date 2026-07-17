import { Card, CardBody, CardHeader } from "@/components/ui/Card";

const PIPELINE_STEPS = [
  "Upload an image from the dashboard",
  "The image is stored securely in Firebase Storage",
  "A Firestore job tracks inference status in real time",
  "Cloud Run processes the image with the selected YOLO/RT-DETR model",
  "Download the annotated image, JSON, or CSV results",
];

export function AboutSection() {
  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader title="Why I built this" />
        <CardBody className="text-sm leading-6 text-ink-muted">
          This project demonstrates an end-to-end computer vision workflow, not
          just a static model output: a user-facing web app that accepts an
          upload, queues an inference job, processes it in the cloud, and
          returns usable detection artifacts — the way production AI tools are
          typically structured.
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="How the live pipeline works" />
        <CardBody>
          <ol className="space-y-2.5 text-sm text-ink-muted">
            {PIPELINE_STEPS.map((step, index) => (
              <li key={step} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft font-mono text-[11px] font-semibold text-accent">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="What it demonstrates" />
        <CardBody>
          <ul className="list-disc space-y-1.5 pl-4 text-sm leading-6 text-ink-muted">
            <li>Next.js + TypeScript frontend development</li>
            <li>Firebase Auth, Storage, and Firestore integration</li>
            <li>Cloud Run FastAPI backend deployment</li>
            <li>Multi-model detection (YOLOv8–12, RT-DETR, YOLO-World)</li>
            <li>Asynchronous job status tracking</li>
            <li>Annotated image, JSON, and CSV generation</li>
          </ul>
        </CardBody>
      </Card>
    </section>
  );
}
