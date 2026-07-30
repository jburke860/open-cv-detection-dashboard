import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  type User,
} from "firebase/auth";
import {
  collection,
  doc,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable,
} from "firebase/storage";

import type { Detection } from "@/lib/detectionTypes";

export type DetectionJobStatus = "queued" | "running" | "complete" | "failed";
export type DetectionArtifactKind = "annotatedImage" | "json" | "csv";

export type DetectionModelId =
  | "yolov8n"
  | "yolov8s"
  | "yolo11n"
  | "yolo11s"
  | "yolo12n"
  | "rtdetr-l"
  | "yolov8s-world";

export const DETECTION_MODELS: Array<{
  id: DetectionModelId;
  label: string;
  hint: string;
  /** Open-vocabulary model driven by a text class prompt. */
  world?: boolean;
  /** DETR-style detector without non-maximum suppression. */
  noNms?: boolean;
}> = [
  { id: "yolo11n", label: "YOLO11n", hint: "Fast · recommended" },
  { id: "yolo11s", label: "YOLO11s", hint: "Balanced · more accurate" },
  { id: "yolov8n", label: "YOLOv8n", hint: "Previous generation · fast" },
  { id: "yolov8s", label: "YOLOv8s", hint: "Previous generation · accurate" },
  { id: "yolo12n", label: "YOLO12n", hint: "Attention-based · slower on CPU" },
  {
    id: "rtdetr-l",
    label: "RT-DETR-L",
    hint: "Transformer · slowest, NMS-free",
    noNms: true,
  },
  {
    id: "yolov8s-world",
    label: "YOLOv8s-World",
    hint: "Open vocabulary · custom classes",
    world: true,
  },
];

export function getModelInfo(id: DetectionModelId) {
  return DETECTION_MODELS.find((model) => model.id === id) ?? DETECTION_MODELS[0];
}

export interface InferenceOptions {
  confidenceThreshold: number;
  model: DetectionModelId;
  iouThreshold: number;
  maxDetections: number;
  /** Comma-separated class list for open-vocabulary models; "" = default. */
  classPrompt: string;
}

export const DEFAULT_INFERENCE_OPTIONS: InferenceOptions = {
  confidenceThreshold: 0.25,
  model: "yolo11n",
  iouThreshold: 0.45,
  maxDetections: 100,
  classPrompt: "",
};

export interface DetectionJobResult {
  annotatedImagePath?: string;
  annotatedImageUrl?: string;
  jsonPath?: string;
  jsonUrl?: string;
  csvPath?: string;
  csvUrl?: string;
  detections?: Detection[];
  width?: number;
  height?: number;
  runtimeMs?: number;
  model?: string;
}

export interface DetectionJobRecord {
  id: string;
  status: DetectionJobStatus;
  confidenceThreshold?: number;
  inputPath?: string;
  inputUrl?: string;
  inputName?: string;
  outputPrefix?: string;
  message?: string;
  error?: string;
  result?: DetectionJobResult;
}

