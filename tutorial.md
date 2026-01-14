# Security Camera Threat Detection and Alert System
Hello! I just learned apple has released it's new vision model called FastVLM-0.5B.
I tested it, and found out they added the word "Fast" for a reason. It's blazing fast and accurate for vision tasks, so I decided to build a security camera threat detection and alert system using this model.
The system will analyze camera feeds for potential threats, and if a threat is detected, it will generate a voice alert using a text-to-speech model.
I along with the development of this project also documented the steps I took to build it. And thought it would be helpful to share it as a tutorial for others who might be interested in building similar systems.
## Prerequisites
- Basic knowledge of TypeScript and Bun runtime.
- Very basic understanding of how LLMs work ( not mandatory, as I will try my best to explain the necessary concepts along the way).
- Bun installed on your machine. You can follow the instructions [here](https://bun.sh/docs/installation).

## Terms Used
- `LLM`: Large Language Model
- `ImageTextToTextModel`: A model that takes image and text as input and generates text as output.
- `Text-to-Speech Model`: A model that converts text input into spoken audio output.
- `ONNX`: Open Neural Network Exchange, a format for representing machine learning models, this format allows models to be used in transformers.js library, other similar formats are safeTensors, GGUF etc.
- `Decoder`: A component that converts the model's output tokens into human-readable text.
- `Input Preprocessing and Output Postprocessing`: The steps taken to prepare input data for the model and to process the model's output into a usable format.
- `Processor`: A component that handles input preprocessing and output postprocessing for the model.
- `Tokenizer`: A component that converts text into tokens that the model can understand, and vice versa.
- `Blob`: A binary large object that represents raw data e.g an image or audio etc, often used to handle file-like objects in applications.
- `base64`: A method for encoding binary data (like images or audio) into a text format, making it easier to transmit over text-based protocols.
- `Inference`: The process of using a trained machine learning model to make predictions or generate outputs based on new input data.
- `Generation`: The process of producing new data (like text or audio) using a machine learning model.
- `Tokens`: The basic units of text that a model processes, which can be words, subwords, or characters.
- `embed_tokens`: The numerical representation of tokens that the model uses for processing.
- `quantization`: A technique used to reduce the size of machine learning models by converting weights and activations from higher precision (like float32) to lower precision (like int8 or int4), which helps in faster inference and reduced memory usage.

I tried to keep the tutorial as simple as possible, these terms will help you understand the concepts and don't worry if you don't understand them fully right now, Follow along the tutorial, it may become clearer as we progress.

## Dependencies Used
### Backend
- [hono](https://honojs.dev/): A lightweight and fast web framework
- [axios](https://axios-http.com/): A promise-based HTTP client for the browser and Node.js
- [transformers.js](https://xenova.github.io/transformers.js/): A JavaScript library for running transformer models in the browser and Node.js
- [@langchain/community](https://js.langchain.com/docs/getting-started/installation/): Community maintained LangChain integrations and tools, Langchain is a framework for developing applications powered by language models.
- [dotenv](https://www.npmjs.com/package/dotenv): A zero-dependency module that loads environment variables from a `.env` file into `process.env`
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
bun add dotenv @langchain/community @huggingface/transformers safe-text-to-json kokoro-js hono 
```

The folder structure for the backend will be based `features-based` architecture, which organizes code into distinct features or modules. Here's the proposed folder structure:
```bash
backend/
│ src/
│ ├─ config/ # Configuration files of environment variables or individual libraries
│ │  ├─ transformers.ts       
│ │  └─ env.ts          
│ ├─ features/ # Each feature has its own folder
│ │  └─ alert_system/
│ │  │  ├─ controller.ts  # Controller to handle incoming requests
│ │  │  ├─ service.ts     # Service to implement business logic
│ │  │  ├─ types.ts       # Types specific to this feature
│ │  │  └─ index.ts       # Entry point for the feature
│ │  └─ index.ts       # Entry point for all features
│ ├─ shared/ # Shared resources across features
│ │  ├─ types/ # Shared types
│ │  │  └─ index.ts      #  Entry point for shared types
│ │  └─ utils/
│ │     ├─ index.ts      # Entry point for shared utilities
│ │     └─ response.ts    # Utility for standardizing API responses
│ │     └─ describe_frame.ts    # Utility to describe image frames using the vision model
│ │     └─ classify_threat.ts  # Utility to classify threats from descriptions
│ │     └─ generate_alerting_text.ts  # Utility to generate alerting text using LLM
│ │     └─ convert_text_to_speech.ts  # Utility to convert text to speech using TTS model
│ └─ server.ts            # Main server file
└─ .env                 # Environment variables
```

### Creating a transformers configuration file
So transformers is a library that enables us to run transformer models in JavaScript, it is provided by Hugging Face, a popular platform for machine learning models. We will configure and export the vision model and processor now, as the first feature we are going to implement is image threat classification using the vision model. The transformers library provides easy access to pre-trained models and processors from Hugging Face, the hub for machine learning models, datasets, and more (I know I am repeating things here, just for ensuring we stay on the same page). So will create a `transformers.ts` file inside the `config` folder with the following code:
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
Next, we will create a utility function that will use the vision model to describe image. We are creating it to get the description of each frame from the camera feed, which will then be analyzed for potential threats. Create a file `describe_frame.ts` inside the `shared/utils` folder with the following code:
```typescript
import { vision_config } from "../../config/transformers";
import { RawImage } from "@huggingface/transformers";
import safeJsonParse from "safe-text-to-json";

export async function describeFrame(imageBase64: string) {
  const { model, processor } = vision_config;
  const userPrompt =
    "<image>Describe the content of the image in detail. Tell if any person in the image is threatening or not";
  const messages = [{ role: "user", content: userPrompt }];
  const prompt = processor.apply_chat_template(messages, {
    add_generation_prompt: true,
  });
  
  const imageBlob = await fetch(imageBase64)
    .then((res) => res.blob())
    .then((blob) => {
      return blob;
    });

  const image = await RawImage.fromBlob(imageBlob)
  const inputs = await processor(image, prompt, {
    add_special_tokens: false,
  });

  // Generate output
  const outputs = await model.generate({
    ...inputs,
    max_new_tokens: 512,
    do_sample: false,
  });

  const decoded = processor.batch_decode(
    outputs.slice(null, [inputs.input_ids.dims.at(-1), null]),
    { skip_special_tokens: true }
  );
  return safeJsonParse(decoded[0] as string);
}
```
This function `describeFrame` takes an image in base64 format as input and returns a detailed description of the image using the vision model. It constructs a prompt asking the model to describe the content of the image and determine if any person in the image is threatening. The function processes the image and prompt, generates a response using the model, and decodes the output to return the final description as a string. We can break down the function into eight main steps:
1. getting the model and processor from the `vision_config`.
```ts
    const { model, processor } = vision_config;
```
2. Constructing a prompt that instructs the model to describe the image in detail and identify any threatening individuals and output in JSON format.
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
    - is_threat: true only if a person appears to pose a physical threat.
    `;
    const userPrompt =
    "<image>Describe the content of the image in detail. Tell if any person in the image is threatening or not " + forceJsonPrompt;
    const messages = [{ role: "user", content: userPrompt }];
    const prompt = processor.apply_chat_template(messages, {
    add_generation_prompt: true,
    });
```
- `<image>` is a special token used to indicate where the image input should be placed in the prompt for the model to understand that it needs to analyze the image content.
- `messages` is an array that simulates a chat-like interaction, where the user provides the prompt, llms are often designed to handle conversational inputs and our prompt is structured in a way that mimics a user message in a chat. it contains a single user message with the prompt. Used to guide the model's response in a way that it identifies what user has asked for or what I have responded with so far. Consider it as a conversation history. In our case, we only have one message from the user, but we could add more messages if needed, even from the assistant (LLM) role.
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
    const outputs = await model.generate({
    ...inputs,
    max_new_tokens: 512,
    do_sample: false,
    });
```
- `generate` is a method used to produce output from the model based on the provided inputs.
- `max_new_tokens: 512`: This parameter sets the maximum number of new tokens that the model can generate in response to the input. In this case, it is limited to 512 tokens.
- `do_sample: false`: This parameter indicates that the model should not use sampling when generating output. Instead, it will use a deterministic approach (like greedy decoding) to produce the most likely next tokens.

7. Decoding the model's output tokens into human-readable text, skipping any special tokens.
```ts
    const decoded = processor.batch_decode(
    outputs.slice(null, [inputs.input_ids.dims.at(-1), null]),
    { skip_special_tokens: true }
    );
```
- `batch_decode` is a method provided by the processor to convert the model's output tokens back into human-readable text.
- `outputs.slice(null, [inputs.input_ids.dims.at(-1), null])`: This line slices the output tokens to only include the newly generated tokens, excluding the input tokens.
- `skip_special_tokens: true`: This option tells the decoder to ignore any special tokens (like padding or start/end tokens) when converting the tokens back to text, ensuring that the final output is clean and readable.

8. Returning the parsed JSON object containing the description and threat assessment.
```ts
    return safeJsonParse(decoded[0] as string);
```
- Finally, we return the first element of the `decoded` array, which contains the detailed description of the image generated by the model. But before returning, we parse it using `safeJsonParse` to convert the string into a JSON object, which allows us to easily access the description and threat assessment in a structured format.

### Ensuring Type Safety with FrameDescription Interface
To ensure type safety and clarity in our code, we will define a TypeScript interface for the frame description returned by the `describeFrame` function. This interface will specify the expected structure of the description object, which includes a textual description and a boolean indicating whether a threat is present. Create a file `frameDescription.ts` inside the `shared/types` folder with the following code:
```typescript
export default interface FrameDescription {
  description: string;
  isThreatening: boolean;
}
```
I believe now you have a good understanding of how to use the vision model to describe image frames.

Make sure to add this type in the `describeFrame` function return type for better type safety:
```ts
...
...
export async function describeFrame(imageBase64: string): Promise<FrameDescription> {
...
return safeJsonParse(decoded[0] as string) as FrameDescription
}
```

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
  return c.json({ frameDescription });
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
- `AnalyzeFrameResponse`: Although we can use the `FrameDescription` type directly, but to maintain consistency and clarity, we defined this interface to represent the structure of the response object returned after analyzing a frame. It contains a single property `frameDescription` of type `FrameDescription`, which holds the detailed description of the analyzed image frame, including whether a threat was detected.

Finally, we will create an `index.ts` file to serve as the entry point for the alert system feature:
```typescript
import alertSystemApp from "./controller";
export default alertSystemApp;
```
This file simply imports the `alertSystemApp` from the controller and exports it as the default export, making it easy to integrate the alert system feature into the main server application.
Generally, when programmers uses `index.ts` even though mainly re-exporting modules, it provides a centralized entry point for the feature or module, simplifies imports in other parts of the application, enhances organization and maintainability, and allows for easier scalability as the feature grows. We can also do this step for shared types and utils as well. So You can figure that out, you just have to create `index.ts` in the `shared/types` and `shared/utils` folders and re-export everything from there, utilizing barrel export pattern, So I will leave that up to you as an exercise for `feature-based` architecture understanding, Otherwise, you can just import the required modules directly without creating `index.ts` files.

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

I tested this api on Postman and it is working as expected.
![Test](/assets/test.png)

### Audio Alert Generation

We have successfully integrated the alert system feature into the main server application. but our alert system is like every other system, let's make it special by adding audio alert generation using a text-to-speech model, the best model I think for this task is `onnx-community/Kokoro-82M-ONNX`. So let's add kokoro configuration in `src/config/kokoro.ts`:
```typescript
import { KokoroTTS } from "kokoro-js";

const model_id = "onnx-community/Kokoro-82M-ONNX";
export const tts = await KokoroTTS.from_pretrained(model_id);
```

The code is self-explanatory, so I think we can move forward to creating a utility function to convert text to speech using the TTS model. Create a file `convert_text_to_speech.ts` inside the `shared/utils` folder with the following code:
```typescript
import { tts } from "../../config/kokoro";

export async function convertTextToSpeech(text: string){
  const audio = await tts.generate(text, {
    voice: "bm_george",
  });
  return audio;
}
```

This function `convertTextToSpeech` takes a text string as input and uses the Kokoro TTS model to generate spoken audio. It specifies the voice to be used for the speech synthesis and returns the generated audio object. We can break down the function into three main steps:

let's now update the `analyzeFrame` function in the `service.ts` file to include text-to-speech conversion and alert generation based on the frame description. Here's the updated implementation:
```typescript
import { describeFrame } from "../../shared/utils/describe_frame";
import { convertTextToSpeech } from "../../shared/utils/convertTextToSpeech";

export async function analyzeFrame(imageBase64: string) {
  const frameDescription = await describeFrame(imageBase64);
  
  let audio = null;
  if(frameDescription.isThreatening){
    const alertText = `Alert! A potential threat has been detected The frame image description is as follows: ${frameDescription.description}`;
    audio = (await convertTextToSpeech(alertText))?.audio
  }
  
  return { frameDescription, audio };
}
```

Ensure to update the `AnalyzeFrameResponse` interface in the `types.ts` file to include the alert audio:
```typescript
import type FrameDescription from "../../shared/types/frameDescription";
export interface AnalyzeFrameRequest {
  imageBase64: string;
}
export interface AnalyzeFrameResponse {
  frameDescription: FrameDescription;
  audio: Blob | null;
}
```

Okay, now the backend of our Security Surveillance Threat Detection and Alert System is complete with audio alert generation. We need to quickly wrap up the frontend. So let's move on to the frontend implementation.

## Frontend Implementation
Let's create a folder `frontend` and initialize a new Bun project inside it:
```bash
cd frontend
bun init
```

You will be prompted to select a template, choose `react` from the list.
And select `Tailwind CSS` when prompted.

Our main goal for the frontend is to capture camera feed every 15 seconds ( you can adjust this interval as per your requirement and device capabilities ) and send the captured frame to the backend for analysis. If a threat is detected, we will play the generated audio alert.

If you have initiated the the frontend project, bun creates some additional files for you, you can delete those, these files are:
- `src/APITester.tsx`
- `src/react.svg`

You also need to clean up the `src/index.css` file to remove unnecessary styles, you can replace the content of `src/index.css` with the following:
```css
@import "tailwindcss";
```

Next, Make sure to install the required dependencies:

```bash
bun add axios react-camera-pro
```

Organize the frontend folder structure as follows:
```bash
frontend/
│ src/
│ ├─ components/ # Reusable UI components
│ │  └─ CameraFeed.tsx  # Component to capture camera feed
│ ├─ services/ # Services for API calls
│ │  └─ alertSystemService.ts  # Service to interact with the alert system
│ ├─ utils/ # Utilities
│ │  └─ captureFrame.ts  # Utility to capture frame from camera
│ ├─ App.tsx          # Main application component
│ ├─ logo.svg       # Logo file
│ ├─ frontend.tsx     # Frontend server configuration
│ ├─ index.css        # Tailwind CSS styles
│ ├─ index.ts        # Tailwind CSS styles
│ └─ index.html      # HTML template
└─ ... # Other configuration files
```

### Creating the Capture Frame Utility
First, let's create a utility function to capture frames from the camera. Create `captureFrame.ts` in the `utils` folder:
```typescript
/**
 * Captures a frame from the camera and returns it as a base64 string.
 * @param takePhoto - Function from react-camera-pro to capture a photo
 * @returns Base64 encoded image string or null if capture fails
 */
export function captureFrame(
  takePhoto: () => string | ImageData | null
): string | null {
  const photo = takePhoto();
  // react-camera-pro can return string (base64) or ImageData
  if (typeof photo === "string") {
    return photo;
  }
  return null;
}
```
This utility wraps the `takePhoto` function from `react-camera-pro` and ensures we get a base64 string that can be sent to our backend.

### Creating the Alert System Service
Next, create the service to communicate with our backend API. Create `alertSystemService.ts` in the `services` folder:
```typescript
import axios from "axios";

const API_BASE_URL = "http://localhost:3000"; // Backend runs on port 3000

export interface FrameDescription {
  description: string;
  isThreatening: boolean;
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
```
This service:
- Defines TypeScript interfaces matching our backend response types
- Exports an `analyzeFrame` function that posts the captured frame to our backend
- Returns the frame description and optional audio data for threat alerts

### Creating the Camera Feed Component
Now let's create the main camera component with a fullscreen UI and activity logs. Create `CameraFeed.tsx` in the `components` folder:
```tsx
import { useRef, useState, useEffect, useCallback } from "react";
import { Camera, type CameraType } from "react-camera-pro";
import { captureFrame } from "../utils/captureFrame";
import {
  analyzeFrame,
  type FrameDescription,
} from "../services/alertSystemService";

const CAPTURE_INTERVAL_MS = 15000; // 15 seconds

interface LogEntry {
  id: number;
  timestamp: Date;
  message: string;
  type: "info" | "success" | "error" | "threat";
}

export function CameraFeed() {
  const cameraRef = useRef<CameraType | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<FrameDescription | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logIdRef = useRef(0);

  // Add log entry
  const addLog = useCallback((message: string, type: LogEntry["type"] = "info") => {
    setLogs((prev) => [
      { id: logIdRef.current++, timestamp: new Date(), message, type },
      ...prev.slice(0, 49), // Keep last 50 logs
    ]);
  }, []);

  // Play audio alert from audio data array
  const playAudioAlert = useCallback((audioData: number[]) => {
    try {
      const audioContext = new AudioContext();
      const audioBuffer = audioContext.createBuffer(1, audioData.length, audioContext.sampleRate);
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < audioData.length; i++) {
        channelData[i] = audioData[i] ?? 0;
      }
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();
      addLog("🔊 Playing audio alert", "threat");
    } catch (err) {
      addLog("Failed to play audio", "error");
    }
  }, [addLog]);

  // Capture and analyze frame
  const captureAndAnalyze = useCallback(async () => {
    if (!cameraRef.current || isAnalyzing || !isCameraReady) return;

    const takePhoto = () => cameraRef.current?.takePhoto() ?? null;
    const frame = captureFrame(takePhoto);

    if (!frame) {
      addLog("Failed to capture frame", "error");
      return;
    }

    setIsAnalyzing(true);
    addLog("📸 Capturing frame for analysis...", "info");

    try {
      const result = await analyzeFrame(frame);
      setLastAnalysis(result.frameDescription);

      if (result.frameDescription.isThreatening) {
        addLog(`⚠️ THREAT: ${result.frameDescription.description}`, "threat");
        if (result.audio) playAudioAlert(result.audio);
      } else {
        addLog(`✅ Safe: ${result.frameDescription.description.slice(0, 100)}...`, "success");
      }
    } catch (err) {
      addLog(`❌ Error: ${err instanceof Error ? err.message : "Analysis failed"}`, "error");
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing, isCameraReady, playAudioAlert, addLog]);

  // Auto-capture interval when camera is ready
  useEffect(() => {
    if (!isCameraReady) return;
    addLog("🎥 Camera ready - Starting automatic monitoring", "success");
    
    const startDelay = setTimeout(() => captureAndAnalyze(), 2000);
    const intervalId = setInterval(captureAndAnalyze, CAPTURE_INTERVAL_MS);
    
    return () => { clearTimeout(startDelay); clearInterval(intervalId); };
  }, [isCameraReady, captureAndAnalyze]);

  const formatTime = (date: Date) => date.toLocaleTimeString("en-US", {
    hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit",
  });

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Fullscreen Camera View */}
      <div className="flex-1 relative">
        <Camera ref={cameraRef} aspectRatio="cover" errorMessages={{
          noCameraAccessible: "No camera accessible. Please connect a camera.",
          permissionDenied: "Camera permission denied. Please allow camera access.",
          switchCamera: "Cannot switch camera", canvas: "Canvas error",
        }} />

        {/* Camera Ready Detection */}
        <div className="absolute top-0 left-0 opacity-0 pointer-events-none">
          <video autoPlay playsInline muted ref={(video) => {
            if (video && !isCameraReady) {
              navigator.mediaDevices.getUserMedia({ video: true })
                .then(() => setIsCameraReady(true))
                .catch(() => addLog("Camera permission denied", "error"));
            }
          }} />
        </div>

        {/* Status Overlays */}
        {isAnalyzing && (
          <div className="absolute top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-full flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Analyzing...
          </div>
        )}
        {lastAnalysis?.isThreatening && (
          <div className="absolute top-4 left-4 bg-red-600 text-white px-4 py-2 rounded-full font-bold animate-pulse">
            ⚠️ THREAT DETECTED
          </div>
        )}
        {!isCameraReady && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-xl">Waiting for camera permission...</p>
            </div>
          </div>
        )}
      </div>

      {/* Logs Panel */}
      <div className="h-48 bg-gray-900 border-t border-gray-700 overflow-hidden">
        <div className="px-4 py-2 bg-gray-800 border-b border-gray-700 flex justify-between">
          <span className="text-gray-300 text-sm font-semibold">
            📋 Activity Log {isCameraReady && <span className="text-green-400 ml-2">● Live</span>}
          </span>
          <span className="text-gray-500 text-xs">Auto-capture every {CAPTURE_INTERVAL_MS / 1000}s</span>
        </div>
        <div className="h-36 overflow-y-auto p-2 space-y-1 font-mono text-xs">
          {logs.map((log) => (
            <div key={log.id} className={`px-2 py-1 rounded ${
              log.type === "threat" ? "bg-red-900/50 text-red-300" :
              log.type === "error" ? "bg-red-900/30 text-red-400" :
              log.type === "success" ? "bg-green-900/30 text-green-400" : "bg-gray-800/50 text-gray-400"
            }`}>
              <span className="text-gray-500">[{formatTime(log.timestamp)}]</span> {log.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CameraFeed;
```
This component features:
- **Fullscreen camera view** that covers the entire viewport
- **Automatic monitoring** that starts once camera permission is granted
- **Activity log panel** at the bottom showing all captures, results, and errors
- **Audio alerts** played via Web Audio API when threats are detected
- **Visual indicators** for analyzing state and threat detection

### Updating the Main App Component
The `App.tsx` is now minimal since CameraFeed handles everything:
```tsx
import "./index.css";
import CameraFeed from "./components/CameraFeed";

export function App() {
  return <CameraFeed />;
}

export default App;
```

### Frontend Server Configuration
The `index.ts` file configures Bun to serve our React app on port 3001 (to avoid conflict with the backend on port 3000):
```typescript
import { serve } from "bun";
import index from "./index.html";

const server = serve({
  routes: {
    "/*": index,
  },
  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
  port: 3001,
});

console.log(`🚀 Server running at ${server.url}`);
```

### Running the Application
To run the complete application:

1. **Start the backend** (in the `backend` folder):
```bash
cd backend
bun run src/server.ts
```
The backend will start on `http://localhost:3000`.

2. **Start the frontend** (in the `frontend` folder):
```bash
cd frontend
bun run src/index.ts
```
The frontend will start on `http://localhost:3001`.

3. **Open the application** in your browser at `http://localhost:3001`.

4. **Grant camera permissions** when prompted by the browser.

5. **Monitoring starts automatically** once camera access is granted. The system will capture and analyze frames every 15 seconds.

The activity log at the bottom shows all captures, analysis results, and any errors. When a threat is detected, you'll see a red warning indicator on the camera feed and hear an audio alert.

## Conclusion
Congratulations! You've built a complete Security Camera Threat Detection and Alert System using:
- **Apple's FastVLM-0.5B** for fast and accurate image analysis
- **Kokoro TTS** for generating audio alerts
- **Bun** as the runtime for both frontend and backend
- **React** with Tailwind CSS for the user interface
- **Hono** as the lightweight backend framework

This system demonstrates how modern AI models can be integrated into practical applications for real-time threat detection and alerting.

