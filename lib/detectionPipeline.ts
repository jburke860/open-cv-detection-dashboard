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

interface CreateDetectionJobOptions {
  file: File;
  confidenceThreshold: number;
  onUploadProgress?: (progress: number) => void;
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
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

function getFirebaseApp() {
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
    },
  };
}

async function callDetectionService(payload: {
  jobId: string;
  inputPath: string;
  outputPrefix: string;
  confidenceThreshold: number;
  originalName: string;
}) {
  if (!isDetectionApiConfigured()) {
    return;
  }

  const response = await fetch(`${detectionApiUrl}/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Detection service returned HTTP ${response.status}`);
  }
}

export async function createDetectionJob({
  file,
  confidenceThreshold,
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
  });

  try {
    await callDetectionService({
      jobId,
      inputPath,
      outputPrefix,
      confidenceThreshold,
      originalName: file.name,
    });
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
