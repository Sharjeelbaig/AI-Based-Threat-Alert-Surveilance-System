import React, { useEffect, useRef } from "react";
import { Camera, type CameraType } from "react-camera-pro";
import { sendAlert } from "../services/alert";

export function CameraFeed() {
  const [loading, setLoading] = React.useState(false);
  const [audioPCMData, setAudioPCMData] = React.useState<Float32Array | null>(
    null,
  );
  const [threatDescription, setThreatDescription] = React.useState<string>("");
  const cameraRef = useRef<CameraType>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const playAudioFromPCM = (pcmData: Float32Array) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    const audioContext = audioContextRef.current;
    const sampleRate = 24000;
    const audioBuffer = audioContext.createBuffer(1, pcmData.length, sampleRate);
    audioBuffer.getChannelData(0).set(pcmData);
    
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.playbackRate.value = 1.6;
    source.connect(audioContext.destination);
    source.start();
  };

  const handleCapture = async () => {
    if (cameraRef.current && !loading) {
      setLoading(true);
      try {
        const photo = cameraRef.current.takePhoto();
        const response = await sendAlert(photo as string);
        if (response) {
          if (response.frameDescription?.is_threat) {
            setThreatDescription(
              `⚠️ THREAT DETECTED: ${response.frameDescription.description}`,
            );
          } else {
            setThreatDescription("");
          }
          if (response.audio) {
            const audioData = new Float32Array(Object.values(response.audio));
            setAudioPCMData(audioData);
          }
          console.log("Alert response:", response);
        }
      } catch (error) {
        console.error("Error capturing frame:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (loading) return;
    const intervalId = setInterval(handleCapture, 5000);
    return () => clearInterval(intervalId);
  }, [loading]);

  useEffect(() => {
    if (audioPCMData) {
      playAudioFromPCM(audioPCMData);
    }
  }, [audioPCMData]);

  return (
    <div className="camera-container">
      {loading && (
        <div className="status-overlay analyzing">
          <p>🔍 Analyzing frame...</p>
        </div>
      )}
      {threatDescription && (
        <div className="status-overlay threat">
          <p>{threatDescription}</p>
        </div>
      )}
      <div className="camera-wrapper">
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
