# 📘 Mascot System Technical Reference Manual

## 1. System Architecture

The Mascot System is a standalone JavaScript module (`mascot.js`) that operates on the DOM without external framework dependencies. It follows an object-oriented design pattern with a central update loop.

### Core Classes

| Class | Description | Key Responsibilities |
|-------|-------------|----------------------|
| **`Mascot`** | The main entity. | Movement, AI state, Animation, Collision, rendering. |
| **`Projectile`** | Weapons fired by mascots. | Trajectory calculation, Hit detection, Lifetime management. |
| **`Particle`** | Visual FX elements. | Physics-based movement, Fading, DOM cleanup. |
| **`SoundManager`** | Audio engine. | Web Audio API management, Real-time synthesis, Stereo panning. |

---

## 2. Component Details

### 2.1 Mascot Entity (`class Mascot`)
Each mascot is an independent instance with its own state and properties.

#### **Properties**
- `id`: Unique identifier (string).
- `x, y`: Current coordinates (top-left).
- `vx, vy`: Velocity vector.
- `aiType`: Behavioral personality (`neutral`, `curious`, `shy`, `aggressive`).
- `weaponType`: Currently equipped weapon (`machinegun`, `shotgun`, etc.).

#### **Behavioral AI (State Machine)**
The AI logic runs in `updatePosition()` and overrides standard movement based on `aiType`.
- **Neutral**: Random wandering with wall bouncing.
- **Curious**: Calculates vector towards cursor when distance > 50px & < 400px.
- **Shy**: Calculates vector *away* from cursor when distance < 200px.
- **Aggressive**: High-speed vector towards cursor when distance < 500px.

### 2.2 Visual Effects System

#### **Particle Engine (`class Particle`)**
- Uses DOM elements (`div.fx-particle`) to avoid Canvas context switching overhead.
- **Physics**: Applies gravity (`vy += 0.1`) and friction (`decay`) every frame.
- **Lifecycle**: Automatically removes element when `life <= 0`.

#### **Screen Shake**
- CSS Animation: `@keyframes screen-shake`
- Triggered by `Projectile.explode()` via `createExplosionFX()`.
- Implementation: Adds `.shake` class to `document.body` for 300ms.

### 2.3 Spatial Audio (`class SoundManager`)
- **Technology**: Web Audio API (No external assets required).
- **PannerNode**: Real-time stereo panning based on screen position.
  - `pan.value = (x / window.innerWidth) * 2 - 1` (-1 Left to +1 Right).
- **Synthesis**:
  - `Bullet`: Square wave with exponential frequency ramp (Laser-like).
  - `Flame`: Sawtooth wave with noise-like characteristics.
  - `Explosion`: Triangle wave with aggressive frequency drop.

---

## 3. Data Persistence (`IndexedDB`)

Configuration is saved automatically using **IndexedDB** for better storage capacity and performance.

> **Note**: Previous versions used `localStorage` which had a 5-10MB limit. The system now uses IndexedDB with automatic migration from localStorage.

**Storage Manager** (`MascotDB`):
- `MascotDB.save(data)`: Async save to IndexedDB
- `MascotDB.load()`: Async load from IndexedDB
- `MascotDB.migrateFromLocalStorage()`: Auto-migrates old localStorage data

**Schema Structure**:
```json
[
  {
    "id": "mascot_17145892012",
    "image": "data:image/png;base64...",
    "isCustom": true,
    "size": 64,
    "x": 100, "y": 200, "vx": 1.5, "vy": -0.5,
    "disabled": false,
    "noFloat": false,
    "effect3d": true,
    "actionMode": true,
    "weaponType": "shotgun",
    "aiType": "aggressive"
  }
]
```

---

## 4. Configuration Constants

System limits and physics parameters are defined at the top of `mascot.js`.

