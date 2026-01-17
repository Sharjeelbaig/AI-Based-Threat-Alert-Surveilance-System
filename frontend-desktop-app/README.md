# Intruder Alert - Desktop Application

A native desktop application for the Security Camera Threat Detection and Alert System built with **Tauri**, **React**, and **TypeScript**.

## Features

- 🎥 Real-time camera feed monitoring
- 🔍 AI-powered threat detection using Apple's FastVLM-0.5B
- 🔊 Audio alerts when threats are detected
- 💻 Native desktop performance with minimal resource usage
- 🔒 Secure local processing

## Prerequisites

- [Bun](https://bun.sh/) runtime installed
- [Rust](https://www.rust-lang.org/tools/install) toolchain installed
- Backend server running on `http://localhost:3000`

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Installation

```bash
# Install dependencies
bun install
```

## Development

Make sure the backend is running first, then:

```bash
# Start the development server with hot reload
bun run tauri dev
```

> **Note**: The first run will compile the Rust backend which may take a few minutes.

## Building for Production

```bash
# Create production build
bun run tauri build
```

This creates platform-specific installers in `src-tauri/target/release/bundle/`:
- **macOS**: `.dmg` and `.app`
- **Windows**: `.msi` and `.exe`
- **Linux**: `.deb`, `.rpm`, and `.AppImage`

## Project Structure

```
frontend-desktop-app/
├── src/                    # React frontend source
│   ├── components/         # React components
│   │   └── CameraFeed.tsx  # Camera and threat detection UI
│   ├── services/           # API services
│   │   └── alert.ts        # Backend communication
│   ├── App.tsx             # Main application component
│   ├── App.css             # Application styles
│   └── main.tsx            # React entry point
├── src-tauri/              # Tauri/Rust backend
│   ├── src/                # Rust source files
│   ├── tauri.conf.json     # Tauri configuration
│   └── Cargo.toml          # Rust dependencies
└── package.json            # Node.js dependencies
```

## Configuration

Camera analysis interval can be adjusted in `src/components/CameraFeed.tsx`:

```typescript
const intervalId = setInterval(handleCapture, 5000); // Change 5000 to desired ms
```

## Troubleshooting

### Camera not working
- Ensure camera permissions are granted in System Preferences
- Check that no other application is using the camera

### Backend connection failed
- Verify the backend is running on `http://localhost:3000`
- Check CORS settings in the backend

### Audio not playing
- Ensure system audio is not muted
- Check browser/webview audio permissions
