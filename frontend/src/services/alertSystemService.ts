import axios from "axios";

const API_BASE_URL = "http://localhost:3000"; // Backend runs on port 3000

export interface FrameDescription {
  description: string;
  is_threat: boolean;
}

export interface AnalyzeFrameResponse {
  frameDescription: FrameDescription;
  audio: number[] | null; // Audio data as array of samples
}

/**
 * Sends a captured frame to the backend for threat analysis.
 * @param imageBase64 - Base64 encoded image string
 * @returns Analysis result including frame description and optional audio alert
 */
export async function analyzeFrame(
  imageBase64: string
): Promise<AnalyzeFrameResponse> {
  const response = await axios.post<AnalyzeFrameResponse>(
    `${API_BASE_URL}/alert-system`,
    { imageBase64 }
  );
  return response.data;
}
