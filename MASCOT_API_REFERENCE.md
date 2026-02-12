# Mascot System API Reference

> **Version:** 2.0
> **Source:** `mascot.js`
> **Runtime:** Browser (ES6+, DOM, IndexedDB, Web Audio API)

---

## Table of Contents

- [Globals](#globals)
- [MascotDB (IndexedDB Storage Manager)](#mascotdb-indexeddb-storage-manager)
- [class SoundManager](#class-soundmanager)
- [class Particle](#class-particle)
- [class Projectile](#class-projectile)
- [class Mascot](#class-mascot)
- [SpatialGrid (Collision Optimization)](#spatialgrid-collision-optimization)
- [Global Functions](#global-functions)
- [Data Schema (IndexedDB)](#data-schema-indexeddb)
- [AI Behavior Details](#ai-behavior-details)
- [Weapon Specifications](#weapon-specifications)

---

## Globals

Top-level variables and constants available throughout the mascot system.

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `mascots` | `Array<Mascot>` | `[]` | Active mascot instances |
| `projectiles` | `Array<Projectile>` | `[]` | Active projectile instances |
| `particles` | `Array<Particle>` | `[]` | Active particle instances |
| `selectedMascotId` | `string \| null` | `null` | ID of the currently selected mascot in the settings UI |
| `MAX_PROJECTILES` | `number` | `100` | Hard cap on simultaneous projectiles |
| `MAX_PARTICLES` | `number` | `50` | Hard cap on simultaneous particles |
| `collisionSettings` | `object` | `{ enabled: true, strength: 0.8 }` | Collision detection toggle and response strength multiplier |
| `fxSettings` | `object` | `{ screenShake: true, particles: true, sound: true }` | Master toggles for visual and audio effects |
| `mouseX` | `number` | `0` | Current horizontal mouse position (updated on `mousemove`) |
| `mouseY` | `number` | `0` | Current vertical mouse position (updated on `mousemove`) |
| `isPageVisible` | `boolean` | `true` | Page visibility state (updated via `visibilitychange` event) |

```js
// Example: disable all collisions at runtime
collisionSettings.enabled = false;

// Example: mute sound effects
fxSettings.sound = false;
```

---

## MascotDB (IndexedDB Storage Manager)

A singleton object that manages persistent storage of mascot data using IndexedDB, with automatic fallback to localStorage (without image data) on error.

### Properties

| Property | Type | Value | Description |
|----------|------|-------|-------------|
| `dbName` | `string` | `'MascotStorage'` | IndexedDB database name |
| `dbVersion` | `number` | `1` | Database schema version |
| `storeName` | `string` | `'mascots'` | Object store name within the database |

### Methods

#### `init()`

Initialize the IndexedDB connection. Creates the database and object store if they do not exist.

```ts
MascotDB.init(): Promise<IDBDatabase>
```

**Returns:** A promise that resolves to the `IDBDatabase` instance.

**Behavior:**
- Opens (or creates) the `MascotStorage` database at version 1.
- On `upgradeneeded`, creates the `mascots` object store with `keyPath: 'id'`.
- Caches and reuses the connection on subsequent calls.

```js
const db = await MascotDB.init();
```

---

#### `save(mascotsData)`

Save an array of mascot data objects to IndexedDB. Falls back to localStorage (without images) on error.

```ts
MascotDB.save(mascotsData: Array<object>): Promise<boolean>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `mascotsData` | `Array<object>` | Array of serialized mascot data objects |

**Returns:** `true` on success, `false` on failure.

**Fallback behavior:** If IndexedDB write fails, the method attempts to save to `localStorage` under the key `'mascots'`. In this fallback, image data (base64 strings) is stripped to avoid exceeding localStorage quotas.

```js
const data = mascots.map(m => ({
  id: m.id,
  image: m.currentImage,
  isCustom: m.isCustom,
  size: m.size,
  x: m.x, y: m.y,
  vx: m.vx, vy: m.vy,
  disabled: m.isDisabled,
  noFloat: m.isFloatDisabled,
  effect3d: m.is3DEffectEnabled,
  actionMode: m.isActionModeEnabled,
  weaponType: m.weaponType,
  aiType: m.aiType
}));
const ok = await MascotDB.save(data);
```

---

#### `load()`

Load all mascot records from IndexedDB.

```ts
MascotDB.load(): Promise<Array<object> | null>
```

**Returns:** An array of mascot data objects, or `null` if the store is empty or an error occurs.

```js
const saved = await MascotDB.load();
if (saved) {
  saved.forEach(data => addMascot(data, true));
}
```

---

#### `migrateFromLocalStorage()`

Automatically migrate mascot data from the legacy `localStorage` format (`'mascots'` key) into IndexedDB. Called once during system initialization.

```ts
MascotDB.migrateFromLocalStorage(): Promise<Array<object> | null>
```

**Returns:** The migrated data array, or `null` if no legacy data was found.

**Behavior:**
1. Reads and parses `localStorage.getItem('mascots')`.
2. If data exists, saves it to IndexedDB via `MascotDB.save()`.
3. Removes the `'mascots'` key from localStorage after successful migration.
4. Returns the migrated array.

---

## class SoundManager

Manages synthesized spatial audio effects using the Web Audio API. Sounds are positioned in stereo space based on their horizontal screen coordinate.

### Constructor

```ts
new SoundManager()
```

Creates an uninitialized SoundManager. The `AudioContext` is created lazily on first use to comply with browser autoplay policies.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `ctx` | `AudioContext \| null` | `null` | Web Audio API context (created on `init()`) |
| `enabled` | `boolean` | `true` | Master enable/disable for sound playback |

### Methods

#### `init()`

Initialize the `AudioContext`. Called automatically on first `playSpatialSound()` invocation.

```ts
soundManager.init(): void
```

**Note:** Must be triggered by a user gesture (click, keypress) due to browser autoplay restrictions. The mascot system calls this from click handlers.

---

#### `playSpatialSound(type, x)`

Play a synthesized sound effect with stereo panning based on horizontal position.

```ts
soundManager.playSpatialSound(type: string, x: number): Promise<void>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | `'bullet' \| 'flame' \| 'explosion'` | Sound type to synthesize |
| `x` | `number` | Horizontal screen position (`0` to `window.innerWidth`) |

**Stereo panning formula:**

```
pan = (x / window.innerWidth) * 2 - 1
```

- `pan = -1` : full left
- `pan = 0` : center
- `pan = +1` : full right

**Sound characteristics by type:**

| Type | Waveform | Frequency | Duration | Notes |
|------|----------|-----------|----------|-------|
| `bullet` | Square | High | Short | Sharp percussive hit |
| `flame` | Noise-based | Low | Medium | Whoosh/crackle texture |
| `explosion` | Noise + sine | Low | Long | Bass thump with noise burst |

**Requires:** `fxSettings.sound === true` and `soundManager.enabled === true`.

```js
// Play a bullet sound at the center of the screen
await soundManager.playSpatialSound('bullet', window.innerWidth / 2);
```

### Global Instance

```js
const soundManager = new SoundManager();
```

The single `soundManager` instance is available globally and shared by all mascots and projectiles.

---

## class Particle

A lightweight visual effect element (spark or smoke) rendered as a DOM `<div>` with CSS-driven styling.

### Constructor

```ts
new Particle(x: number, y: number, vx: number, vy: number, color: string, type: string)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `x` | `number` | Initial X position (pixels) |
| `y` | `number` | Initial Y position (pixels) |
| `vx` | `number` | Horizontal velocity (pixels/frame) |
| `vy` | `number` | Vertical velocity (pixels/frame) |
| `color` | `string` | CSS color value (unused at runtime; CSS classes handle color) |
| `type` | `'spark' \| 'smoke'` | Particle visual type |

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `x` | `number` | (constructor) | Current X position |
| `y` | `number` | (constructor) | Current Y position |
| `vx` | `number` | (constructor) | Horizontal velocity |
| `vy` | `number` | (constructor) | Vertical velocity |
| `life` | `number` | `1.0` | Remaining life (1.0 = full, 0.0 = dead) |
| `decay` | `number` | `0.02 - 0.05` | Life reduction per frame (randomized on creation) |
| `element` | `HTMLDivElement` | (created) | DOM element representing the particle |
| `type` | `string` | (constructor) | `'spark'` or `'smoke'` |

### Methods

#### `update()`

Apply physics, decrease life, and update DOM position. Called once per animation frame.

```ts
particle.update(): void
```

**Physics:**
- `x += vx`
- `y += vy`
- `vy += 0.1` (gravity)
- `life -= decay`

**DOM update:** Sets `transform: translate(x, y)` and `opacity: life` on the element.

**Auto-destroy:** When `life <= 0`, calls `destroy()` automatically.

---

#### `destroy()`

Remove the particle from the DOM and from the global `particles` array.

```ts
particle.destroy(): void
```

---

## class Projectile

A moving projectile fired by a mascot. Supports four distinct types with different physics and behavior.

### Constructor

```ts
new Projectile(
  x: number,
  y: number,
  vx: number,
  vy: number,
  type: string,
  targetMascot?: Mascot
)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `x` | `number` | Initial X position |
| `y` | `number` | Initial Y position |
| `vx` | `number` | Horizontal velocity |
| `vy` | `number` | Vertical velocity |
| `type` | `'bullet' \| 'flame' \| 'grenade' \| 'missile'` | Projectile behavior type |
| `targetMascot` | `Mascot` (optional) | Target for missile homing logic |

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `x`, `y` | `number` | (constructor) | Current position |
| `vx`, `vy` | `number` | (constructor) | Current velocity |
| `type` | `string` | (constructor) | Projectile type identifier |
| `targetMascot` | `Mascot \| null` | (constructor) | Homing target (missiles only) |
| `lifeTime` | `number` | `0` | Frames elapsed since creation |
| `maxLifeTime` | `number` | `30` (flame) / `200` (others) | Maximum frames before auto-destroy |
| `alive` | `boolean` | `true` | Whether the projectile is still active |
| `element` | `HTMLDivElement` | (created) | DOM element |

### Methods

#### `update()`

Move the projectile, apply type-specific logic, and check for hits against all mascots.

```ts
projectile.update(): void
```

**Per-type behavior:**

| Type | Movement | Hit Detection |
|------|----------|---------------|
| `bullet` | Linear (`x += vx, y += vy`) | Distance to mascot center < mascot radius |
| `flame` | Linear, short-lived (30 frames max) | Distance check, area-of-effect |
| `grenade` | Linear until hit, then `explode()` | Distance to mascot center < mascot radius |
| `missile` | Homing: adjusts velocity toward `targetMascot` | Distance to mascot center < mascot radius |

**Missile homing algorithm:**
1. Calculate angle from missile position to target center.
2. Gradually steer `vx`/`vy` toward the target angle.
3. Accelerate over time (`speed = 5 + lifeTime * 0.05`).
4. If `targetMascot` is destroyed, the missile continues in a straight line.

**Boundary check:** Destroys the projectile if it leaves the viewport (with margin).

---

#### `explode()`

Grenade-specific explosion. Triggers area damage, visual effects, and sound.

```ts
projectile.explode(): void
```

**Behavior:**
1. Finds all mascots within a **100px blast radius**.
2. Pushes affected mascots away from the explosion center (velocity impulse).
3. Calls `createExplosionFX(x, y)` for visual particles.
4. Plays `soundManager.playSpatialSound('explosion', x)`.
5. Calls `destroy()`.

---

#### `destroy()`

Remove the projectile from the DOM and from the global `projectiles` array.

```ts
projectile.destroy(): void
```

---

## class Mascot

The core entity of the system. Each mascot is an animated, interactive character rendered as a DOM element with physics, AI, combat, and visual effects.

### Constructor

```ts
new Mascot(id: string, config: object)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | Unique identifier (e.g., `"mascot_1714589201234_abc123def"`) |
| `config` | `object` | Configuration object (see below) |

#### Config Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `x` | `number` | Random (0 to viewport width) | Initial X position |
| `y` | `number` | Random (0 to viewport height) | Initial Y position |
| `vx` | `number` | Random (-0.5 to 0.5) | Initial horizontal velocity |
| `vy` | `number` | Random (-0.5 to 0.5) | Initial vertical velocity |
| `size` | `number` | `64` | Pixel size (width and height) |
| `isCustom` | `boolean` | `false` | Whether the image was user-uploaded |
| `image` | `string` | (default mascot image) | Image source URL or data URI |
| `disabled` | `boolean` | `false` | Whether the mascot is hidden |
| `noFloat` | `boolean` | `false` | Disable float animation |
| `effect3d` | `boolean` | `false` | Enable 3D tilt effect on hover |
| `actionMode` | `boolean` | `false` | Enable weapon firing |
| `weaponType` | `string` | `'machinegun'` | Active weapon type |
| `aiType` | `string` | `'neutral'` | AI behavior pattern |

### Instance Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `id` | `string` | (constructor) | Unique mascot identifier |
| `element` | `HTMLDivElement` | (created in `init()`) | Root DOM element |
| `x`, `y` | `number` | (config) | Current position |
| `vx`, `vy` | `number` | (config) | Current velocity |
| `speed` | `number` | `1.5` | Base movement speed |
| `runningSpeed` | `number` | `2.5` | Speed when fleeing from clicks |
| `isRunning` | `boolean` | `false` | Currently fleeing |
| `clickCount` | `number` | `0` | Total clicks on this mascot |
| `lastClickTime` | `number` | `0` | Timestamp of last click |
| `isCustom` | `boolean` | (config) | Custom image flag |
| `size` | `number` | (config) | Pixel size |
| `isDisabled` | `boolean` | (config) | Visibility state |
| `isFloatDisabled` | `boolean` | (config) | Float animation disabled |
| `is3DEffectEnabled` | `boolean` | (config) | 3D tilt enabled |
| `isActionModeEnabled` | `boolean` | (config) | Weapon mode enabled |
| `weaponType` | `string` | (config) | Current weapon |
| `currentImage` | `string` | (config) | Current image source |
| `aiType` | `string` | (config) | AI behavior type |
| `targetX`, `targetY` | `number` | `0` | AI movement target coordinates |
| `lastAIUpdate` | `number` | `0` | Timestamp of last AI tick |
| `messages` | `string[]` | (hardcoded Korean) | Click response speech bubble messages |
| `easterEggMessages` | `string[]` | (hardcoded Korean) | Messages after 20+ clicks |

### Methods

#### `init()`

Create the DOM element, apply initial styles, attach event listeners, and append to the document body.

```ts
mascot.init(): void
```

**Creates:**
- A `div.mascot` element with an inner `img` tag.
- Click, mousedown/mouseup (shooting), mousemove (3D tilt), and resize listeners.

---

#### `destroy()`

Fully tear down the mascot: remove DOM element, clear all intervals, remove the resize event listener.

```ts
mascot.destroy(): void
```

---

#### `onClick(e)`

Handle a click event on the mascot.

```ts
mascot.onClick(e: MouseEvent): void
```

**Behavior:**
1. Increments `clickCount`.
2. Makes the mascot flee away from the click position (temporary `runningSpeed` boost).
3. Shows a random speech bubble message.
4. After **20+ clicks**, switches to `easterEggMessages`.

---

#### `updateVisibility()`

Show or hide the mascot DOM element based on `isDisabled`.

```ts
mascot.updateVisibility(): void
```

---

#### `update3DEffects()`

Toggle the 3D tilt CSS class on the mascot element based on `is3DEffectEnabled`.

```ts
mascot.update3DEffects(): void
```

---

#### `onMouseMove(e)`

Calculate 3D tilt rotation angles based on cursor position relative to the mascot center.

```ts
mascot.onMouseMove(e: MouseEvent): void
```

**Only active when** `is3DEffectEnabled === true`.

---

#### `updateAnimation()`

Set the CSS animation property based on the current state (float animation or none).

```ts
mascot.updateAnimation(): void
```

**Rules:**
- Float animation is applied unless `isFloatDisabled === true` or `isRunning === true`.

---

#### `startShooting(e)`

Begin the auto-fire interval for the current weapon type.

```ts
mascot.startShooting(e: MouseEvent): void
```

**Only active when** `isActionModeEnabled === true`.

**Behavior:** Sets an interval that calls `fireWeapon()` at the weapon's fire rate. For single-shot weapons (shotgun, grenade, missile), fires once immediately.

---

#### `stopShooting()`

Clear the shooting interval.

```ts
mascot.stopShooting(): void
```

---

#### `setActionMode(enabled)`

Toggle action/weapon mode on or off.

```ts
mascot.setActionMode(enabled: boolean): void
```

---

#### `setWeaponType(type)`

Change the active weapon. If currently shooting, stops and restarts with the new weapon's fire rate.

```ts
mascot.setWeaponType(type: string): void
```

| Valid Types |
|-------------|
| `'machinegun'` |
| `'shotgun'` |
| `'flamethrower'` |
| `'grenade'` |
| `'missile'` |

---

#### `setAIType(type)`

Change the AI behavior pattern.

```ts
mascot.setAIType(type: string): void
```

| Valid Types |
|-------------|
| `'neutral'` |
| `'curious'` |
| `'shy'` |
| `'aggressive'` |

---

#### `fireWeapon()`

Dispatch to the specific fire method based on `weaponType`.

```ts
mascot.fireWeapon(): void
```

**Respects** `MAX_PROJECTILES` -- will not fire if the limit is reached.

---

#### `fireBullet(x, y, angleOffset?)`

Fire a single bullet projectile toward the cursor position.

```ts
mascot.fireBullet(x: number, y: number, angleOffset?: number): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `x` | `number` | Target X (typically `mouseX`) |
| `y` | `number` | Target Y (typically `mouseY`) |
| `angleOffset` | `number` (optional) | Radians offset for shotgun spread |

**Side effects:**
- Creates a `Projectile` of type `'bullet'`.
- Plays `soundManager.playSpatialSound('bullet', mascot.x)`.
- Optionally creates a spark `Particle` at the muzzle.

---

#### `fireFlame(x, y)`

Fire a flame projectile toward the cursor position.

```ts
mascot.fireFlame(x: number, y: number): void
```

**Side effects:**
- Creates a `Projectile` of type `'flame'` with randomized speed (5-10).
- Plays `soundManager.playSpatialSound('flame', mascot.x)`.

---

#### `fireGrenade(x, y)`

Fire a grenade projectile toward the cursor position.

```ts
mascot.fireGrenade(x: number, y: number): void
```

**Side effects:**
- Creates a `Projectile` of type `'grenade'` with speed 8.
- Grenade explodes on contact with a mascot (see `Projectile.explode()`).

---

#### `fireMissile(x, y)`

Fire a homing missile that targets a random other mascot.

```ts
mascot.fireMissile(x: number, y: number): void
```

**Target selection:** Randomly selects one mascot from the `mascots` array that is not the firing mascot.

**Side effects:**
- Creates a `Projectile` of type `'missile'` with initial speed 5.
- The missile homes toward the selected target.

---

#### `createImpact(type, x, y)`

Add a visual impact mark to the mascot's DOM element.

```ts
mascot.createImpact(type: string, x: number, y: number): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | `'hole' \| 'scorch'` | Impact visual style |
| `x` | `number` | X offset within mascot element |
| `y` | `number` | Y offset within mascot element |

---

#### `showSpeechBubble(message)`

Display a speech bubble above the mascot for 3 seconds with a fade-out transition.

```ts
mascot.showSpeechBubble(message: string): void
```

**Behavior:**
1. Creates (or reuses) a `.speech-bubble` child element.
2. Sets the text content to `message`.
3. Shows with opacity transition.
4. After 3 seconds, fades out and removes.

---

#### `updateImage(src, isCustom)`

Change the mascot's image source. Triggers an automatic save to IndexedDB.

```ts
mascot.updateImage(src: string, isCustom: boolean): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `src` | `string` | Image URL or data URI |
| `isCustom` | `boolean` | Whether this is a user-uploaded image |

---

#### `setSize(size)`

Update the mascot's pixel dimensions (both width and height).

```ts
mascot.setSize(size: number): void
```

---

#### `updatePosition()`

Main per-frame update method. Processes AI logic, applies velocity, enforces boundary constraints, and flips the mascot image to face the direction of movement.

```ts
mascot.updatePosition(): void
```

**Execution order:**
1. AI behavior update (if `aiType !== 'neutral'` and AI tick interval has elapsed).
2. Apply velocity: `x += vx`, `y += vy`.
3. Boundary clamping: bounce off viewport edges.
4. Direction flip: `scaleX(-1)` when moving left.
5. Update DOM `transform`.

---

#### `getCenter()`

Get the center coordinates of the mascot element.

```ts
mascot.getCenter(): { x: number, y: number }
```

**Returns:** `{ x: this.x + this.size / 2, y: this.y + this.size / 2 }`

---

#### `getRadius()`

Get the collision radius based on the mascot's rendered dimensions.

```ts
mascot.getRadius(): number
```

**Formula:** `(element.offsetWidth + element.offsetHeight) / 4`

This produces a radius that is the average of half-width and half-height, creating a circular approximation of the mascot's bounding box.

---

#### `checkCollisionWith(other)`

Check whether this mascot is colliding with another mascot using circle-based collision detection.

```ts
mascot.checkCollisionWith(other: Mascot): boolean
```

**Algorithm:** Returns `true` if the distance between the two mascots' centers is less than the sum of their radii.

```js
const dx = centerA.x - centerB.x;
const dy = centerA.y - centerB.y;
const dist = Math.sqrt(dx * dx + dy * dy);
return dist < (radiusA + radiusB);
```

---

#### `handleCollision(other)`

Resolve a collision between two mascots using elastic collision response. Mass is proportional to the mascot's `size` property.

```ts
mascot.handleCollision(other: Mascot): void
```

**Physics model:**
- Separates overlapping mascots along the collision normal.
- Applies elastic velocity exchange weighted by mass ratio.
- Collision response strength is scaled by `collisionSettings.strength` (default `0.8`).

---

#### `onResize()`

Clamp the mascot's position within the current viewport dimensions. Called on `window.resize`.

```ts
mascot.onResize(): void
```

---

## SpatialGrid (Collision Optimization)

A spatial hashing structure that accelerates collision detection by dividing the viewport into grid cells. Only mascots in the same or adjacent cells are tested for collisions.

### Properties

| Property | Type | Value | Description |
|----------|------|-------|-------------|
| `cellSize` | `number` | `150` | Grid cell dimensions in pixels |

### Methods

#### `clear()`

Reset all grid cells. Called at the beginning of each collision check pass.

```ts
SpatialGrid.clear(): void
```

---

#### `getCellKey(x, y)`

Convert a world position to a cell key string.

```ts
SpatialGrid.getCellKey(x: number, y: number): string
```

**Returns:** `"cellX,cellY"` where `cellX = Math.floor(x / cellSize)` and `cellY = Math.floor(y / cellSize)`.

```js
SpatialGrid.getCellKey(320, 480); // "2,3"
```

---

#### `insert(mascot)`

Add a mascot to its corresponding grid cell.

```ts
SpatialGrid.insert(mascot: Mascot): void
```

---

#### `getNearby(mascot)`

Retrieve all mascots from the current cell and the 8 surrounding cells.

```ts
SpatialGrid.getNearby(mascot: Mascot): Mascot[]
```

**Returns:** An array of `Mascot` instances that are potential collision candidates (may include the queried mascot itself).

**Grid neighborhood (9 cells):**

```
[NW] [N ] [NE]
[W ] [C ] [E ]
[SW] [S ] [SE]
```

---

## Global Functions

Standalone functions available at the module/global scope.

### `createExplosionFX(x, y)`

Create a visual explosion effect at the given position.

```ts
createExplosionFX(x: number, y: number): void
```

**Effects:**
- Spawns **15 spark particles** with randomized velocities radiating outward.
- Triggers a **screen shake** effect (if `fxSettings.screenShake === true`).

**Requires:** `fxSettings.particles === true` for particle spawning.

---

### `generateMascotId()`

Generate a unique mascot identifier.

```ts
generateMascotId(): string
```

**Returns:** A string in the format `"mascot_" + Date.now() + "_" + randomHex`.

```js
generateMascotId(); // "mascot_1714589201234_a3f7b2c1"
```

---

### `getMascotById(id)`

Find a mascot instance by its ID.

```ts
getMascotById(id: string): Mascot | undefined
```

```js
const m = getMascotById('mascot_1714589201234_a3f7b2c1');
if (m) m.showSpeechBubble('Found!');
```

---

### `checkAllCollisions()`

Run a full collision detection pass using the spatial grid.

```ts
checkAllCollisions(): void
```

**Algorithm:**
1. `SpatialGrid.clear()`
2. Insert all active (non-disabled) mascots into the grid.
3. For each mascot, get nearby candidates via `SpatialGrid.getNearby()`.
4. For each unique pair, call `checkCollisionWith()`.
5. If colliding, call `handleCollision()`.

**Only runs when** `collisionSettings.enabled === true`.

---

### `addMascot(config, skipSave?)`

Create a new mascot, register it in the global `mascots` array, and optionally save to storage.

```ts
addMascot(config: object, skipSave?: boolean): Mascot
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `config` | `object` | (required) | Mascot configuration (see Mascot constructor) |
| `skipSave` | `boolean` | `false` | If `true`, skip the auto-save to IndexedDB |

**Returns:** The newly created `Mascot` instance.

```js
const newMascot = addMascot({
  image: 'custom.png',
  isCustom: true,
  size: 128,
  aiType: 'curious'
});
```

---

### `removeMascot(id)`

Destroy a mascot and remove it from the global `mascots` array.

```ts
removeMascot(id: string): boolean
```

**Returns:** `true` if the mascot was found and removed, `false` otherwise.

---

### `saveMascotsToStorage()`

Serialize all mascots and save to IndexedDB via `MascotDB.save()`.

```ts
saveMascotsToStorage(): void
```

**Serialized fields per mascot:** `id`, `image`, `isCustom`, `size`, `x`, `y`, `vx`, `vy`, `disabled`, `noFloat`, `effect3d`, `actionMode`, `weaponType`, `aiType`.

---

### `loadMascotsFromStorage()`

Load mascots from IndexedDB, with automatic migration from localStorage if needed.

```ts
loadMascotsFromStorage(): Promise<void>
```

**Execution order:**
1. Attempt `MascotDB.load()`.
2. If no data, attempt `MascotDB.migrateFromLocalStorage()`.
3. If still no data, create default mascots.
4. For each loaded record, call `addMascot(data, true)`.

---

### `globalUpdate()`

The main animation frame loop. Called via `requestAnimationFrame`.

```ts
globalUpdate(): void
```

**Execution order per frame:**
1. **Projectiles:** Update all active projectiles (movement, hit detection).
2. **Particles:** Update all active particles (physics, life decay).
3. **Mascots:** Update all active mascots (AI, movement, boundary check).
4. **Collisions:** Run `checkAllCollisions()`.
5. Schedule next frame via `requestAnimationFrame(globalUpdate)`.

**Pause behavior:** When `isPageVisible === false`, the loop continues but may skip updates to reduce CPU usage.

---

### `setupGlobalMascotUI()`

Initialize the mascot settings modal, tab navigation, control bindings, and event listeners.

```ts
setupGlobalMascotUI(): void
```

**Sets up:**
- Settings modal open/close.
- Tab switching (mascot list, global settings, effects).
- Per-mascot controls (image upload, size slider, toggles, weapon/AI selectors).
- Global settings (collision toggle, strength slider, FX toggles).

---

### `initMascotSystem()`

Bootstrap the entire mascot system. This is the entry point called on page load.

```ts
initMascotSystem(): Promise<void>
```

**Execution order:**
1. `await loadMascotsFromStorage()` -- load or create mascots.
2. `setupGlobalMascotUI()` -- bind UI controls.
3. `globalUpdate()` -- start the animation loop.

---

## Data Schema (IndexedDB)

Each mascot is stored as a single record in the `mascots` object store with `id` as the key path.

```json
{
  "id": "mascot_1714589201234_abc123def",
  "image": "mascot.png",
  "isCustom": false,
  "size": 64,
  "x": 150.5,
  "y": 200.3,
  "vx": 1.2,
  "vy": -0.5,
  "disabled": false,
  "noFloat": false,
  "effect3d": true,
  "actionMode": false,
  "weaponType": "machinegun",
  "aiType": "neutral"
}
```

### Field Reference

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `string` | Primary key, unique | Mascot identifier |
| `image` | `string` | URL or data URI | Image source. For custom images, this is a `data:image/png;base64,...` string |
| `isCustom` | `boolean` | -- | `true` if user-uploaded image |
| `size` | `number` | > 0 | Pixel dimensions |
| `x` | `number` | >= 0 | Horizontal position |
| `y` | `number` | >= 0 | Vertical position |
| `vx` | `number` | -- | Horizontal velocity |
| `vy` | `number` | -- | Vertical velocity |
| `disabled` | `boolean` | -- | Hidden state |
| `noFloat` | `boolean` | -- | Float animation disabled |
| `effect3d` | `boolean` | -- | 3D tilt enabled |
| `actionMode` | `boolean` | -- | Weapon mode enabled |
| `weaponType` | `string` | One of: `machinegun`, `shotgun`, `flamethrower`, `grenade`, `missile` | Active weapon |
| `aiType` | `string` | One of: `neutral`, `curious`, `shy`, `aggressive` | AI behavior |

### Storage Size Considerations

- **Default images** (URL strings): ~20-50 bytes per record.
- **Custom images** (base64 data URIs): Can be 100KB-2MB+ per record.
- **IndexedDB quota**: Typically 50% of free disk space (browser-dependent).
- **localStorage fallback**: ~5-10MB limit. Custom image data is stripped during fallback to stay within quota.

---

## AI Behavior Details

Each mascot can be assigned an AI behavior type that determines how it reacts to the user's cursor position. The AI logic runs on a **100ms tick interval**.

| Type | Trigger Distance | Direction | Speed Modifier | Description |
|------|-----------------|-----------|----------------|-------------|
| `neutral` | N/A | Random wandering | `0` (no cursor influence) | Mascot moves randomly, ignoring the cursor entirely |
| `curious` | 50px - 400px | Toward cursor | `+0.1` per AI tick | Mascot is attracted to the cursor when within range |
| `shy` | < 200px | Away from cursor | `+0.2` per AI tick | Mascot flees from the cursor when too close |
| `aggressive` | < 500px | Toward cursor | `+0.3` per AI tick | Mascot aggressively pursues the cursor at higher speed |

### AI Tick Behavior

```
Every 100ms:
  1. Calculate distance from mascot center to (mouseX, mouseY)
  2. If distance is within the trigger range for the AI type:
     a. Calculate angle from mascot to cursor (or away for 'shy')
     b. Add speed modifier to velocity in that direction
  3. If distance is outside trigger range:
     a. Optionally pick a new random wander target
```

### Interaction with Other Systems

- **Action mode:** AI targeting operates independently from weapon aiming. Weapons always fire toward the cursor regardless of AI type.
- **Collisions:** AI velocity adjustments are applied before collision resolution each frame.
- **Boundary clamping:** AI-driven movement still respects viewport boundaries (mascots bounce off edges).

---

## Weapon Specifications

Weapons are available when `isActionModeEnabled === true`. The mascot fires toward the current cursor position (`mouseX`, `mouseY`).

| Weapon | Fire Rate | Projectile Speed | Special Behavior |
|--------|-----------|-------------------|------------------|
| `machinegun` | 100ms (auto) | 15 px/frame | Single bullet per shot |
| `shotgun` | Single shot | 15 px/frame | 5 bullets in a spread pattern (+-0.2 radians) |
| `flamethrower` | 80ms (auto) | 5-10 px/frame (random) | Short range (30 frame lifetime), area damage |
| `grenade` | Single shot | 8 px/frame | Explodes on contact, 100px blast radius, pushes mascots |
| `missile` | Single shot | 5 px/frame (initial) | Homing toward a random other mascot, accelerates over time |

### Fire Rate Modes

- **Auto-fire** (`machinegun`, `flamethrower`): Fires continuously while the mouse button is held down on the mascot. Uses `setInterval` at the specified rate.
- **Single shot** (`shotgun`, `grenade`, `missile`): Fires once on `mousedown`. No continuous firing.

### Shotgun Spread Pattern

The shotgun fires 5 bullets simultaneously with angular offsets:

```
Bullet 1: baseAngle - 0.2 rad
Bullet 2: baseAngle - 0.1 rad
Bullet 3: baseAngle (center)
Bullet 4: baseAngle + 0.1 rad
Bullet 5: baseAngle + 0.2 rad
```

Where `baseAngle = atan2(mouseY - mascotCenterY, mouseX - mascotCenterX)`.

### Missile Homing Details

```
Each frame:
  1. Calculate desired angle toward targetMascot.getCenter()
  2. Smoothly interpolate current trajectory toward desired angle
  3. Increase speed: speed = 5 + lifeTime * 0.05
  4. If target is destroyed (no longer in mascots array):
     - Continue in straight line at current velocity
```

### Projectile Caps

All weapons respect the global `MAX_PROJECTILES` limit of **100**. If the limit is reached, no new projectiles are created until existing ones are destroyed. This prevents performance degradation during sustained fire.

---

## Lifecycle Overview

```
Page Load
  |
  v
initMascotSystem()
  |
  +---> MascotDB.init()
  +---> loadMascotsFromStorage()
  |       +---> MascotDB.load()
  |       +---> MascotDB.migrateFromLocalStorage() (if needed)
  |       +---> addMascot() x N
  +---> setupGlobalMascotUI()
  +---> globalUpdate() (starts requestAnimationFrame loop)
        |
        +---> [per frame]
              +---> Update projectiles
              +---> Update particles
              +---> Update mascots (AI + physics)
              +---> checkAllCollisions()
              +---> requestAnimationFrame(globalUpdate)
```

---

*Generated from `mascot.js` source analysis.*
