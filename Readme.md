# S3 - Security Surveillance System

<p align="center">
  <b>🔐 AI-Powered Real-Time Threat Detection & Alert System</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white" alt="Bun">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/Tauri-24C8D8?style=for-the-badge&logo=tauri&logoColor=white" alt="Tauri">
  <img src="https://img.shields.io/badge/Hono-E36002?style=for-the-badge&logo=hono&logoColor=white" alt="Hono">
  <img src="https://img.shields.io/badge/Hugging%20Face-FFD21E?style=for-the-badge&logo=huggingface&logoColor=black" alt="Hugging Face">
</p>

---

## 🎯 Overview

**S3 (Security Surveillance System)** is a cutting-edge, AI-powered security camera threat detection and alert system. It leverages Apple's blazing-fast **FastVLM-0.5B** vision language model to analyze live camera feeds in real-time, detecting potential threats such as weapons, and generating voice alerts using the **Kokoro TTS** text-to-speech model.

### ✨ Key Features

- 🎥 **Real-Time Camera Monitoring** - Continuous surveillance with automatic frame capture every 5 seconds
- 🧠 **AI-Powered Threat Detection** - Uses Apple's FastVLM-0.5B for accurate threat identification
- 🔊 **Voice Alert System** - Generates spoken alerts using Kokoro-82M TTS when threats are detected
- ⚡ **Blazing Fast Performance** - Optimized with quantized models (q4/fp16) for minimal latency
- 🌐 **Modern Web Interface** - Clean React-based UI with live camera feed

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
│  ┌─────────────────┐    ┌─────────────────┐   ┌───────────────┐ │
│  │   Camera Feed   │───▶│  Frame Capture  │──▶│ Alert Display │ │
│  │ (react-camera)  │    │   (5s interval) │   │ + Audio Play  │ │
│  └─────────────────┘    └────────┬────────┘   └───────────────┘ │
└──────────────────────────────────┼──────────────────────────────┘
                                   │ Base64 Image
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND (Hono)                           │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                     Alert System API                         ││
│  │  ┌─────────────┐    ┌─────────────────┐   ┌───────────────┐ ││
│  │  │  Controller │───▶│     Service     │──▶│   Response    │ ││
│  │  └─────────────┘    └────────┬────────┘   └───────────────┘ ││
│  └──────────────────────────────┼──────────────────────────────┘│
│                                 │                                │
│  ┌──────────────────────────────┼──────────────────────────────┐│
│  │                         AI Models                            ││
│  │  ┌─────────────────────┐    │    ┌─────────────────────┐    ││
│  │  │   FastVLM-0.5B      │◀───┴───▶│   Kokoro-82M TTS    │    ││
│  │  │  (Vision Analysis)  │         │  (Voice Generation) │    ││
│  │  └─────────────────────┘         └─────────────────────┘    ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
S3/
├── backend/
│   ├── src/
│   │   ├── server.ts                    # Main Hono server
│   │   ├── config/
│   │   │   ├── transformers.ts          # FastVLM vision model config
│   │   │   └── kokoro.ts                # Kokoro TTS model config
│   │   ├── features/
│   │   │   └── alert_system/
│   │   │       ├── controller.ts        # API endpoint handler
│   │   │       ├── service.ts           # Business logic
│   │   │       ├── types.ts             # Feature-specific types
│   │   │       └── index.ts             # Feature exports
│   │   └── shared/
│   │       ├── types/
│   │       │   └── frameDescription.ts  # Frame analysis type
│   │       └── utils/
│   │           ├── describe_frame.ts    # Vision model utility
│   │           └── convertTextToSpeech.ts # TTS utility
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                      # Main app component
│   │   ├── components/
│   │   │   └── CameraFeed.tsx           # Camera & threat display
│   │   ├── services/
│   │   │   └── alert.ts                 # Backend API client
│   │   ├── index.html
│   │   └── index.css                    # Tailwind styles
│   ├── src-tauri/                       # Tauri desktop app (optional)
│   │   ├── src/                         # Rust source files
│   │   ├── tauri.conf.json              # Tauri configuration
│   │   └── Cargo.toml                   # Rust dependencies
│   ├── build.ts
│   └── package.json
│
├── assets/                              # Static assets
├── tutorial.md                          # Development tutorial
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh/) runtime installed
- Webcam or camera device connected
- macOS, Linux, or Windows (with WSL)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Sharjeelbaig/AI-Based-Threat-Alert-Surveilance-System
   cd AI-Based-Threat-Alert-Surveilance-System
   ```

2. **Install Backend Dependencies**
   ```bash
   cd backend
   bun install
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd ../frontend
   bun install
   ```

### Running the Application

1. **Start the Backend Server** (Terminal 1)
   ```bash
   cd backend
   bun run src/server.ts
   ```
   The server will start on `http://localhost:3000`

