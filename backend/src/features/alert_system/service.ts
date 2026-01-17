import { describeFrame } from "../../shared/utils/describe_frame";
import { convertTextToSpeech } from "../../shared/utils/convertTextToSpeech";

export async function analyzeFrame(imageBase64: string) {
  const frameDescription = await describeFrame(imageBase64);
  
  let audio = null;
  if(frameDescription?.is_threat){
    const alertText = `Alert! A potential threat has been detected The frame image description is as follows: ${frameDescription?.description}`;
    audio = (await convertTextToSpeech(alertText))
  }
  
  return { frameDescription, audio };
}