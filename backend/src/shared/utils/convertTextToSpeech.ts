import { tts } from "../../config/kokoro";

export async function convertTextToSpeech(text: string): Promise<Float32Array> {
  const {audio} = await tts.generate(text, {
    voice: "bm_george",
  });
  
  return audio;
}