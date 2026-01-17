# Security Camera Threat Detection and Alert System
Hello! I just learned Apple has released its new vision model called FastVLM-0.5B.
I tested it, and found out they added the word "Fast" for a reason. It's blazing fast and accurate for vision tasks, so I decided to build a security camera threat detection and alert system using this model.
The system will analyze camera feeds for potential threats, and if a threat is detected, it will generate a voice alert using a text-to-speech model.
Along with the development of this project, I also documented the steps I took to build it and thought it would be helpful to share it as a tutorial for others who might be interested in building similar systems.
## Prerequisites
- Basic knowledge of TypeScript and Bun runtime.
- Very basic understanding of how LLMs work (not mandatory, as I will try my best to explain the necessary concepts along the way).
- Bun installed on your machine. You can follow the instructions [here](https://bun.sh/docs/installation).

## Terms Used
- `LLM`: Large Language Model
- `ImageTextToTextModel`: A model that takes image and text as input and generates text as output.
- `Text-to-Speech Model`: A model that converts text input into spoken audio output.
- `ONNX`: Open Neural Network Exchange, a format for representing machine learning models. This format allows models to be used in the transformers.js library. Other similar formats include SafeTensors, GGUF, etc.
- `Decoder`: A component that converts the model's output tokens into human-readable text.
- `Input Preprocessing and Output Postprocessing`: The steps taken to prepare input data for the model and to process the model's output into a usable format.
- `Processor`: A component that handles input preprocessing and output postprocessing for the model.
- `Tokenizer`: A component that converts text into tokens that the model can understand, and vice versa.
- `Blob`: A binary large object that represents raw data, e.g., an image or audio, often used to handle file-like objects in applications.
- `base64`: A method for encoding binary data (like images or audio) into a text format, making it easier to transmit over text-based protocols.
- `Inference`: The process of using a trained machine learning model to make predictions or generate outputs based on new input data.
- `Generation`: The process of producing new data (like text or audio) using a machine learning model.
- `Tokens`: The basic units of text that a model processes, which can be words, subwords, or characters.
- `embed_tokens`: The numerical representation of tokens that the model uses for processing.
- `quantization`: A technique used to reduce the size of machine learning models by converting weights and activations from higher precision (like float32) to lower precision (like int8 or int4), which helps in faster inference and reduced memory usage.

I tried to keep the tutorial as simple as possible. These terms will help you understand the concepts, and don't worry if you don't understand them fully right now. Follow along with the tutorial; it may become clearer as we progress.

## Dependencies Used
### Backend
- [hono](https://honojs.dev/): A lightweight and fast web framework
- [axios](https://axios-http.com/): A promise-based HTTP client for the browser and Node.js
- [transformers.js](https://xenova.github.io/transformers.js/): A JavaScript library for running transformer models in the browser and Node.js

### Frontend
- [axios](https://axios-http.com/): A promise-based HTTP client for the browser
- [React](https://react.dev/): A JavaScript library for building user interfaces
- [Tailwind CSS](https://tailwindcss.com/): A utility-first CSS framework for rapid UI development

## Backend First
So let's start with the backend, first let's create a folder `backend`.
In the `backend` folder, initialize a new Bun project:
```bash
cd backend
bun init
```
Install the required dependencies:
```bash
bun add @huggingface/transformers safe-text-to-json kokoro-js hono 
```

The folder structure for the backend will be based on a `features-based` architecture, which organizes code into distinct features or modules. Here's the proposed folder structure:
```bash
backend/
│ src/
│ ├─ config/ # Configuration files for individual libraries
│ │  ├─ transformers.ts     
│ │  └─ kokoro.ts             
│ ├─ features/ # Each feature has its own folder
│ │  └─ alert_system/
│ │     ├─ controller.ts  # Controller to handle incoming requests
│ │     ├─ service.ts     # Service to implement business logic
│ │     ├─ types.ts       # Types specific to this feature
│ │     └─ index.ts       # Entry point for the feature
│ ├─ shared/ # Shared resources across features
│ │  ├─ types/ # Shared types
│ │  │  └─ frameDescription.ts  # Type for frame description
│ │  └─ utils/
│ │     ├─ describe_frame.ts    # Utility to describe image frames using the vision model
│ │     └─ convertTextToSpeech.ts  # Utility to convert text to speech using TTS model
│ └─ server.ts            # Main server file
```

### Creating a transformers configuration file
So transformers is a library that enables us to run transformer models in JavaScript, it is provided by Hugging Face, a popular platform for machine learning models. We will configure and export the vision model and processor now, as the first feature we are going to implement is image threat classification using the vision model. The transformers library provides easy access to pre-trained models and processors from Hugging Face, the hub for machine learning models, datasets, and more (I know I am repeating things here, just for ensuring we stay on the same page). So we will create a `transformers.ts` file inside the `config` folder with the following code:
```typescript
import {
  AutoModelForImageTextToText,
  AutoProcessor,
} from "@huggingface/transformers";

const vision_model = AutoModelForImageTextToText.from_pretrained(
  "onnx-community/FastVLM-0.5B-ONNX",
  {
    dtype: {
      embed_tokens: "fp16",
      vision_encoder: "q4",
      decoder_model_merged: "q4",
    },
  }
);

const vision_processor = AutoProcessor.from_pretrained(
  "onnx-community/FastVLM-0.5B-ONNX"
);

export const vision_config = {
  model: await vision_model,
  processor: await vision_processor,
};
```

See AutoModelForImageTextToText and AutoProcessor, They are classes provided by the transformers.js library to load pre-trained ImageTextToText models and their associated processors. The `from_pretrained` method is used to load a model or processor from the Hugging Face Model Hub using the specified model identifier.
so we are loading the `onnx-community/FastVLM-0.5B-ONNX` model, which is the ONNX version of Apple's FastVLM-0.5B provided by the onnx-community on Hugging Face.
The code:
```ts
const vision_model = AutoModelForImageTextToText.from_pretrained(
  "onnx-community/FastVLM-0.5B-ONNX",
  {
    dtype: {
      embed_tokens: "fp16",
      vision_encoder: "q4",
      decoder_model_merged: "q4",
    },
  }
);
```
can be broken down as follows:
- `AutoModelForImageTextToText.from_pretrained`: This method is used to load a pre-trained ImageTextToText model from the Hugging Face Model Hub.
- `"onnx-community/FastVLM-0.5B-ONNX"`: This is the identifier of the pre-trained model we want to load. It specifies the model's location on the Hugging Face Model Hub.
- The second argument is an options object where we specify the data types for different parts of the model:
  - `embed_tokens: "fp16"`: This sets the data type for the token embeddings to 16-bit floating point (fp16), which helps in reducing memory usage.
  - `vision_encoder: "q4"`: This indicates that the vision encoder part of the model is quantized to 4 bits (q4), which further reduces the model size and speeds up inference.
  - `decoder_model_merged: "q4"`: This specifies that the decoder part of the model is also quantized to 4 bits (q4).
Similarly, the processor is loaded using:
```ts
const vision_processor = AutoProcessor.from_pretrained(
  "onnx-community/FastVLM-0.5B-ONNX"
);
```
This line loads the processor associated with the FastVLM-0.5B-ONNX model, which is responsible for handling input preprocessing and output postprocessing.
Finally, we export an object `vision_config` that contains both the loaded model and processor, making them available for use in other parts of the application (`src/shared/utils/describe_frame.ts`).


### Creating a utility function to describe image frames
Next, we will create a utility function that will use the vision model to describe an image. We are creating it to get the description of each frame from the camera feed, which will then be analyzed for potential threats. Create a file `describe_frame.ts` inside the `shared/utils` folder with the following code:
```typescript
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
  - is_threat: true if a person appears to hold a handgun, knife, or other weapon. Otherwise false.

  Threat criteria:
  - Any person holding a weapon (gun, knife, etc.) is a threat.
  - Any person making threatening gestures with visible weapons is a threat.
  - Any person holding a weapon even if the pose is non-threatening is still a threat.
  `;
  const userPrompt =
    "<image>Describe the content of the image in detail. Tell if image is threatening based on the \`Threat criteria\` provided. Remember any weapon or knife is ultimately considered a threat even without context. " + forceJsonPrompt;
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
  const outputs: any = await model.generate({
    ...inputs,
    max_new_tokens: 2048,
    do_sample: false,
  });

  const decoded = processor.batch_decode(
    outputs?.slice(null, [inputs.input_ids.dims.at(-1), null]),
    { skip_special_tokens: true }
  );
  return safeJsonParse(decoded[0] as string) as FrameDescription;
}
```
This function `describeFrame` takes an image in base64 format as input and returns a detailed description of the image using the vision model. It constructs a prompt asking the model to describe the content of the image and determine if any person in the image is threatening. The function processes the image and prompt, generates a response using the model, and decodes the output to return the final description as a JSON object. We can break down the function into eight main steps:

1. Getting the model and processor from the `vision_config`.
```ts
const { model, processor } = vision_config;
```

2. Constructing a prompt that instructs the model to describe the image in detail, identify any threatening individuals, and output the result in JSON format.
```ts
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
- is_threat: true if a person appears to hold a handgun, knife, or other weapon. Otherwise false.

Threat criteria:
- Any person holding a weapon (gun, knife, etc.) is a threat.
- Any person making threatening gestures with visible weapons is a threat.
- Any person holding a weapon even if the pose is non-threatening is still a threat.
`;
const userPrompt =
  "<image>Describe the content of the image in detail. Tell if image is threatening based on the \`Threat criteria\` provided. Remember any weapon or knife is ultimately considered a threat even without context. " + forceJsonPrompt;
const messages = [{ role: "user", content: userPrompt }];
const prompt = processor.apply_chat_template(messages, {
  add_generation_prompt: true,
});
```
- `<image>` is a special token used to indicate where the image input should be placed in the prompt for the model to understand that it needs to analyze the image content.
- `messages` is an array that simulates a chat-like interaction where the user provides the prompt. LLMs are often designed to handle conversational inputs, and our prompt is structured in a way that mimics a user message in a chat. It contains a single user message with the prompt. This is used to guide the model's response in a way that identifies what the user has asked for or what the assistant has responded with so far. Consider it as a conversation history. In our case, we only have one message from the user, but we could add more messages if needed, even from the assistant (LLM) role.
- `apply_chat_template` is a method provided by the processor to format the messages into a chat-like structure that the model can understand, adding any necessary generation prompts.

3. Converting the base64 image string into a Blob object for processing.
```ts
    const imageBlob = await fetch(imageBase64)
    .then((res) => res.blob())
    .then((blob) => {
      return blob;
    });
```
- `base64` is a method for encoding binary data (like images) into a text format, so for example if the image is captured from the camera feed, we have to send it to the backend, frontend cannot directly send the image file, so we convert it to base64 string to send it and then convert it back to `Blob` in the backend for processing.
- `Blob` is a binary large object that represents raw data, often used to handle file-like objects in applications, so we convert the base64 string back to Blob for further processing.

4. Creating a RawImage object from the Blob, which is a format compatible with the model.
```ts
    const image = await RawImage.fromBlob(imageBlob)
```
- `RawImage` is a class provided by the transformers.js library to handle image data in a format that the model can process, it provides methods to create image objects.

5. Using the processor to prepare the image and prompt for the model, including tokenization and formatting.
```ts
    const inputs = await processor(image, prompt, {
    add_special_tokens: false,
    });
```
- The `processor` handles input preprocessing, which includes tasks like resizing the image, normalizing pixel values, and tokenizing the text prompt. In this step, we prepare the image and prompt for the model to ensure they are in the correct format for processing and used `add_special_tokens` which is yet to be explained.
- `add_special_tokens: false`: This option indicates that we do not want to add any special tokens to the input, which are typically used to signify the beginning or end of sequences in NLP tasks. In this case, we are providing a complete prompt and image, so we don't need additional special tokens.
- `special tokens (important)`: Special tokens are unique tokens used in natural language processing (NLP) tasks to signify specific functions or positions within a sequence. Common examples include:
  - `<s>`: Start of sequence token, indicating the beginning of a text input.
  - `</s>`: End of sequence token, marking the conclusion of a text input.
  - `<pad>`: Padding token, used to fill in sequences to ensure they are of uniform length for batch processing.
  - `<unk>`: Unknown token, representing words or tokens that are not in the model's vocabulary.
  Just for your information, our model uses `|im_start|>assistant` special token to indicate the start of the image input.
  In our case, we set `add_special_tokens` to false because we are providing a complete prompt and image, so we don't need to add any additional special tokens to the input.

6. Generating the model's output based on the processed inputs, specifying parameters like maximum new tokens and sampling method.
```ts
const outputs: any = await model.generate({
  ...inputs,
  max_new_tokens: 2048,
  do_sample: false,
});
```
- `generate` is a method used to produce output from the model based on the provided inputs.
- `max_new_tokens: 2048`: This parameter sets the maximum number of new tokens that the model can generate in response to the input. In this case, it is limited to 2048 tokens.
- `do_sample: false`: This parameter indicates that the model should not use sampling when generating output. Instead, it will use a deterministic approach (like greedy decoding) to produce the most likely next tokens.

7. Decoding the model's output tokens into human-readable text, skipping any special tokens.
```ts
const decoded = processor.batch_decode(
  outputs?.slice(null, [inputs.input_ids.dims.at(-1), null]),
  { skip_special_tokens: true }
);
```
- `batch_decode` is a method provided by the processor to convert the model's output tokens back into human-readable text.
- `outputs?.slice(null, [inputs.input_ids.dims.at(-1), null])`: This line slices the output tokens to only include the newly generated tokens, excluding the input tokens.
- `skip_special_tokens: true`: This option tells the decoder to ignore any special tokens (like padding or start/end tokens) when converting the tokens back to text, ensuring that the final output is clean and readable.

8. Returning the parsed JSON object containing the description and threat assessment.
```ts
return safeJsonParse(decoded[0] as string) as FrameDescription;
```
- Finally, we return the first element of the `decoded` array, which contains the detailed description of the image generated by the model. But before returning, we parse it using `safeJsonParse` to convert the string into a JSON object and cast it as `FrameDescription`, which allows us to easily access the description and threat assessment in a structured format with proper type safety.

### Ensuring Type Safety with FrameDescription Interface
To ensure type safety and clarity in our code, we will define a TypeScript interface for the frame description returned by the `describeFrame` function. This interface will specify the expected structure of the description object, which includes a textual description and a boolean indicating whether a threat is present. Create a file `frameDescription.ts` inside the `shared/types` folder with the following code:
```typescript
export default interface FrameDescription {
  description: string;
  is_threat: boolean;
}
```
I believe now you have a good understanding of how to use the vision model to describe image frames.

> **Note:** We already included the `FrameDescription` type import and return type in the full `describeFrame` function code above, so you should be all set!

### Feature Implementation
Now that we have the utility function to describe image frames, we can proceed to implement the alert system feature. This feature will utilize the `describeFrame` function to analyze camera feeds for potential threats. So before that I would like to confirm why we created separate utility functions instead of implementing everything directly. In a feature-based architecture, creating separate utility functions offers modularity, reusability, maintainability, testability, and separation of concerns, which are essential for building scalable and efficient applications.
By encapsulating specific functionalities into utility functions, we can easily reuse them across different features, maintain them independently, and ensure that each function has a single responsibility, leading to cleaner and more organized code.

Now, let's implement the alert system feature using the `describeFrame` function. Create a folder `alert_system` inside the `features` folder, and then create the following files inside it:
- `controller.ts`: This file will handle incoming requests related to the alert system.
- `service.ts`: This file will implement the business logic for the alert system.
- `types.ts`: This file will define types specific to the alert system feature.
- `index.ts`: This file will serve as the entry point for the alert system feature.

Let's start with the `service.ts` file, where we will implement the core logic for analyzing image frames and generating alerts. Here's a basic implementation:
```typescript
import { describeFrame } from "../../shared/utils/describe_frame";
// We will import more utilities here later, like text-to-speech but for now let's focus on frame description.
export async function analyzeFrame(imageBase64: string) {
  const frameDescription = await describeFrame(imageBase64);
  // Further processing can be done here for audio alert generation later.
  return frameDescription;
}
```

This `analyzeFrame` function takes an image in base64 format as input, uses the `describeFrame` utility to get a detailed description of the image, and returns the frame description. Later, we will expand this function to include text-to-speech conversion and alert generation based on the frame description.

Let's move on to the `controller.ts` file, where we will handle incoming requests related to the alert system. Here's a basic implementation:
```typescript
import { Hono } from "hono";
import { analyzeFrame } from "./service";

const alertSystemApp = new Hono();

alertSystemApp.post("/", async (c) => {
  const { imageBase64 } = await c.req.json();
  const frameDescription = await analyzeFrame(imageBase64);
  return c.json(frameDescription);
});

export default alertSystemApp;
```
This controller sets up a POST endpoint `/` that receives an image in base64 format, calls the `analyzeFrame` service function to get the frame description, and returns the description as a JSON response.

Ensure type safety by defining types in the `types.ts` file:
```typescript
import type FrameDescription from "../../shared/types/frameDescription";
export interface AnalyzeFrameRequest {
  imageBase64: string;
}
export interface AnalyzeFrameResponse {
  frameDescription: FrameDescription;
}
```

We created two interfaces here:
- `AnalyzeFrameRequest`: This interface defines the structure of the request object for analyzing a frame, which includes a single property `imageBase64` of type `string`. This property represents the base64-encoded image that will be analyzed for threats.
- `AnalyzeFrameResponse`: Although we could use the `FrameDescription` type directly, to maintain consistency and clarity, we defined this interface to represent the structure of the response object returned after analyzing a frame. It contains a single property `frameDescription` of type `FrameDescription`, which holds the detailed description of the analyzed image frame, including whether a threat was detected.

Finally, we will create an `index.ts` file to serve as the entry point for the alert system feature:
```typescript
import alertSystemApp from "./controller";
export default alertSystemApp;
```
This file simply imports the `alertSystemApp` from the controller and exports it as the default export, making it easy to integrate the alert system feature into the main server application.

Generally, when programmers use `index.ts` (even though it's mainly re-exporting modules), it provides a centralized entry point for the feature or module, simplifies imports in other parts of the application, enhances organization and maintainability, and allows for easier scalability as the feature grows. We can also do this step for shared types and utils as well. You can figure that out—you just have to create `index.ts` in the `shared/types` and `shared/utils` folders and re-export everything from there, utilizing the barrel export pattern. I will leave that up to you as an exercise for `feature-based` architecture understanding. Otherwise, you can just import the required modules directly without creating `index.ts` files.

### Integrating the Alert System Feature into the Main Server
Now that we have implemented the alert system feature, we need to integrate it into the main server application. Open the `server.ts` file in the `src` folder and modify it as follows:
```typescript
import { Hono } from "hono";
import alertSystemApp from "./features/alert_system";
import { cors } from "hono/cors";

const app = new Hono();
app.use("*", cors());

app.route("/alert-system", alertSystemApp);
app.get("/", (c) => c.text("Intruder Alert System Backend is running"));

export default app;
```
In this code, we import the `alertSystemApp` from the alert system feature and set up a route `/alert-system` to handle requests related to the alert system. We also add CORS middleware to allow cross-origin requests, which is essential for frontend-backend communication.

I tested this API on Postman and it is working as expected.
![Test](/assets/test.png)

### Audio Alert Generation

We have successfully integrated the alert system feature into the main server application, but our alert system is like every other system. Let's make it special by adding audio alert generation using a text-to-speech model. The best model I think for this task is `onnx-community/Kokoro-82M-ONNX`. So let's add the Kokoro configuration in `src/config/kokoro.ts`:
```typescript
import { KokoroTTS } from "kokoro-js";

const model_id = "onnx-community/Kokoro-82M-ONNX";
export const tts = await KokoroTTS.from_pretrained(model_id, {
  device: "cpu",
  dtype: "fp16",
});
```

This code imports the `KokoroTTS` class from the `kokoro-js` library and initializes the TTS model with the specified model ID. We also set the `device` to "cpu" and `dtype` to "fp16" for consistent performance across different machines.

Now let's create a utility function to convert text to speech using the TTS model. Create a file `convertTextToSpeech.ts` inside the `shared/utils` folder with the following code:
```typescript
import { tts } from "../../config/kokoro";

export async function convertTextToSpeech(text: string): Promise<Float32Array> {
  const { audio } = await tts.generate(text, {
    voice: "bm_george",
  });
  return audio;
}
```

This function `convertTextToSpeech` takes a text string as input and uses the Kokoro TTS model to generate spoken audio. It specifies the voice to be used for the speech synthesis (`bm_george`) and returns the generated audio as a `Float32Array`. The function destructures the `audio` property from the result since `tts.generate` returns an object containing the audio data.

Let's now update the `analyzeFrame` function in the `service.ts` file to include text-to-speech conversion and alert generation based on the frame description. Here's the updated implementation:
```typescript
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
```

Ensure you also update the controller to return both the frame description and audio. Update `controller.ts`:
```typescript
import { Hono } from "hono";
import { analyzeFrame } from "./service";

const alertSystemApp = new Hono();

alertSystemApp.post("/", async (c) => {
  const { imageBase64 } = await c.req.json();
  const { frameDescription, audio } = await analyzeFrame(imageBase64);
  return c.json({ frameDescription, audio });
});

export default alertSystemApp;
```

Also update the `AnalyzeFrameResponse` interface in the `types.ts` file to include the audio:
```typescript
import type FrameDescription from "../../shared/types/frameDescription";

export interface AnalyzeFrameRequest {
  imageBase64: string;
}

export interface AnalyzeFrameResponse {
  frameDescription: FrameDescription;
  audio: Float32Array | null;
}
```

Okay, now the backend of our Security Surveillance Threat Detection and Alert System is complete with audio alert generation. We need to quickly wrap up the frontend. So let's move on to the frontend implementation.

## Frontend Implementation
First of all, it is worth mentioning that I will not focus on the frontend much to keep the tutorial simple since the main logic resides in the backend. This also gives you some flexibility to customize it as you wish. So let's get started!

First, we need to create a folder for the frontend part of the application. Inside that folder, we will run `bun init` and select React and TypeScript as our options. This will create a basic React application for us.

We should get rid of all the boilerplate files first, so delete these files:
- `src/APITester.tsx`
- `src/react.svg`

Also, clean up the `src/index.css` file to remove unnecessary styles. You can replace the content of `src/index.css` with the following:
```css
@import "tailwindcss";
```

Next, make sure to install the required dependencies:

```bash
bun add axios react-camera-pro play-pcm
```

We should make sure our frontend runs on a different port, let's say port 3001. To do that, open `index.ts` and make sure it looks like this:

```tsx
import { serve } from "bun";
import index from "./index.html";

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
  port: 3001,
});

console.log(`🚀 Server running at ${server.url}`);
```
The code above configures the Bun development server to listen on port 3001 instead of the default port. I also cleaned up some routes that the boilerplate code had, so now we only have the `/*` route and no "hello world" route.

We should structure our `src` folder a bit better, so let's create the following folders inside `src`:
- `components`
- `services`

Now we can create our CameraFeed component inside the components folder. Create a new file called `CameraFeed.tsx` inside the `components` folder and add the following code:

```tsx
import React, { useRef } from "react";
import { Camera, type CameraType } from "react-camera-pro";

export function CameraFeed() {
  const [audioPCMData, setAudioPCMData] = React.useState<Float32Array | null>(null);
  const cameraRef = useRef<CameraType>(null);
  
  const handleCapture = async () => {
    // to be implemented
  }

  return (
    <div>
       <Camera
          ref={cameraRef}
          aspectRatio="cover"
          errorMessages={{
            noCameraAccessible: "No camera accessible. Please connect a camera.",
            permissionDenied: "Camera permission denied. Please allow camera access.",
            switchCamera: "Cannot switch camera",
            canvas: "Canvas error",
          }}
        />
 
    </div>
  );
}
```
This component sets up the camera feed using the `react-camera-pro` library. We also set up a state variable to hold the audio PCM data that we will receive after implementing the alert service.

Next, we will implement the `alert` service to send API requests to the backend. Create a new file called `alert.ts` inside the `services` folder and add the following code:

```typescript
import axios from "axios";

const API_URL = "http://localhost:3000"; 

export async function sendAlert(imageData: string) {
  try {
    const response = await axios.post(`${API_URL}/alert-system`, {
      imageBase64: imageData,
    });
    return response.data;
  } catch (error) {
    console.error("Error sending alert:", error);
    throw error;
  }
} 
```

Now that we have created the service, we need to implement the `handleCapture` function inside the `CameraFeed` component to capture the image from the camera and send it to the backend using the `sendAlert` service. We will run the capture function every 5 seconds to continuously monitor the camera feed and reduce the load on the backend. Sending too many requests in a short period of time, which includes inferencing language models, can be expensive and slow down the system or may even be dangerous in some cases. So we will use `setInterval` to run the capture function every 5 seconds. Update the `CameraFeed.tsx` file as follows:

```tsx
import React, { useEffect, useRef } from "react";
import { Camera, type CameraType } from "react-camera-pro";
import { sendAlert } from "@/services/alert";
import { playPCM } from "play-pcm";

export function CameraFeed() {
  const [loading, setLoading] = React.useState(false);
  const [audioPCMData, setAudioPCMData] = React.useState<Float32Array | null>(
    null,
  );
  const [threatDescription, setThreatDescription] = React.useState<string>("");
  const cameraRef = useRef<CameraType>(null);

  const handleCapture = async () => {
    if (cameraRef.current) {
      setLoading(true);
      const photo = cameraRef.current.takePhoto();
      const response = await sendAlert(photo as string);
      if (response) {
        setLoading(false);
        if (response.frameDescription?.is_threat) {
          setThreatDescription(
            `⚠️ THREAT DETECTED: ${response.frameDescription.description}`,
          );
        }
        if (response.audio) {
          setAudioPCMData(new Float32Array(Object?.values(response.audio)));
        }

        console.log("Alert response:", response);
      }
    } else {
      console.log("Capture in progress, skipping...");
    }
  };

  useEffect(() => {
    if (loading) return;
    const intervalId = setInterval(handleCapture, 5000); // Capture every 5 seconds
    return () => clearInterval(intervalId);
  }, [loading]);

  useEffect(() => {
    if (audioPCMData) {
      playPCM(audioPCMData, { sampleRate: 16000, playbackRate: 1.6 });
    }
  }, [audioPCMData]);

  return (
    <div className="h-full w-full">
      {loading  && (
        <div className="z-10 p-4 absolute top-2 left-2 bg-black text-white rounded-md">
          <p>Analyzing frame...</p>{" "}
        </div>
      ) }
      {threatDescription &&
      <div className="z-10 p-4 absolute top-18 left-2 bg-black text-white rounded-md">
         <p>{threatDescription}</p>
      </div>
      }
      <div className="h-full *:h-full">
        <Camera
          ref={cameraRef}
          aspectRatio="cover"
          errorMessages={{
            noCameraAccessible:
              "No camera accessible. Please connect a camera.",
            permissionDenied:
              "Camera permission denied. Please allow camera access.",
            switchCamera: "Cannot switch camera",
            canvas: "Canvas error",
          }}
        />
      </div>
    </div>
  );
}
```
Now let's add this component to our `App.tsx`:

```tsx
import { CameraFeed } from './components/CameraFeed'
import "./index.css";

export function App() {
  return (
    <CameraFeed />
  );
}

export default App;
```

## Running the Application

Now that we have both the frontend and backend ready, let's run the application!

### Start the Backend
Open a terminal, navigate to the `backend` folder, and run:
```bash
cd backend
bun run src/server.ts # we can also create a script in package.json for this  
```

The backend will start on `http://localhost:3000`. Note that the first time you run it, it will download the AI models which may take a few minutes depending on your internet connection.

### Start the Frontend
Open another terminal, navigate to the `frontend` folder, and run:
```bash
cd frontend
bun run dev
```

The frontend will start on `http://localhost:3001`. Open this URL in your browser, allow camera access when prompted, and the system will start analyzing your camera feed every 5 seconds for potential threats.

## Frontend Implementation (desktop-app)

While our web-based frontend works great in the browser, there's something incredibly satisfying about having a dedicated native desktop application for security monitoring. A native app can sit in your dock/taskbar, start automatically when your computer boots, and provide a more focused experience without browser tabs getting in the way.

The good news? We don't need to build a completely separate application! **Tauri** allows us to wrap our existing React frontend into a lightweight, secure native desktop application. Think of it as putting your web app in a native shell—same code, native experience.

### Why Tauri?

Before we dive in, let's understand why Tauri is perfect for this use case:

- 🪶 **Lightweight**: Unlike Electron, Tauri apps are typically under 10MB because they use the system's native webview
- 🔒 **Secure**: Built with Rust, it provides memory safety and security by default
- ⚡ **Fast**: Native performance with minimal resource overhead
- 🔧 **Easy Integration**: Can be added to any existing web project with minimal changes

### Installing the Tauri CLI

First, let's add the Tauri CLI as a development dependency to our existing frontend project. Open a terminal, navigate to the `frontend` folder, and run:

```bash
cd frontend
bun install --save-dev @tauri-apps/cli
```

This installs the Tauri CLI locally in your project, which is the recommended approach as it ensures everyone working on the project uses the same version.

### Initializing Tauri in Your Project

Now comes the exciting part—transforming our web app into a desktop app! Run the Tauri initialization command:

```bash
npx tauri init
```

You'll be prompted with a series of questions. Here's what to enter:

1. **What is your app name?** → Enter your preferred name (e.g., `s3` or `intruder-alert`)

2. **What should the window title be?** → Something descriptive like `S3 - Security Surveillance System`

3. **Where are your web assets located?** → `../build` (this is where Bun outputs the built files)

4. **What is the url of your dev server?** → `http://localhost:3001` (our frontend dev server port)

5. **What is your frontend dev command?** → `bun run dev`

6. **What is your frontend build command?** → `bun run build`

After answering these questions, Tauri will create a `src-tauri` folder in your frontend directory with the following structure:

```
frontend/
├── src/
│   └── ... (your existing React code)
├── src-tauri/
│   ├── src/
│   │   ├── main.rs          # Rust entry point
│   │   └── lib.rs           # Rust library code
│   ├── icons/               # App icons for all platforms
│   ├── tauri.conf.json      # Tauri configuration
│   ├── Cargo.toml           # Rust dependencies
│   └── build.rs             # Build script
└── package.json
```

### Understanding the Tauri Configuration

Let's take a look at the generated `src-tauri/tauri.conf.json`. This is the heart of your Tauri configuration:

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "S3 - Security Surveillance System",
  "version": "0.1.0",
  "identifier": "com.s3.security",
  "build": {
    "beforeDevCommand": "bun run dev",
    "devUrl": "http://localhost:3001",
    "beforeBuildCommand": "bun run build",
    "frontendDist": "../build"
  },
  "app": {
    "windows": [
      {
        "title": "S3 - Security Surveillance System",
        "width": 1024,
        "height": 768
      }
    ],
    "security": {
      "csp": null
    }
  }
}
```

Let's break down the important parts:

- **`productName`**: The name that appears in the app's title bar and system menus
- **`identifier`**: A unique identifier for your app (reverse domain notation)
- **`beforeDevCommand`**: The command Tauri runs to start your dev server
- **`devUrl`**: Where your dev server is running
- **`beforeBuildCommand`**: The command to build your frontend for production
- **`frontendDist`**: Where the built files are located (make sure to change it to `../dist` as Bun outputs to `dist` by default)
- **`csp: null`**: Disables Content Security Policy to allow camera access and API calls (important for our use case!)

Feel free to adjust the window dimensions. For a security monitoring app, you might want a larger default size like `1280x720` for better camera feed visibility.

### Installing Rust

Before we can run the desktop app, we need to install the Tauri Rust dependencies. Tauri will handle this automatically when you first run the app, but make sure you have Rust installed on your system:

```bash
# If you don't have Rust installed, install it first:
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### Running the Desktop Application

Now for the moment of truth! Make sure your backend is running first (in a separate terminal), then start the desktop app:

```bash
# In the frontend folder
bun run tauri dev
```

The first time you run this command, Tauri will:
1. Download and compile all Rust dependencies (this takes a few minutes)
2. Start your frontend dev server
3. Open a native window with your app running inside

> **☕ Grab a coffee!** The first compilation can take 2-5 minutes depending on your machine. Subsequent runs will be much faster thanks to caching.

Once compiled, you'll see a native desktop window open with your Security Surveillance System! The camera feed should work just like in the browser, and threat detection alerts will appear as expected.

### Enhancing the Desktop Experience

Now that we have a working desktop app, let's make a few enhancements to improve the native experience.

#### Updating the Window Configuration

Open `src-tauri/tauri.conf.json` and update the window configuration for a better security monitoring experience:

```json
{
  "app": {
    "windows": [
      {
        "title": "S3 - Security Surveillance System",
        "width": 1280,
        "height": 720,
        "resizable": true,
        "fullscreen": false,
        "center": true,
        "decorations": true
      }
    ],
    "security": {
      "csp": null
    }
  }
}
```

The new settings:
- **`center: true`**: Opens the window in the center of the screen
- **`decorations: true`**: Shows the native window title bar and controls
- **`resizable: true`**: Allows users to resize the window

### Building for Production

When you're ready to distribute your app, building for production is straightforward:

```bash
bun run tauri build
```

This command will:
1. Build your React frontend for production
2. Compile the Rust backend in release mode
3. Bundle everything into platform-specific installers

The output will be in `src-tauri/target/release/bundle/`:

| Platform | Output Files |
|----------|-------------|
| **macOS** | `.dmg` installer and `.app` bundle |
| **Windows** | `.msi` installer and `.exe` |
| **Linux** | `.deb`, `.rpm`, and `.AppImage` |

### Adding Scripts to package.json

For convenience, add these scripts to your `frontend/package.json`:

```json
{
  "scripts": {
    "dev": "bun run --hot src/index.ts",
    "build": "bun run build.ts",
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build"
  }
}
```

Now you can simply run:
- `bun run tauri:dev` - Start the desktop app in development mode
- `bun run tauri:build` - Build the production installer

### Desktop vs Web: When to Use Which?

| Feature | Web Frontend | Desktop App |
|---------|-------------|-------------|
| **Distribution** | Share a URL | Install native app |
| **Camera Access** | Browser permissions | OS-level permissions |
| **Performance** | Browser overhead | Native performance |
| **Startup** | Open browser + navigate | Double-click app icon |
| **Background Running** | Tab must stay open | Runs independently |
| **System Integration** | Limited | Full (tray, notifications, etc.) |
| **Offline Capable** | No | Yes (with local backend) |

For a security monitoring application, the desktop app provides significant advantages:
- **Reliability**: No accidental tab closures
- **Quick Access**: Dedicated app in your dock/taskbar
- **Professional Feel**: Looks like dedicated security software
- **Future Features**: Easy to add system tray support, auto-start on boot, etc.

### Troubleshooting Common Issues

**Camera not working in Tauri?**
- Make sure `"csp": null` is set in your Tauri config
- On macOS, you may need to grant camera permissions in System Preferences

**Build fails with Rust errors?**
- Ensure Rust is up to date: `rustup update`
- Try cleaning the build: `cd src-tauri && cargo clean`

**App window is blank?**
- Check that your dev server is running on the correct port
- Verify `devUrl` in `tauri.conf.json` matches your server URL

Congratulations! 🎉 You've successfully converted your web-based security monitoring system into a native desktop application. The same React code now runs as both a web app and a desktop app—the best of both worlds!

## Conclusion
Congratulations! You've built a complete Security Camera Threat Detection and Alert System using:
- **Apple's FastVLM-0.5B** for fast and accurate image analysis
- **Kokoro TTS** for generating audio alerts
- **Bun** as the runtime for both frontend and backend
- **React** with Tailwind CSS for the user interface
- **Hono** as the lightweight backend framework

This system demonstrates how modern AI models can be integrated into practical applications for real-time threat detection and alerting.

### Key Takeaways
1. **Local AI Inference**: Running AI models locally with transformers.js provides privacy and reduces latency.
2. **Feature-Based Architecture**: Organizing code by features improves maintainability and scalability.
3. **Real-Time Processing**: Using intervals for camera capture balances responsiveness with system load.
4. **Type Safety**: TypeScript interfaces ensure consistent data structures across the application.

Feel free to extend this project by adding features like:
- Multiple camera support
- Alert history logging
- Email/SMS notifications
- Custom threat detection rules

Happy coding! 🚀