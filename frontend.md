# Frontend part
First of all, It is worth to mention, I will not focus on frontend much to keep the tutorial simple and the main logic resides in the backend, so it gives bit flexibility for you to customize as you wish. so let's get started, first we need to create a folder for the frontend part of the application. Inside that folder we will run `bun init` and select React and typescript as our options. This will create a basic React application for us.

We should get rid of all the boilerplate files first so delete these files:
- `src/APITester.tsx`
- `src/react.svg`
and also clean up the `src/index.css` file to remove unnecessary styles, you can replace the content of `src/index.css` with the following:
```css
@import "tailwindcss";
```

Next, Make sure to install the required dependencies:

```bash
bun add axios react-camera-pro
```
we should make sure our frontend runs on a different port, let's say port 3001. To do that, open index. and make sure it looks like this:

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
The code above configures the Bun development server to listen on port 3001 instead of the default port, and also I cleaned up some routes that the boilerplate code had, so now we only have `/*` route and no any hello world route.

We should structure our `src` folder a bit better, so let's create the following folders inside `src`:
- `components`
- `services`

Now we can create our CameraFeed component inside the components folder. Create a new file called `CameraFeed.tsx` inside the `components` folder and add the following code:

```tsx
import React, { useRef } from "react";
import { Camera, type CameraType } from "react-camera-pro";

export function CameraFeed() {
  const [audioPCMData, setAudioPCMData] = React.useState<Int16Array | null>(null);
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
This component sets up the camera feed using the `react-camera-pro` library. We also set up a state variable to hold the audio PCM data that we will capture after implementing service.
Next, we will implement the `alert` service to send api requests to the backend. Create a new file called `alert.ts` inside the `services` folder and add the following code:

```tsx
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
Now that we have created the service, we have to implement the `handleCapture` function inside the `CameraFeed` component to capture the image from the camera and send it to the backend using the `sendAlert` service. We will run the capture function every 5 seconds to continuously monitor the camera feed and to reduce the load on the backend as well because sending too many requests in a short period of time which includes inferencing language models can be expensive and slow down the system or may be dangerous in some cases. So we will use `setInterval` to run the capture function every 5 seconds. Update the `CameraFeed.tsx` file as follows:

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
import {CameraFeed} from './components/CameraFeed'
import "./index.css";

export function App() {
  return (
    <CameraFeed />
  );
}

export default App;
```


