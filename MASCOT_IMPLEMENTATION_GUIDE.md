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

## 3. Data Persistence (`localStorage`)

Configuration is saved automatically on any change to `mascots-data`.

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

## 5. Global Event Loop

The `globalUpdate()` function drives the entire system using `requestAnimationFrame`.

1. **Projectile Update**: Move bullets, check collisions, remove dead bullets.
2. **Particle Update**: Apply physics, fade out, remove dead particles.
3. **Mascot Update**: Apply velocity, execute AI logic, handle wall collisions.
4. **Collision Check**: O(N^2) check between all mascots for physics interaction.
5. **Loop**: Request next frame.
