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
      const audioBuffer = audioContext.createBuffer(
        1,
        audioData.length,
        audioContext.sampleRate
      );
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
        if (result.audio) {
          playAudioAlert(result.audio);
        }
      } else {
        addLog(`✅ Safe: ${result.frameDescription.description.slice(0, 100)}...`, "success");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Analysis failed";
      addLog(`❌ Error: ${errorMsg}`, "error");
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing, isCameraReady, playAudioAlert, addLog]);

  // Auto-capture interval when camera is ready
  useEffect(() => {
    if (!isCameraReady) return;

    addLog("🎥 Camera ready - Starting automatic monitoring", "success");
    
    // Wait 2 seconds before first capture to ensure camera is stable
    const startDelay = setTimeout(() => {
      captureAndAnalyze();
    }, 2000);

    const intervalId = setInterval(captureAndAnalyze, CAPTURE_INTERVAL_MS);
    
    return () => {
      clearTimeout(startDelay);
      clearInterval(intervalId);
    };
  }, [isCameraReady, captureAndAnalyze]);

  // Format timestamp for logs
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Fullscreen Camera View */}
      <div className="flex-1 relative">
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

        {/* Camera Ready Detection - hidden video check */}
        <div className="absolute top-0 left-0 opacity-0 pointer-events-none">
          <video
            autoPlay
            playsInline
            muted
            ref={(video) => {
              if (video && !isCameraReady) {
                navigator.mediaDevices
                  .getUserMedia({ video: true })
                  .then(() => {
                    setIsCameraReady(true);
                  })
                  .catch(() => {
                    addLog("Camera permission denied", "error");
                  });
              }
            }}
          />
        </div>

        {/* Status Overlay */}
        {isAnalyzing && (
          <div className="absolute top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Analyzing...
          </div>
        )}

        {/* Threat Indicator */}
        {lastAnalysis?.isThreatening && (
          <div className="absolute top-4 left-4 bg-red-600 text-white px-4 py-2 rounded-full font-bold animate-pulse shadow-lg">
            ⚠️ THREAT DETECTED
          </div>
        )}

        {/* Waiting for camera */}
        {!isCameraReady && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-xl">Waiting for camera permission...</p>
              <p className="text-gray-400 text-sm mt-2">Please allow camera access when prompted</p>
            </div>
          </div>
        )}
      </div>

      {/* Logs Panel */}
      <div className="h-48 bg-gray-900 border-t border-gray-700 overflow-hidden">
        <div className="px-4 py-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
          <span className="text-gray-300 text-sm font-semibold">
            📋 Activity Log {isCameraReady && <span className="text-green-400 ml-2">● Live</span>}
          </span>
          <span className="text-gray-500 text-xs">
            Auto-capture every {CAPTURE_INTERVAL_MS / 1000}s
          </span>
        </div>
        <div className="h-36 overflow-y-auto p-2 space-y-1 font-mono text-xs">
          {logs.length === 0 ? (
            <div className="text-gray-500 text-center py-4">
              Waiting for camera to initialize...
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className={`px-2 py-1 rounded ${
                  log.type === "threat"
                    ? "bg-red-900/50 text-red-300"
                    : log.type === "error"
                    ? "bg-red-900/30 text-red-400"
                    : log.type === "success"
                    ? "bg-green-900/30 text-green-400"
                    : "bg-gray-800/50 text-gray-400"
                }`}
              >
                <span className="text-gray-500">[{formatTime(log.timestamp)}]</span>{" "}
                {log.message}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default CameraFeed;
