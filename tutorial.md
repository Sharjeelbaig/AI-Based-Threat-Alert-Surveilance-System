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



