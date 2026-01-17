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
