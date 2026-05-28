export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Detection {
  id: number;
  label: string;
  confidence: number;
  box: BoundingBox;
}

export interface DetectionFile {
  image: string;
  id: string;
  title: string;
  description: string;
  width: number;
  height: number;
  model: string;
  generatedBy: string;
  detections: Detection[];
}

export interface ImageSample {
  id: string;
  title: string;
  description: string;
  imagePath: string;
  detectionPath: string;
}

export interface DetectionSummary {
  totalDetections: number;
  uniqueClasses: number;
  highestConfidence: number;
  averageConfidence: number;
  classCounts: Record<string, number>;
}