```javascript
const MAX_PROJECTILES = 100;     // Max active bullets to prevent DOM lag
const MAX_PARTICLES = 50;        // Max visual FX particles
const collisionSettings = { 
    enabled: true, 
    strength: 0.8                // Bounciness (0.0 - 1.0)
};
const fxSettings = {             // Global toggles
    screenShake: true,
    particles: true,
    sound: true
};
```

---

## 5. Global Event Loop

The `globalUpdate()` function drives the entire system using `requestAnimationFrame`.

1. **Projectile Update**: Move bullets, check collisions, remove dead bullets.
2. **Particle Update**: Apply physics, fade out, remove dead particles.
3. **Mascot Update**: Apply velocity, execute AI logic, handle wall collisions.
4. **Collision Check**: Spatial partitioning for efficient O(N) collision detection.
5. **Loop**: Request next frame.

### 5.1 Performance Optimizations

#### **Spatial Partitioning** (`SpatialGrid`)
Instead of O(N²) brute-force collision checks, the system uses grid-based spatial partitioning:
- Screen divided into 150px cells
- Mascots only check collisions with entities in same/adjacent cells
- Reduces collision checks from ~5000 to ~50 for 100 mascots

```javascript
const SpatialGrid = {
    cellSize: 150,
    getCellKey(x, y) { /* returns "cellX,cellY" */ },
    insert(mascot) { /* adds to grid */ },
    getNearby(mascot) { /* returns mascots in 3x3 cell area */ }
};
```

#### **Page Visibility API**
Animations automatically pause when the browser tab is hidden:
- Saves CPU/battery when user switches tabs
- Matrix Rain and mascot updates both respect visibility state
- Resumes instantly when tab becomes visible again

```javascript
document.addEventListener('visibilitychange', () => {
    isPageVisible = !document.hidden;
});

---

## 6. Mascot Animator (WebP Generator)

`mascot-animator` is a standalone tool in the `/mascot-animator` directory for converting static images into animated WebP/GIFs.

### 6.1 Key Features
- **Source Support**: Images (PNG, JPG) & Video (MP4, WebM) files or URLs.
- **Procedural Animations**: Breathing, Floating, Jump, Shake, Squash, Spin, etc.
- **Export Formats**:
  - `Animated WebP`: Supports transparency, high compression.
  - `GIF`: Supports transparency, palette optimization.
  - `WebM`: Transparent video (VP9 codec).

### 6.2 Transparency Assurance (Frame-by-Frame Rendering)
Browser `MediaRecorder` APIs often lose alpha channel information during real-time compression, resulting in black backgrounds. We solved this using **Frame-by-Frame Rendering**.

> **⚠️ Known Issue**: The WebP encoder in `ffmpeg.wasm` currently has limitations with animation disposal methods, which may cause "ghosting" (trails) in transparent animations. For perfect results, we recommend using the tool to generate the PNG frames, but performing the final encoding using a local, full version of FFmpeg or other dedicated tools.
- **WebM (HQ)**: Uses `libvpx-vp9` with `yuva420p` for high-quality transparent video.
- **Sprite Sheet**: The perfect alternative for zero artifacts. Generates a single PNG strip and provides ready-to-use CSS `steps()` animation code. **(Includes live animation preview)**

### 6.3 Security Requirements
`ffmpeg.wasm` requires `SharedArrayBuffer` for performance. Modern browsers block this unless specific security headers are present:

- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

**Solution**:
The tool will not work fully on `file://`. Use the included `server.py` to serve with headers:
```bash
python server.py
# Serves at http://localhost:8080 with correct headers
```

---

## 7. [Experimental] Background Remover Tool

Located at `/background-remover`. This feature attempts to remove image backgrounds client-side using `@imgly/background-removal`.

> **⚠️ Known Issue**: In the current local development environment (`localhost`), fetching the AI model (WASM/ONNX) files often fails with a "Conversion Failed" error due to CORS or path resolution issues. This feature likely requires a production HTTPS environment or specific server configuration to work reliably.

