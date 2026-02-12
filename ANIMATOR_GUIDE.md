# Mascot Animator User Guide

## Overview
The Mascot Animator is a browser-based tool that converts static images or video files into animated formats. It uses FFmpeg.wasm for client-side encoding, requiring no server-side processing.

## Getting Started

### Prerequisites
- Python 3 (for local server with security headers)
- Modern browser (Chrome/Firefox/Edge recommended)

### Launch
```bash
python server.py
# Navigate to http://localhost:8080/mascot-animator/
```

> server.py is required because FFmpeg.wasm needs SharedArrayBuffer, which requires COOP/COEP headers.

## Loading Sources

### From File
Click "Choose File" to upload PNG, JPG images or MP4, WebM video files.

### From URL
Enter a direct image/video URL and click "Load". CORS restrictions may apply for cross-origin resources.

## Animation Types

| Animation | Effect | Best For |
|-----------|--------|----------|
| Breathing (Idle) | Vertical scale oscillation | Idle state, breathing effect |
| Floating (Ghost) | Vertical translation up/down | Hovering, ghost-like movement |
| Jumping (Happy) | Vertical bounce with squash on landing | Excited, happy state |
| Shaking (Damage) | Rotation oscillation | Hit reaction, damage feedback |
| Squash & Stretch (Jelly) | Horizontal/vertical inverse scaling | Jelly-like, cartoon bounce |
| Spin (3D-ish) | Horizontal scale flip (cosine) | Coin flip, 3D rotation illusion |

## Controls
- **Speed** (0.1x - 3.0x): Animation playback speed
- **Intensity** (0% - 200%): Amplitude of the animation effect

## Export Formats

### Animated WebP (Transparent)
- Best compression with transparency support
- Known issue: FFmpeg.wasm may produce ghosting artifacts on transparent areas
- Uses libwebp codec

### WebM High Quality (FFmpeg)
- VP9 codec with yuva420p pixel format for true alpha channel
- Best quality for transparent video
- Constant quality mode (CRF 30)

### CSS Sprite Sheet (Ghosting-Free)
- **Recommended for web use** -- zero artifacts
- Generates a single horizontal PNG strip
- Provides ready-to-use CSS `steps()` animation code
- Live preview with actual CSS animation
- No FFmpeg artifacts -- pure canvas rendering

### GIF (Transparent)
- Two-pass encoding: palette generation then paletteuse
- `reserve_transparent=1` for alpha support
- `alpha_threshold=128` for clean transparency edges

### WebM Fast (MediaRecorder)
- Native browser recording using `canvas.captureStream(60)`
- Fastest export but lower quality
- Tries VP9, then VP8, then WebM codec fallback

## Technical Details

### Frame Capture Process (WebP/GIF/WebM HQ)
1. Reset animation time to 0
2. Render each frame at 30fps for 3 seconds (90 frames)
3. Capture each frame as PNG blob from canvas
4. Write frames to FFmpeg virtual filesystem
5. Encode using format-specific FFmpeg commands
6. Generate download link

### Sprite Sheet Process
1. Capture frames as PNG blobs (same as above)
2. Create a wide canvas (512px * frameCount)
3. Draw each frame side by side using `createImageBitmap`
4. Export as single PNG
5. Generate CSS animation code with `steps()` timing function
6. Show live preview

### Security
- FFmpeg.wasm requires SharedArrayBuffer, which in turn requires COOP/COEP headers
- `file://` protocol will fall back to WebM (MediaRecorder) automatically
- URL validation prevents CSS injection in sprite sheet output (sanitizeAnimName, sanitizeNumber)

## API Reference (animator.js)

### State
```javascript
let state = {
    anim: 'breath',    // Current animation type
    speed: 1.0,        // Playback speed multiplier
    intensity: 1.0,    // Effect amplitude (0-2)
    format: 'webp'     // Export format
};
```

### Constants
- `ALLOWED_ANIMS` = ['breath', 'float', 'jump', 'shake', 'squash', 'spin']
- `ALLOWED_FORMATS` = ['webp', 'gif', 'webm', 'webm_hq', 'sprite']

### Functions
- `loadImage(src)` - Load image source to canvas
- `loadVideo(src)` - Load video source to canvas
- `fitCanvasToSource()` - Set canvas to 512x512
- `drawScene()` - Render single frame with current animation
- `animate()` - RequestAnimationFrame loop (preview only, paused during recording)
- `startRecording()` - Begin export process
- `recordWebM()` - Fast native WebM recording (3 seconds)
- `recordFrameSequence()` - High-quality frame-by-frame capture
- `convertFramesToOutput(frames, format, fps)` - Encode captured frames via FFmpeg
- `finishRecording(blob)` - Set up download link
- `sanitizeAnimName(name)` - Validate animation name against whitelist (returns string)
- `sanitizeNumber(val)` - Parse and validate numeric value (returns number)
