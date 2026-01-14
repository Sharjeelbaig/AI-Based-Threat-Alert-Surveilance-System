import type { RawAudio } from "@huggingface/transformers";
import { tts } from "../../config/kokoro";

export async function convertTextToSpeech(text: string): Promise<RawAudio> {
  const audio = await tts.generate(text, {
    voice: "bm_george",
  });
  return audio;
}