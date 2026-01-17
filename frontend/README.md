# S3 - Security Surveillance Frontend

The frontend application for the Security Camera Threat Detection and Alert System built with **React**, **TypeScript**, and **Tailwind CSS**. Can run as both a web application and a native desktop app via **Tauri**.

## Features

- 🎥 Real-time camera feed monitoring
- 🔍 AI-powered threat detection visualization
- 🔊 Audio alerts when threats are detected
- 💻 Runs in browser or as native desktop app

## Prerequisites

- [Bun](https://bun.sh/) runtime installed
- Backend server running on `http://localhost:3000`
- For desktop app: [Rust](https://www.rust-lang.org/tools/install) toolchain installed

## Installation

```bash
bun install
```

## Running as Web Application

```bash
bun run dev
```

The app will be available at `http://localhost:3001`

## Running as Desktop Application (Tauri)

### First-time Setup

If you haven't initialized Tauri yet:

```bash
# Install Tauri CLI
bun install --save-dev @tauri-apps/cli

# Initialize Tauri in this project
npx tauri init
```

When prompted:
- **App name**: `s3` (or your preference)
- **Window title**: `S3 - Security Surveillance System`
- **Web assets location**: `../build`
- **Dev server URL**: `http://localhost:3001`
- **Frontend dev command**: `bun run dev`
- **Frontend build command**: `bun run build`

### Running in Development

```bash
bun run tauri dev
```

> **Note**: First run compiles Rust dependencies and takes 2-5 minutes.

### Building for Production

```bash
bun run tauri build
```

Creates installers in `src-tauri/target/release/bundle/`:
- **macOS**: `.dmg` and `.app`
- **Windows**: `.msi` and `.exe`
- **Linux**: `.deb`, `.rpm`, and `.AppImage`

## Project Structure

```
frontend/
├── src/
│   ├── App.tsx              # Main app component
│   ├── index.ts             # Bun server entry
│   ├── index.html           # HTML template
│   ├── index.css            # Tailwind styles
│   ├── components/
│   │   └── CameraFeed.tsx   # Camera and threat detection UI
│   └── services/
│       └── alert.ts         # Backend API client
├── src-tauri/               # Tauri desktop app (after init)
│   ├── src/                 # Rust source
│   ├── tauri.conf.json      # Tauri config
│   └── Cargo.toml           # Rust dependencies
├── build.ts                 # Production build script
└── package.json
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start web dev server |
| `bun run build` | Build for production |
| `bun run tauri dev` | Start desktop app (dev mode) |
| `bun run tauri build` | Build desktop installer |

## Configuration

### Frame Capture Interval

Adjust in `src/components/CameraFeed.tsx`:

```typescript
const intervalId = setInterval(handleCapture, 5000); // 5 seconds
```

### Backend URL

Modify in `src/services/alert.ts`:

```typescript
const API_URL = "http://localhost:3000";
```

## Troubleshooting

### Camera not working
- Grant camera permissions when prompted
- Ensure no other app is using the camera

### Desktop app: Camera issues
- Verify `"csp": null` in `src-tauri/tauri.conf.json`
- On macOS, check System Preferences > Privacy > Camera

### Connection errors
- Ensure backend is running on `http://localhost:3000`
