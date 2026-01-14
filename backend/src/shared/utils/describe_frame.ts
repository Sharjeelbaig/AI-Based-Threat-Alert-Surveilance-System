import safeJsonParse from "safe-text-to-json";
import { vision_config } from "../../config/transformers";
import { RawImage } from "@huggingface/transformers";
import type FrameDescription from "../types/frameDescription";

export async function describeFrame(imageBase64: string): Promise<FrameDescription> {
  const { model, processor } = vision_config;
  const forceJsonPrompt = `
  You MUST output ONLY valid JSON.
  No explanation, no markdown.

  JSON schema:
  {
    "description": string,
    "is_threat": boolean
  }

  Rules:
  - description: factual description of visible content only
  - is_threat: true only if a person appears to pose a physical threat.
  `;
  const userPrompt =
    "<image>Describe the content of the image in detail. Tell if any person in the image is threatening or not" + forceJsonPrompt;
  const messages = [{ role: "user", content: userPrompt }];
  const prompt = processor.apply_chat_template(messages, {
    add_generation_prompt: true,
  });

  const imageBlob = await fetch(imageBase64)
    .then((res) => res.blob())
    .then((blob) => {
      return blob;
    });

  const image = await RawImage.fromBlob(imageBlob);
  const inputs = await processor(image, prompt, {
    add_special_tokens: false,
  });

  // Generate output
  const outputs:any = await model.generate({
    ...inputs,
    max_new_tokens: 512,
    do_sample: false,
  });

  const decoded = processor.batch_decode(
    outputs.slice(null, [inputs.input_ids.dims.at(-1), null]),
    { skip_special_tokens: true }
  );
  return safeJsonParse(decoded[0] as string) as FrameDescription;
}

/*
# Imports
-> So we imported vision_config from config/transformers.ts which contains the model and processor,
# Creating a utility function to describe an image frame
-> then we defined an asynchronous function describeFrame that takes an image buffer as input.
# crafting the prompt and messages
-> Inside the function, we utilize the processor to create a prompt based on a user message
asking to describe the content of the image in detail and identify if any person in the image is threatening.
-> Now there is a messages array, it contains a single user message with the prompt. Used to guide the model's response in a way
that it identifies what user has asked for or what I have responded with so far. Consider it as a conversation history. In our case,
we only have one message from the user, but we could add more messages if needed, even from the assistant role.
# Applying the chat template
-> We apply the chat template using the processor's apply_chat_template method, passing in the messages array
and `add_generation_prompt: true` which is a boolean flag indicating whether to include a generation prompt. 
A generation prompt is an additional instruction or context that helps guide the model's response generation, this is technically a
string like "### Response:" or "<ASSISTANT> ", and it depends on the specific model and processor being used.
just for your information, in our case, it is "<|im_start|>assistant".
# Converting image from base64 to blob
-> Next, we convert the image buffer to a base64 string and then create a Blob object from it using the fetch method.
# Loading the image as an image input
-> We then load the image as an image input using the processor's RawImage.from_blob method.
# Generating the description using the model
-> Finally, we call the model's generate method, passing in the image inputs
-> We added max_new_tokens set to 512 to limit the length of the generated description.
-> We also added do_sample set to false to ensure deterministic output from the model. Because the 
do sampling introduces randomness in the generation process, which can lead to different outputs for the same input each time the model is run.
*/