interface CreateDetectionJobOptions extends InferenceOptions {
  file: File;
  onUploadProgress?: (progress: number) => void;
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  // Optional; Analytics falls back to a dynamic config fetch via appId.
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const requiredFirebaseConfig = [
  {
    key: "NEXT_PUBLIC_FIREBASE_API_KEY",
    value: firebaseConfig.apiKey,
  },
  {
    key: "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    value: firebaseConfig.authDomain,
  },
  {
    key: "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    value: firebaseConfig.projectId,
  },
  {
    key: "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    value: firebaseConfig.storageBucket,
  },
  {
    key: "NEXT_PUBLIC_FIREBASE_APP_ID",
    value: firebaseConfig.appId,
  },
] as const;

export const detectionApiUrl =
  process.env.NEXT_PUBLIC_DETECTION_API_URL?.replace(/\/$/, "") ?? "";

const JOB_RETENTION_MS = 24 * 60 * 60 * 1000;

let app: FirebaseApp | undefined;

export function getMissingFirebaseConfig() {
  return requiredFirebaseConfig
    .filter((item) => !item.value)
    .map((item) => item.key);
}

export function isFirebaseConfigured() {
  return getMissingFirebaseConfig().length === 0;
}

export function isDetectionApiConfigured() {
  return detectionApiUrl.length > 0;
}

export function getFirebaseApp() {
  if (!isFirebaseConfigured()) {
    throw new Error(
      `Missing Firebase config: ${getMissingFirebaseConfig().join(", ")}`
    );
  }

  app = app ?? getApps()[0] ?? initializeApp(firebaseConfig);
  return app;
}

function getClients() {
  const firebaseApp = getFirebaseApp();
  return {
    auth: getAuth(firebaseApp),
    db: getFirestore(firebaseApp),
    storage: getStorage(firebaseApp),
  };
}

async function ensureAnonymousUser(): Promise<User> {
  const { auth } = getClients();
  if (auth.currentUser) {
    return auth.currentUser;
  }

  const credential = await signInAnonymously(auth);
  return credential.user;
}

function safeStorageName(fileName: string) {
  const [baseName, extension] = fileName.split(/\.(?=[^.]+$)/);
  const safeBase = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const safeExtension = extension?.toLowerCase().replace(/[^a-z0-9]/g, "");

  return `${safeBase || "upload"}${safeExtension ? `.${safeExtension}` : ""}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown) {
  return typeof value === "number" ? value : undefined;
}

function asStatus(value: unknown): DetectionJobStatus {
  if (
    value === "queued" ||
    value === "running" ||
    value === "complete" ||
    value === "failed"
  ) {
    return value;
  }

  return "queued";
}

function asDetections(value: unknown): Detection[] | undefined {
  return Array.isArray(value) ? (value as Detection[]) : undefined;
}

function normalizeJob(id: string, value: unknown): DetectionJobRecord {
  const data = asRecord(value);
  const input = asRecord(data.input);
  const result = asRecord(data.result);

  return {
    id,
    status: asStatus(data.status),
    confidenceThreshold: asNumber(data.confidenceThreshold),
    inputPath: asString(input.storagePath) ?? asString(data.inputPath),
    inputUrl: asString(input.url) ?? asString(data.inputUrl),
    inputName: asString(input.originalName) ?? asString(data.inputName),
    outputPrefix: asString(data.outputPrefix),
    message: asString(data.message),
    error: asString(data.error),
    result: {
      annotatedImagePath:
        asString(result.annotatedImagePath) ?? asString(data.annotatedImagePath),
      annotatedImageUrl:
        asString(result.annotatedImageUrl) ?? asString(data.annotatedImageUrl),
      jsonPath: asString(result.jsonPath) ?? asString(data.jsonPath),
      jsonUrl: asString(result.jsonUrl) ?? asString(data.jsonUrl),
      csvPath: asString(result.csvPath) ?? asString(data.csvPath),
      csvUrl: asString(result.csvUrl) ?? asString(data.csvUrl),
      detections:
        asDetections(result.detections) ?? asDetections(data.detections),
      width: asNumber(result.width) ?? asNumber(data.width),
      height: asNumber(result.height) ?? asNumber(data.height),
      runtimeMs: asNumber(result.runtimeMs),
      model: asString(result.model),
    },
  };
}

async function callDetectionService(jobId: string, idToken: string) {
  if (!isDetectionApiConfigured()) {
    return;
  }

  const response = await fetch(`${detectionApiUrl}/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    // The service reads all job parameters from the Firestore document;
    // the request only identifies the job and proves ownership.
    body: JSON.stringify({ jobId }),
  });

  if (!response.ok) {
    throw new Error(`Detection service returned HTTP ${response.status}`);
  }
}

export async function createDetectionJob({
  file,
  confidenceThreshold,
  model,
  iouThreshold,
  maxDetections,
  classPrompt,
  onUploadProgress,
}: CreateDetectionJobOptions) {
  const user = await ensureAnonymousUser();
  const { db, storage } = getClients();
  const jobRef = doc(collection(db, "detectionJobs"));
  const jobId = jobRef.id;
  const inputPath = `detection-jobs/${user.uid}/${jobId}/input/${safeStorageName(
    file.name
  )}`;
  const outputPrefix = `detection-jobs/${user.uid}/${jobId}/output`;
  const inputRef = ref(storage, inputPath);
  const uploadTask = uploadBytesResumable(inputRef, file, {
    contentType: file.type,
    customMetadata: {
      jobId,
      originalName: file.name,
    },
  });

  await new Promise<void>((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress =
          snapshot.totalBytes > 0
            ? snapshot.bytesTransferred / snapshot.totalBytes
            : 0;
        onUploadProgress?.(progress);
      },
      reject,
      () => resolve()
    );
  });

  await setDoc(jobRef, {
    status: "queued",
    confidenceThreshold,
    model,
    iouThreshold,
    maxDetections,
    classPrompt: getModelInfo(model).world
      ? classPrompt.trim() || null
      : null,
    ownerId: user.uid,
    input: {
      storagePath: inputPath,
      originalName: file.name,
      contentType: file.type,
      size: file.size,
    },
    outputPrefix,
    message: isDetectionApiConfigured()
      ? "Queued for Cloud Run detection service."
      : "Queued. Configure NEXT_PUBLIC_DETECTION_API_URL or trigger Cloud Run from this Firestore record.",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    expireAt: Timestamp.fromDate(new Date(Date.now() + JOB_RETENTION_MS)),
  });

  try {
    const idToken = await user.getIdToken();
    await callDetectionService(jobId, idToken);
  } catch (error) {
    await updateDoc(jobRef, {
      status: "failed",
      error:
        error instanceof Error
          ? error.message
          : "Failed to start detection service",
      updatedAt: serverTimestamp(),
    });
    throw error;
  }

  return jobId;
}

export function subscribeToDetectionJob(
  jobId: string,
  onChange: (job: DetectionJobRecord) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const { db } = getClients();
  return onSnapshot(
    doc(db, "detectionJobs", jobId),
    (snapshot) => {
      if (snapshot.exists()) {
        onChange(normalizeJob(snapshot.id, snapshot.data()));
      }
    },
    onError
  );
}

export async function getDetectionArtifactUrl(
  job: DetectionJobRecord,
  kind: DetectionArtifactKind
) {
  const directUrl = job.result?.[`${kind}Url`];
  if (directUrl) {
    return directUrl;
  }

  const storagePath = job.result?.[`${kind}Path`];
  if (!storagePath) {
    return undefined;
  }

  const { storage } = getClients();
  return getDownloadURL(ref(storage, storagePath));
}
