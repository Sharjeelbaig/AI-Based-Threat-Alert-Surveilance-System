import type FrameDescription from "../../shared/types/frameDescription";

export interface AnalyzeFrameRequest {
  imageBase64: string;
}

export interface AnalyzeFrameResponse {
  frameDescription: FrameDescription;
  audio: Float32Array | null;
}