2. **Start the Frontend** (Terminal 2)
   ```bash
   cd frontend
   bun run dev
   ```
   The app will be available at `http://localhost:3001` (or similar)

3. **Allow Camera Access** when prompted in your browser

### 🖥️ Running as Desktop App (Optional)

Want a native desktop experience? The frontend can be wrapped with Tauri:

```bash
cd frontend

# Install Tauri CLI (first time only)
bun install --save-dev @tauri-apps/cli

# Initialize Tauri (first time only)
npx tauri init

# Run desktop app
bun run tauri dev
```

> **Note**: First run compiles Rust and takes 2-5 minutes. See [frontend/README.md](frontend/README.md) for detailed setup.

---

## 🧠 AI Models

### FastVLM-0.5B (Vision Analysis)

| Property | Value |
|----------|-------|
| **Model** | `onnx-community/FastVLM-0.5B-ONNX` |
| **Provider** | Apple (via Hugging Face) |
| **Purpose** | Image-to-text |

The vision model analyzes each frame and outputs:
```typescript
{
  description: string;  // Factual description of the scene
  is_threat: boolean;   // True if weapon/threat detected
}
```

### Kokoro-82M (Text-to-Speech)

| Property | Value |
|----------|-------|
| **Model** | `onnx-community/Kokoro-82M-ONNX` |
| **Purpose** | Voice alert generation |
| **Voice(in our case)** | `bm_george` |

---

## 🔌 API Reference

### POST `/alert-system`

Analyzes an image frame for potential threats.

**Request Body:**
```json
{
  "imageBase64": "data:image/jpeg;base64,/9j/4AAQSkZ..."
}
```

**Response:**
```json
{
  "frameDescription": {
    "description": "A person standing in a room...",
    "is_threat": true
  },
  "audio": [0.123, -0.456, ...]  // Float32Array (PCM) or null
}
```

---

## ⚙️ Configuration

### Threat Detection Criteria

The system considers the following as threats:
- Any person holding a weapon (gun, knife, etc.)
- Any person making threatening gestures with visible weapons
- Any person holding a weapon even if the pose is non-threatening

### Frame Capture Interval

Default: **5 seconds** (configurable in `CameraFeed.tsx`)

```typescript
const intervalId = setInterval(handleCapture, 5000); // Adjust as needed
```

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| **Bun** | JavaScript runtime |
| **Hono** | Lightweight web framework |
| **@huggingface/transformers** | Vision model inference |
| **kokoro-js** | Text-to-speech synthesis |
| **safe-text-to-json** | Safe JSON parsing |

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 19** | UI framework |
| **Tailwind CSS 4** | Styling |
| **react-camera-pro** | Camera access |
| **play-pcm** | Audio playback |
| **Axios** | HTTP client |
| **Tauri** | Desktop app wrapper (optional) |

---

## 📊 Performance

The system is optimized for real-time performance:

- **Vision Model**: Quantized to q4/fp16 for fast inference
- **TTS Model**: fp16 precision with CPU inference
- **Frame Processing**: Async non-blocking architecture
- **Audio Playback**: Efficient PCM streaming

---

## 🔒 Security Considerations

- All processing happens locally (no cloud dependency)
- Camera feed never leaves the local network
- Models run entirely on-device
- No data persistence or logging of captured frames

---

## 📝 Tutorial

For a detailed step-by-step guide on how this project was built, see [tutorial.md](tutorial.md).

---


<p align="center">
  Built with ❤️ by Muhammad Sharjeel Baig
</p>
