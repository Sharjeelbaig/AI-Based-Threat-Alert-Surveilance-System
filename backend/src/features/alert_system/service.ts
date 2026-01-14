import { describeFrame } from "../../shared/utils/describe_frame";
// We will import more utilities here later, like text-to-speech and generate alert function but for now let's focus on frame description.
export async function analyzeFrame(imageBase64: string) {
  const frameDescription = await describeFrame(imageBase64);
  // Further processing can be done here, such as tts and alert generation.
  return frameDescription;
}