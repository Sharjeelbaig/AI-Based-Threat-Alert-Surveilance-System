# Security Camera Threat Detection and Alert System

A real-time security system using Apple's FastVLM-0.5B for threat detection and Kokoro TTS for audio alerts.

## Prerequisites
- TypeScript and Bun basics
- [Bun installed](https://bun.sh/docs/installation)

## Key Terms
| Term | Definition |
|------|------------|
| `ONNX` | Model format for transformers.js |
| `Processor` | Handles input preprocessing and output postprocessing |
| `base64` | Binary-to-text encoding for transmitting images |
| `quantization` | Reducing model precision (fp32→int4) for faster inference |

## Dependencies
**Backend:** hono, transformers.js, kokoro-js, safe-text-to-json  
**Frontend:** React, Tailwind CSS, axios, react-camera-pro

## Backend Setup

```bash
cd backend && bun init
bun add @huggingface/transformers safe-text-to-json kokoro-js hono 
```

### Folder Structure
```
backend/src/
├── config/           # Library configurations
├── features/         # Feature modules
│   └── alert_system/
├── shared/           # Shared utilities and types
└── server.ts
```

### Vision Model Config (`src/config/transformers.ts`)
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

The `dtype` options use quantization (`q4`) for the vision encoder and decoder to reduce model size and speed up inference, while keeping token embeddings at `fp16` for accuracy.

### Frame Description Utility (`src/shared/utils/describe_frame.ts`)
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

**Key steps:**
1. Build a prompt with JSON schema and threat criteria
2. Convert base64 image to `RawImage` format
3. Process inputs through the processor (handles tokenization and image preprocessing)
4. Generate output with `max_new_tokens: 2048`
5. Decode and parse the JSON response

### Frame Description Type (`src/shared/types/frameDescription.ts`)
```typescript
export default interface FrameDescription {
  description: string;
  is_threat: boolean;
}
```

### Alert System Feature

Create `src/features/alert_system/` with these files:

**`service.ts`**
```typescript
import { describeFrame } from "../../shared/utils/describe_frame";

export async function analyzeFrame(imageBase64: string) {
  const frameDescription = await describeFrame(imageBase64);
  return frameDescription;
}
```

**`controller.ts`**
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

**`types.ts`**
```typescript
import type FrameDescription from "../../shared/types/frameDescription";
export interface AnalyzeFrameRequest {
  imageBase64: string;
}
export interface AnalyzeFrameResponse {
  frameDescription: FrameDescription;
}
```

**`index.ts`**
```typescript
import alertSystemApp from "./controller";
export default alertSystemApp;
```

### Main Server (`src/server.ts`)
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

![Test](/assets/test.png)

### Audio Alert Generation

Add TTS capability with Kokoro.

**`src/config/kokoro.ts`**
```typescript
import { KokoroTTS } from "kokoro-js";

const model_id = "onnx-community/Kokoro-82M-ONNX";
export const tts = await KokoroTTS.from_pretrained(model_id, {
  device: "cpu",
  dtype: "fp16",
});
```

**`src/shared/utils/convertTextToSpeech.ts`**
```typescript
import { tts } from "../../config/kokoro";

export async function convertTextToSpeech(text: string): Promise<Float32Array> {
  const { audio } = await tts.generate(text, {
    voice: "bm_george",
  });
  return audio;
}
```

**Update `service.ts` with audio generation:**
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

**Update `controller.ts`:**
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

**Update `types.ts`:**
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

## Frontend Setup

Initialize with React and TypeScript, then install dependencies:
```css
@import "tailwindcss";
```

```bash
bun add axios react-camera-pro play-pcm
```

**`src/index.ts`** - Configure port 3001:

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

**`src/services/alert.ts`**

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

**`src/components/CameraFeed.tsx`**

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

The component captures frames every 5 seconds, sends them for analysis, and plays audio alerts when threats are detected.

**`src/App.tsx`**

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

**Backend:**
```bash
cd backend && bun run src/server.ts
```

**Frontend:**
```bash
cd frontend && bun run dev
```

Open `http://localhost:3001`, allow camera access, and the system will analyze frames every 5 seconds.

## Desktop App with Tauri

Wrap the React frontend in a native desktop app using Tauri.

### Setup

```bash
cd frontend
bun install --save-dev @tauri-apps/cli
npx tauri init
```

During init, provide:
- **App name:** `intruder-alert`
- **Window title:** `Security Surveillance System`
- **Web assets:** `../build`
- **Dev server URL:** `http://localhost:3001`
- **Dev command:** `bun run dev`
- **Build command:** `bun run build`

### Configuration (`src-tauri/tauri.conf.json`)

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

> **Note:** Set `frontendDist` to `../dist` if using Bun's default output. `csp: null` allows camera access and API calls.

### Install Rust (if needed)

```bash
# If you don't have Rust installed, install it first:
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### Run the Desktop App

```bash
bun run tauri dev
```

First run compiles Rust dependencies (2-5 min). Subsequent runs are fast.

### Enhanced Window Config

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

### Build for Production

```bash
bun run tauri build
```

Outputs in `src-tauri/target/release/bundle/`:
| Platform | Output |
|----------|--------|
| macOS | `.dmg`, `.app` |
| Windows | `.msi`, `.exe` |
| Linux | `.deb`, `.rpm`, `.AppImage` |

### Package.json Scripts

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

### Troubleshooting

- **Camera not working:** Ensure `csp: null` is set; grant OS permissions
- **Build fails:** Run `rustup update` and `cargo clean`
- **Blank window:** Verify dev server URL matches `devUrl`

## Conclusion

You've built a complete threat detection system using:
- **FastVLM-0.5B** for image analysis
- **Kokoro TTS** for audio alerts  
- **Bun** runtime with **Hono** backend
- **React** + **Tauri** for web/desktop frontend

### Key Takeaways
- Local AI inference with transformers.js provides privacy and low latency
- Feature-based architecture improves maintainability
- 5-second capture intervals balance responsiveness with system load

### Extension Ideas
- Multiple camera support
- Alert history logging
- Email/SMS notifications
- Custom threat detection rules

Happy coding! 🚀