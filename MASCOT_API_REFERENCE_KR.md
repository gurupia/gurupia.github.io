# 마스코트 시스템 API 레퍼런스

> 마스코트 캐릭터 시스템의 전체 API 문서입니다.
> 소스 파일: `mascot.js`

---

## 목차

- [전역 변수](#전역-변수)
- [MascotDB (IndexedDB 스토리지 매니저)](#mascotdb-indexeddb-스토리지-매니저)
- [class SoundManager (사운드 매니저)](#class-soundmanager-사운드-매니저)
- [class Particle (파티클)](#class-particle-파티클)
- [class Projectile (투사체)](#class-projectile-투사체)
- [class Mascot (마스코트)](#class-mascot-마스코트)
- [SpatialGrid (공간 분할 충돌 최적화)](#spatialgrid-공간-분할-충돌-최적화)
- [전역 함수](#전역-함수)
- [데이터 스키마 (IndexedDB)](#데이터-스키마-indexeddb)
- [AI 행동 상세](#ai-행동-상세)
- [무기 사양](#무기-사양)

---

## 전역 변수

| 변수 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `mascots` | `Array<Mascot>` | `[]` | 활성 마스코트 인스턴스 배열 |
| `projectiles` | `Array<Projectile>` | `[]` | 활성 투사체 인스턴스 배열 |
| `particles` | `Array<Particle>` | `[]` | 활성 파티클 인스턴스 배열 |
| `selectedMascotId` | `string\|null` | `null` | 현재 설정 UI에서 선택된 마스코트 ID |
| `MAX_PROJECTILES` | `number` (const) | `100` | 동시에 존재할 수 있는 최대 투사체 수 |
| `MAX_PARTICLES` | `number` (const) | `50` | 동시에 존재할 수 있는 최대 파티클 수 |
| `collisionSettings` | `object` (const) | `{ enabled: true, strength: 0.8 }` | 충돌 감지 및 반발 강도 설정 |
| `fxSettings` | `object` (const) | `{ screenShake: true, particles: true, sound: true }` | 시각/청각 효과 설정 |
| `mouseX` | `number` | `window.innerWidth / 2` | 현재 마우스 X 좌표 |
| `mouseY` | `number` | `window.innerHeight / 2` | 현재 마우스 Y 좌표 |
| `isPageVisible` | `boolean` | `true` | 페이지 가시성 상태 (탭 전환/최소화 시 `false`) |
| `isLoadingMascots` | `boolean` | `false` | 마스코트 로딩 중 플래그 (자동 저장 방지) |
| `isAdjustingSlider` | `boolean` | `false` | 슬라이더 조작 중 플래그 |
| `animationFrameId` | `number\|null` | `null` | `requestAnimationFrame` 반환 ID |

---

## MascotDB (IndexedDB 스토리지 매니저)

마스코트 데이터의 영속적 저장을 관리하는 싱글턴 객체입니다. IndexedDB를 기본 저장소로 사용하며, 오류 시 localStorage로 폴백합니다.

### 속성

| 속성 | 타입 | 값 | 설명 |
|------|------|-----|------|
| `dbName` | `string` | `'MascotStorage'` | IndexedDB 데이터베이스 이름 |
| `dbVersion` | `number` | `1` | 데이터베이스 스키마 버전 |
| `storeName` | `string` | `'mascots'` | 오브젝트 스토어 이름 |
| `db` | `IDBDatabase\|null` | `null` | 활성 데이터베이스 연결 |

### 메서드

#### `init()`

IndexedDB 연결을 초기화합니다.

```typescript
init(): Promise<IDBDatabase>
```

- 이미 연결이 존재하면 기존 연결을 반환합니다.
- 최초 호출 시 데이터베이스를 생성하고 오브젝트 스토어를 설정합니다.
- 오브젝트 스토어 키 경로: `id`

#### `save(mascotsData)`

마스코트 배열을 IndexedDB에 저장합니다.

```typescript
save(mascotsData: Array<object>): Promise<boolean>
```

- **매개변수**: `mascotsData` - 직렬화된 마스코트 데이터 배열
- **반환값**: 성공 시 `true`, 폴백 시 `false`
- 기존 데이터를 모두 삭제한 후 새 데이터를 삽입합니다.
- IndexedDB 오류 시 localStorage로 폴백하며, 이때 커스텀 이미지(`isCustom: true`)의 `image` 필드는 `null`로 설정됩니다 (용량 초과 방지).

#### `load()`

IndexedDB에서 모든 마스코트 데이터를 로드합니다.

```typescript
load(): Promise<Array<object>|null>
```

- **반환값**: 마스코트 데이터 배열 또는 오류 시 `null`
- 읽기 전용 트랜잭션을 사용합니다.

#### `migrateFromLocalStorage()`

이전 localStorage 형식에서 IndexedDB로 자동 마이그레이션합니다.

```typescript
migrateFromLocalStorage(): Promise<Array<object>|null>
```

- **반환값**: 마이그레이션된 데이터 배열 또는 데이터가 없으면 `null`
- localStorage 키 `'mascots-data'`에서 데이터를 읽어 IndexedDB에 저장합니다.
- 마이그레이션 성공 시 localStorage의 원본 데이터를 삭제합니다.

---

## class SoundManager (사운드 매니저)

Web Audio API를 사용하여 무기 효과음을 공간적으로 재생하는 클래스입니다.

### 생성자

```javascript
new SoundManager()
```

- `ctx`: AudioContext 인스턴스 (`null`로 초기화, 지연 생성)
- `pannerPool`: 패너 풀 (`Map`)
- `enabled`: 사운드 활성화 상태 (`true`)

### 전역 인스턴스

```javascript
const soundManager = new SoundManager();
```

### 메서드

#### `init()`

AudioContext를 초기화합니다.

```typescript
init(): void
```

- 지연 초기화 패턴: `ctx`가 `null`일 때만 생성합니다.
- `window.AudioContext` 또는 `window.webkitAudioContext`를 사용합니다.

#### `playSpatialSound(type, x)`

지정된 수평 위치에서 합성 사운드를 재생합니다.

```typescript
playSpatialSound(type: string, x: number): Promise<void>
```

- **매개변수**:
  - `type`: 사운드 유형
    - `'bullet'` - 총알 발사음 (square파, 150Hz→40Hz, 0.1초)
    - `'flame'` - 화염 방사음 (sawtooth파, 60Hz, 0.08초)
    - `'explosion'` - 폭발음 (triangle파, 100Hz→10Hz, 0.5초)
  - `x`: 수평 화면 위치 (`0` ~ `window.innerWidth`)
- **스테레오 패닝 계산**: `pan = (x / innerWidth) * 2 - 1`
  - `-1`: 좌측 스피커
  - `0`: 중앙
  - `+1`: 우측 스피커
- `enabled`가 `false`이거나 `fxSettings.sound`가 `false`이면 무시됩니다.
- AudioContext가 `suspended` 상태이면 자동으로 `resume()`합니다.

---

## class Particle (파티클)

시각적 이펙트용 파티클 요소입니다. 스파크 및 연기 효과에 사용됩니다.

### 생성자

```javascript
new Particle(x, y, vx, vy, color, type)
```

| 매개변수 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| `x` | `number` | - | 초기 X 위치 |
| `y` | `number` | - | 초기 Y 위치 |
| `vx` | `number` | - | X 방향 속도 |
| `vy` | `number` | - | Y 방향 속도 |
| `color` | `string\|null` | - | 색상 (현재 CSS 클래스로 관리) |
| `type` | `string` | `'spark'` | `'spark'` 또는 `'smoke'` |

### 속성

| 속성 | 타입 | 초기값 | 설명 |
|------|------|--------|------|
| `life` | `number` | `1.0` | 남은 수명 (1.0 → 0 으로 감소) |
| `decay` | `number` | `0.02 ~ 0.05` | 프레임당 수명 감소량 (무작위) |
| `element` | `HTMLDivElement` | - | DOM 요소 (CSS 클래스: `fx-particle fx-spark` 또는 `fx-particle fx-smoke`) |

- **크기**: spark = 2~5px, smoke = 5~15px (무작위)

### 메서드

#### `update()`

프레임별 물리 및 렌더링을 업데이트합니다.

```typescript
update(): void
```

- 위치 업데이트: `x += vx`, `y += vy`
- 중력 적용: `vy += 0.1`
- 수명 감소: `life -= decay`
- DOM 위치 및 투명도 업데이트
- `life <= 0`이면 `destroy()` 호출

#### `destroy()`

파티클을 제거합니다.

```typescript
destroy(): void
```

- DOM 요소 제거 (`element.remove()`)
- `particles` 전역 배열에서 제거

---

## class Projectile (투사체)

무기에서 발사되는 투사체를 나타내는 클래스입니다.

### 생성자

```javascript
new Projectile(x, y, vx, vy, type, targetMascot?)
```

| 매개변수 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| `x` | `number` | - | 초기 X 위치 |
| `y` | `number` | - | 초기 Y 위치 |
| `vx` | `number` | - | X 방향 속도 |
| `vy` | `number` | - | Y 방향 속도 |
| `type` | `string` | - | `'bullet'` \| `'flame'` \| `'grenade'` \| `'missile'` |
| `targetMascot` | `Mascot\|null` | `null` | 미사일 유도 대상 마스코트 인스턴스 |

### 속성

| 속성 | 타입 | 설명 |
|------|------|------|
| `lifeTime` | `number` | 현재 경과 프레임 수 (0부터 시작) |
| `maxLifeTime` | `number` | 최대 수명 (flame: `30`, 기타: `200`) |
| `alive` | `boolean` | 활성 상태 |
| `element` | `HTMLDivElement` | DOM 요소 (CSS 클래스: `projectile {type}`) |

### 메서드

#### `update()`

프레임별 투사체 업데이트를 수행합니다.

```typescript
update(): void
```

- `alive`가 `false`이면 즉시 반환
- **미사일 유도**: `type === 'missile'`이고 `targetMascot`이 존재할 때
  - 대상까지의 방향 벡터를 계산하여 속도에 `0.5`씩 가산
  - 최대 속도를 `10`으로 제한
  - 요소를 진행 방향으로 회전 (`transform: rotate`)
- **이동**: `x += vx`, `y += vy`
- **수명 확인**: `lifeTime > maxLifeTime`이면 `destroy()` 호출
- **타격 검출**: 모든 마스코트에 대해 거리 기반 충돌 검사
  - 화염은 5프레임마다 검사 (`lifeTime % 5 === 0`)
  - 수류탄 충돌 시 `explode()` 호출
  - 기타 투사체는 타격 자국(`'hole'` 또는 `'scorch'`) 생성 + 스파크 파티클

#### `explode()`

수류탄 폭발을 처리합니다.

```typescript
explode(): void
```

- 폭발 이펙트 DOM 요소 생성 (500ms 후 제거)
- **폭발 반경**: `100px`
- 반경 내 모든 마스코트에 대해:
  - `'scorch'` 타격 자국 생성
  - 폭발 중심에서 반대 방향으로 밀어냄 (힘: `10`)
- `createExplosionFX()` 호출 (15개 스파크 파티클 + 화면 흔들림)
- `soundManager.playSpatialSound('explosion', x)` 호출
- `destroy()` 호출

#### `destroy()`

투사체를 제거합니다.

```typescript
destroy(): void
```

- 중복 호출 방지 (`alive` 확인)
- `alive`를 `false`로 설정
- DOM 요소 제거
- `projectiles` 전역 배열에서 제거

---

## class Mascot (마스코트)

화면 위를 돌아다니는 마스코트 캐릭터의 핵심 클래스입니다.

### 생성자

```javascript
new Mascot(id, config)
```

| 매개변수 | 타입 | 설명 |
|----------|------|------|
| `id` | `string` | 고유 마스코트 ID |
| `config` | `object` | 설정 객체 (아래 참조) |

#### config 속성

| 속성 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `x` | `number` | `50 + random * (innerWidth - 200)` | 초기 X 위치 |
| `y` | `number` | `50 + random * (innerHeight - 200)` | 초기 Y 위치 |
| `vx` | `number` | `(random - 0.5) * 2` | 초기 X 속도 |
| `vy` | `number` | `(random - 0.5) * 2` | 초기 Y 속도 |
| `size` | `number` | `64` | 픽셀 크기 |
| `isCustom` | `boolean` | `false` | 커스텀 업로드 이미지 여부 |
| `image` | `string` | `'mascot.png'` | 이미지 소스 URL 또는 data URI |
| `disabled` | `boolean` | `false` | 비활성화 여부 |
| `noFloat` | `boolean` | `false` | 부유 애니메이션 비활성화 |
| `effect3d` | `boolean` | `false` | 호버 시 3D 틸트 효과 |
| `actionMode` | `boolean` | `false` | 무기 발사 모드 활성화 |
| `weaponType` | `string` | `'machinegun'` | 무기 유형 |
| `aiType` | `string` | `'neutral'` | AI 행동 유형 |

### 인스턴스 속성

| 속성 | 타입 | 설명 |
|------|------|------|
| `id` | `string` | 고유 식별자 |
| `element` | `HTMLDivElement\|null` | DOM 요소 |
| `x`, `y` | `number` | 현재 위치 |
| `vx`, `vy` | `number` | 현재 속도 |
| `speed` | `number` | 기본 이동 속도 (`1.5`) |
| `runningSpeed` | `number` | 도주 시 이동 속도 (`2.5`) |
| `isRunning` | `boolean` | 도주 상태 |
| `clickCount` | `number` | 누적 클릭 횟수 |
| `lastClickTime` | `number` | 마지막 클릭 타임스탬프 |
| `isCustom` | `boolean` | 커스텀 이미지 여부 |
| `size` | `number` | 현재 픽셀 크기 |
| `isDisabled` | `boolean` | 비활성화 상태 |
| `isFloatDisabled` | `boolean` | 부유 애니메이션 비활성화 상태 |
| `is3DEffectEnabled` | `boolean` | 3D 효과 활성화 상태 |
| `isActionModeEnabled` | `boolean` | 액션 모드 활성화 상태 |
| `weaponType` | `string` | 현재 무기 유형 |
| `currentImage` | `string` | 현재 이미지 소스 |
| `aiType` | `string` | AI 행동 유형 |
| `targetX`, `targetY` | `number` | AI 이동 목표 좌표 |
| `lastAIUpdate` | `number` | 마지막 AI 업데이트 타임스탬프 |
| `messages` | `Array<string>` | 일반 클릭 응답 메시지 (한국어) |
| `easterEggMessages` | `Array<string>` | 20회 이상 클릭 시 이스터에그 메시지 |
| `shootInterval` | `number\|null` | 자동 발사 인터벌 ID |
| `resizeHandler` | `Function` | 리사이즈 이벤트 핸들러 참조 |

#### 메시지 목록

**일반 메시지** (`messages`):
```javascript
[
    "찌르지 마!", "아야! 😣", "왜 그래!", "그만해! 🙅", "간지러워!",
    "놔둬! 😤", "싫어!", "도망가자! 🏃", "못 잡아! 😝", "헤헤 😄"
]
```

**이스터에그 메시지** (`easterEggMessages`, 20회 이상 클릭 시):
```javascript
[
    "정말 심심하구나... 😅", "이제 그만 좀... 🥺", "너무 많이 찔렀어! 💢",
    "화났어! 😡", "...무시할래 😑", "마지막으로 참는다. 한 번만 더 찔러봐.",
    "Fucking!!", "그만 누르라고 했다...", "마지막 경고!!", "너의 끈기에 감탄했어~"
]
```

### 메서드

#### `init()`

DOM 요소를 생성하고 이벤트 리스너를 설정합니다.

```typescript
init(): void
```

- `div.mascot` 요소를 생성하여 `document.body`에 추가
- `dataset.mascotId`에 ID 설정
- `click`, `mousedown`, `mousemove` 이벤트 리스너 등록
- `resize` 윈도우 이벤트 리스너 등록
- `updateImage()`, `setSize()`, `updateVisibility()` 호출

#### `destroy()`

마스코트를 완전히 제거합니다.

```typescript
destroy(): void
```

- DOM 요소 제거
- `shootInterval` 해제 (`clearInterval`)
- `resize` 이벤트 리스너 제거
- `element`를 `null`로 설정

#### `onClick(e)`

마스코트 클릭 이벤트를 처리합니다.

```typescript
onClick(e: MouseEvent): void
```

- 액션 모드 활성화 시 `fireWeapon()`만 호출하고 반환
- `clickCount` 증가 (500ms 이내 연속 클릭 시 +2 보너스)
- 클릭 위치의 반대 방향으로 `runningSpeed`로 도주
- `running` CSS 클래스 추가
- **20회 초과 클릭**: 이스터에그 메시지 표시
- **20회 이하 클릭**: 일반 메시지 표시
- 2초 후 도주 상태 해제, 속도를 무작위로 재설정

#### `updateVisibility()`

`isDisabled` 속성에 따라 표시/숨김을 제어합니다.

```typescript
updateVisibility(): void
```

- `isDisabled`가 `true`이면 `display: none`, `false`이면 `display: block`
- `update3DEffects()` 호출

#### `update3DEffects()`

3D 틸트 효과의 CSS 클래스를 토글합니다.

```typescript
update3DEffects(): void
```

- `is3DEffectEnabled`이고 `!isDisabled`이면 `'effect-3d'` 클래스 추가
- 그렇지 않으면 클래스 제거 및 `--tilt-x`, `--tilt-y` CSS 변수를 `0deg`로 초기화

#### `onMouseMove(e)`

커서 위치 기반으로 3D 틸트 각도를 계산합니다.

```typescript
onMouseMove(e: MouseEvent): void
```

- 3D 효과가 비활성화되거나 마스코트가 비활성화이면 무시
- **틸트 계산**:
  - `tiltX = (mouseY / (height/2)) * -20` (도)
  - `tiltY = (mouseX / (width/2)) * 20` (도)
- CSS 변수 `--tilt-x`, `--tilt-y`에 값 설정

#### `updateAnimation()`

현재 상태에 따른 애니메이션을 설정합니다.

```typescript
updateAnimation(): void
```

- 커스텀 이미지일 때: 부유 비활성화 시 `'none'`, 활성화 시 `'float 2s ease-in-out infinite'`
- 비커스텀 이미지일 때: CSS 기본 애니메이션 사용 (빈 문자열)
- 5% 확률로 미세한 속도 변화 추가 (자연스러운 움직임)

#### `startShooting(e)`

자동 발사 인터벌을 시작합니다.

```typescript
startShooting(e?: MouseEvent): void
```

- 이미 발사 중이면 무시 (`shootInterval` 확인)
- 즉시 `fireWeapon()` 1회 호출
- **발사 속도 결정**:
  - machinegun: `100ms` 간격
  - flamethrower: `80ms` 간격
  - 기타 (shotgun, grenade, missile): 단발 (인터벌 없음)

#### `stopShooting()`

발사 인터벌을 해제합니다.

```typescript
stopShooting(): void
```

- `clearInterval(shootInterval)` 호출
- `shootInterval`을 `null`로 설정

#### `setActionMode(enabled)`

액션/무기 모드를 토글합니다.

```typescript
setActionMode(enabled: boolean): void
```

- `isActionModeEnabled` 설정
- `stopShooting()` 호출 (기존 발사 중단)
- 선택된 마스코트의 무기 선택 UI 표시/숨김
- `updateVisibility()` 호출

#### `setWeaponType(type)`

무기 유형을 변경합니다.

```typescript
setWeaponType(type: string): void
```

- 유효한 값: `'machinegun'` | `'shotgun'` | `'flamethrower'` | `'grenade'` | `'missile'`
- 발사 중이면 중단 후 새 무기로 재시작

#### `setAIType(type)`

AI 행동 유형을 변경합니다.

```typescript
setAIType(type: string): void
```

- 유효한 값: `'neutral'` | `'curious'` | `'shy'` | `'aggressive'`

#### `fireWeapon()`

현재 `weaponType`에 따라 해당 발사 메서드를 호출합니다.

```typescript
fireWeapon(): void
```

- `element`가 없거나, 액션 모드가 꺼져있거나, 비활성화이면 `stopShooting()` 후 반환
- 마스코트 중심 좌표를 계산하여 무기별 메서드에 전달:
  - `'machinegun'` → `fireBullet()`
  - `'shotgun'` → `fireBullet()` x 5 (각도 오프셋: -0.4, -0.2, 0, +0.2, +0.4 rad)
  - `'flamethrower'` → `fireFlame()`
  - `'grenade'` → `fireGrenade()`
  - `'missile'` → `fireMissile()`

#### `fireBullet(x, y, angleOffset?)`

단발 총알을 발사합니다.

```typescript
fireBullet(x: number, y: number, angleOffset?: number): void
```

- **매개변수**:
  - `x`, `y`: 발사 원점
  - `angleOffset`: 각도 오프셋 (기본값: `0`, 산탄총에서 사용)
- 탄속: `15`
- 약간의 무작위 각도 변화 (`±0.05 rad`)
- 사운드 재생: `'bullet'`
- 50% 확률로 스파크 파티클 생성

#### `fireFlame(x, y)`

화염 투사체를 발사합니다.

```typescript
fireFlame(x: number, y: number): void
```

- 탄속: `5 ~ 10` (무작위)
- 확산 각도: `±0.25 rad` (위쪽 방향 기준)
- 사운드 재생: `'flame'`

#### `fireGrenade(x, y)`

수류탄 투사체를 발사합니다.

```typescript
fireGrenade(x: number, y: number): void
```

- 탄속: `8`
- 확산 각도: `±0.1 rad` (위쪽 방향 기준)
- 접촉 시 `Projectile.explode()` 트리거

#### `fireMissile(x, y)`

유도 미사일을 발사합니다.

```typescript
fireMissile(x: number, y: number): void
```

- 초기 탄속: `5` (위쪽 방향)
- 비활성화되지 않은 다른 마스코트 중 무작위 대상 선택
- 대상이 없으면 비유도 미사일로 발사

#### `createImpact(type, x, y)`

마스코트 요소에 타격 자국을 추가합니다.

```typescript
createImpact(type: string, x: number, y: number): void
```

- **매개변수**:
  - `type`: `'hole'` (총알 자국) 또는 `'scorch'` (화염/폭발 자국)
  - `x`, `y`: 마스코트 요소 내 상대 좌표
- CSS 클래스: `impact-mark impact-{type}`
- 3초 후 자동 제거

#### `showSpeechBubble(message)`

마스코트 위에 말풍선을 표시합니다.

```typescript
showSpeechBubble(message: string): void
```

- 기존 말풍선이 있으면 먼저 제거
- CSS 클래스: `speech-bubble`
- 마스코트 상단 중앙에 위치 (`bottom: 100%`, `translateX(-50%)`, `margin-bottom: 12px`)
- 3초 후 페이드아웃 시작 (`fade-out` 클래스), 300ms 후 DOM에서 제거

#### `updateImage(src, isCustom)`

마스코트 이미지를 변경합니다.

```typescript
updateImage(src: string, isCustom: boolean): void
```

- **커스텀 이미지** (`isCustom: true`):
  - `custom-image` CSS 클래스 추가
  - `<img>` 요소를 생성하여 마스코트 요소에 삽입
  - `draggable = false` 설정
- **기본 이미지** (`isCustom: false`):
  - `background-image` CSS 속성으로 설정
  - `background-size: contain`, `background-position: center`
- `setSize()`, `updateAnimation()` 호출
- 로딩 중이 아니면 `saveMascotsToStorage()` 자동 호출

#### `setSize(size)`

마스코트의 픽셀 크기를 업데이트합니다.

```typescript
setSize(size: number): void
```

- `size`를 정수로 변환 (`parseInt`)
- 너비 설정: `{size}px`
- 높이: 커스텀 이미지이면 `'auto'`, 기본 이미지이면 `{size}px`

#### `updatePosition()`

메인 업데이트 루프에서 호출되는 위치 업데이트 메서드입니다.

```typescript
updatePosition(): void
```

1. **AI 로직** (100ms 간격):
   - 액션 모드 또는 도주 중이면 AI 건너뜀
   - 마우스까지 거리 계산 → AI 유형에 따라 속도 조정
2. **이동**: 속도 * 속도 배율에 따라 위치 변경
3. **경계 확인**: 뷰포트 밖으로 나가면 속도 반전 및 위치 클램핑
4. **방향 전환**: `vx < 0`이면 `flipped` CSS 클래스 추가
5. **무작위 배회**: 1% 확률로 속도 변화 (최대 속도 `2`로 제한)
6. **DOM 업데이트**: `left`, `top` CSS 속성 설정

#### `getCenter()`

마스코트의 중심 좌표를 반환합니다.

```typescript
getCenter(): { x: number, y: number }
```

- `x`: `this.x + width / 2`
- `y`: `this.y + height / 2`

#### `getRadius()`

충돌 검사용 반경을 반환합니다.

```typescript
getRadius(): number
```

- 계산: `(width + height) / 4`

#### `checkCollisionWith(other)`

다른 마스코트와의 원형 충돌을 검사합니다.

```typescript
checkCollisionWith(other: Mascot): boolean
```

- 같은 마스코트이거나 어느 쪽이든 비활성화이면 `false`
- 두 마스코트 중심 간 거리 < 두 반경의 합이면 `true`

#### `handleCollision(other)`

충돌 응답을 처리합니다 (탄성 충돌).

```typescript
handleCollision(other: Mascot): void
```

- `collisionSettings.enabled`가 `false`이면 무시
- **긴밀 겹침** (거리 < 10px): 무작위 방향으로 강한 분리 (힘: `4`, 변위: `10px`)
- **일반 충돌**:
  - 질량 계산: `size / 64` (64px 기준 질량 1)
  - 탄성 충돌 공식으로 속도 교환
  - 반발 계수: `collisionSettings.strength` (`0.8`)
  - 겹침 보정: 겹친 거리만큼 양쪽을 밀어냄

#### `onResize()`

뷰포트 리사이즈 시 위치를 클램핑합니다.

```typescript
onResize(): void
```

- 현재 위치가 새 뷰포트 경계를 초과하면 경계 내로 조정

---

## SpatialGrid (공간 분할 충돌 최적화)

O(N^2) 충돌 검사를 최적화하기 위한 공간 해시 그리드 싱글턴 객체입니다.

### 속성

| 속성 | 타입 | 값 | 설명 |
|------|------|-----|------|
| `cellSize` | `number` | `150` | 그리드 셀 크기 (픽셀). 최대 마스코트 크기 이상이어야 함 |
| `grid` | `Map<string, Array<Mascot>>` | `new Map()` | 셀 키 → 마스코트 배열 매핑 |

### 메서드

#### `clear()`

그리드를 초기화합니다.

```typescript
clear(): void
```

- `grid.clear()` 호출

#### `getCellKey(x, y)`

좌표를 셀 키 문자열로 변환합니다.

```typescript
getCellKey(x: number, y: number): string
```

- **반환값**: `"cellX,cellY"` 형식 문자열
- 계산: `cellX = Math.floor(x / cellSize)`, `cellY = Math.floor(y / cellSize)`

#### `insert(mascot)`

마스코트를 해당 셀에 추가합니다.

```typescript
insert(mascot: Mascot): void
```

- 비활성화된 마스코트는 무시 (`isDisabled` 확인)

#### `getNearby(mascot)`

현재 셀 및 인접 8개 셀에 있는 마스코트를 반환합니다.

```typescript
getNearby(mascot: Mascot): Array<Mascot>
```

- 3x3 영역 (자신의 셀 + 상하좌우 및 대각선 8개 셀) 검색
- 자기 자신도 포함될 수 있음 (호출부에서 필터링 필요)

---

## 전역 함수

### `createExplosionFX(x, y)`

폭발 시각 효과를 생성합니다.

```typescript
createExplosionFX(x: number, y: number): void
```

- `fxSettings.particles`가 `false`이면 무시
- 15개 스파크 파티클을 무작위 방향으로 생성 (속도: 0~8)
- `fxSettings.screenShake`가 `true`이면 `body`에 `'shake'` CSS 클래스 적용 (300ms)
- 리플로우 강제 트리거로 연속 흔들림 지원 (`void document.body.offsetWidth`)

### `generateMascotId()`

고유 마스코트 ID를 생성합니다.

```typescript
generateMascotId(): string
```

- **형식**: `"mascot_" + Date.now() + "_" + 랜덤9자리`
- **예시**: `"mascot_1714589201234_abc123def"`

### `getMascotById(id)`

ID로 마스코트를 조회합니다.

```typescript
getMascotById(id: string): Mascot | undefined
```

- `mascots` 배열에서 `Array.find()`로 검색

### `checkAllCollisions()`

공간 그리드를 사용하여 모든 마스코트 간 충돌을 검사합니다.

```typescript
checkAllCollisions(): void
```

- `collisionSettings.enabled`가 `false`이거나 마스코트가 2개 미만이면 무시
- **처리 순서**:
  1. `SpatialGrid.clear()`
  2. 모든 마스코트를 그리드에 삽입
  3. 각 마스코트의 인접 셀 내 마스코트와 충돌 검사
- 같은 쌍의 중복 검사 방지 (ID 기반 `Set` 사용)

### `addMascot(config, skipSave?)`

새 마스코트를 생성하고 등록합니다.

```typescript
addMascot(config?: object, skipSave?: boolean): Mascot
```

- **매개변수**:
  - `config`: Mascot 생성자 config (기본값: `{}`)
  - `skipSave`: `true`이면 자동 저장 건너뜀 (기본값: `false`)
- `config.id`가 있으면 사용, 없으면 `generateMascotId()`로 생성
- `mascots` 배열에 추가
- `isLoadingMascots`가 `false`이고 `skipSave`가 `false`이면 `saveMascotsToStorage()` 호출

### `removeMascot(id)`

마스코트를 파괴하고 제거합니다.

```typescript
removeMascot(id: string): boolean
```

- **반환값**: 제거 성공 시 `true`, 해당 ID가 없으면 `false`
- `Mascot.destroy()` 호출
- `mascots` 배열에서 제거
- 선택된 마스코트가 삭제되면 첫 번째 마스코트로 선택 변경
- `saveMascotsToStorage()` 호출

### `saveMascotsToStorage()`

모든 마스코트를 직렬화하여 IndexedDB에 저장합니다.

```typescript
saveMascotsToStorage(): void
```

- 각 마스코트에서 저장할 속성:
  `id`, `image`, `isCustom`, `size`, `x`, `y`, `vx`, `vy`, `disabled`, `noFloat`, `effect3d`, `actionMode`, `weaponType`, `aiType`
- `MascotDB.save()` 비동기 호출 (오류 시 콘솔 경고)

### `loadMascotsFromStorage()`

IndexedDB에서 마스코트 데이터를 로드합니다.

```typescript
loadMascotsFromStorage(): Promise<void>
```

- `isLoadingMascots` 플래그를 `true`로 설정 (자동 저장 방지)
- 기존 마스코트를 모두 파괴
- **로드 순서**:
  1. IndexedDB에서 로드 시도
  2. 데이터가 없으면 localStorage에서 마이그레이션 시도
  3. 마이그레이션 데이터도 없으면 기본 마스코트 1개 생성
- 첫 번째 마스코트를 `selectedMascotId`로 설정
- `isLoadingMascots`를 `false`로 복원

### `globalUpdate()`

메인 애니메이션 프레임 루프입니다.

```typescript
globalUpdate(): void
```

- `isPageVisible`이 `false`이면 업데이트 건너뜀 (CPU/배터리 절약)
- **업데이트 순서**:
  1. **투사체 정리**: `MAX_PROJECTILES` 초과 시 오래된 것부터 제거
  2. **투사체 업데이트**: 모든 투사체 `update()` 호출
  3. **파티클 정리**: `MAX_PARTICLES` 초과 시 오래된 것부터 제거
  4. **파티클 업데이트**: 모든 파티클 `update()` 호출
  5. **마스코트 업데이트**: 비활성화되지 않은 마스코트의 `updatePosition()` 호출
  6. **충돌 검사**: `checkAllCollisions()` 호출
- `requestAnimationFrame(globalUpdate)` 으로 다음 프레임 예약

### `setupGlobalMascotUI()`

설정 모달의 UI 컨트롤 및 이벤트 바인딩을 초기화합니다.

```typescript
setupGlobalMascotUI(): void
```

- 모달 (`#mascot-modal`) 및 설정 버튼 (`#mascot-settings-btn`) 확인
- **탭 시스템**: `.tab-btn` 요소들의 클릭 이벤트로 탭 전환
- **마스코트 목록 UI**: 선택, 삭제 기능
- **컨트롤 바인딩**:
  - 크기 슬라이더 (`#mascot-size`) / 입력 (`#mascot-size-input`)
  - 비활성화 체크박스 (`#mascot-disable`)
  - 부유 비활성화 (`#mascot-no-float`)
  - 3D 효과 (`#mascot-effect-3d`)
  - 액션 모드 (`#mascot-action-mode`)
  - 무기 선택 (`#mascot-weapon`)
  - AI 유형 (`#mascot-ai-type`)
  - FX 설정 (`#fx-screen-shake`, `#fx-particles`, `#fx-sound`)
  - 이미지 업로드 (`#mascot-upload`)
- 마스코트 추가 버튼 (`#add-mascot-btn`)

### `initMascotSystem()`

마스코트 시스템 부트스트랩 함수입니다.

```typescript
initMascotSystem(): Promise<void>
```

- **초기화 순서**:
  1. `loadMascotsFromStorage()` - 저장된 데이터 로드
  2. `setupGlobalMascotUI()` - UI 설정
  3. 전역 이벤트 리스너 등록:
     - `mouseup`: 모든 마스코트 발사 중단
     - `blur`: 모든 마스코트 발사 중단
     - `contextmenu`: 모든 마스코트 발사 중단
  4. `globalUpdate()` - 애니메이션 루프 시작
- 페이지 로드 완료 시 자동 호출 (`DOMContentLoaded` 또는 `load` 이벤트)

---

## 데이터 스키마 (IndexedDB)

IndexedDB에 저장되는 마스코트 데이터 구조입니다.

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

### 필드 설명

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `id` | `string` | 예 | 고유 식별자 (키 경로) |
| `image` | `string` | 예 | 이미지 URL 또는 data URI. 커스텀 이미지는 `data:image/png;base64,...` 형식 |
| `isCustom` | `boolean` | 예 | 커스텀 업로드 이미지 여부 |
| `size` | `number` | 예 | 픽셀 크기 |
| `x` | `number` | 예 | X 좌표 (소수점 포함) |
| `y` | `number` | 예 | Y 좌표 (소수점 포함) |
| `vx` | `number` | 예 | X 속도 |
| `vy` | `number` | 예 | Y 속도 |
| `disabled` | `boolean` | 예 | 비활성화 상태 |
| `noFloat` | `boolean` | 예 | 부유 애니메이션 비활성화 |
| `effect3d` | `boolean` | 예 | 3D 틸트 효과 활성화 |
| `actionMode` | `boolean` | 예 | 액션/무기 모드 활성화 |
| `weaponType` | `string` | 예 | 무기 유형 |
| `aiType` | `string` | 예 | AI 행동 유형 |

### localStorage 폴백 스키마

IndexedDB 오류 시 localStorage에 저장되는 데이터는 동일하지만, **커스텀 이미지의 `image` 필드가 `null`로 설정**됩니다 (용량 초과 방지).

```javascript
// localStorage 키: 'mascots-data'
// 저장 형식: JSON.stringify(배열)
localStorage.setItem('mascots-data', JSON.stringify(dataWithoutImages));
```

---

## AI 행동 상세

마스코트의 AI 행동은 마우스 커서와의 거리에 따라 결정됩니다.

| 유형 | 키 | 트리거 거리 | 이동 방향 | 속도 수정자 | 설명 |
|------|-----|------------|----------|-----------|------|
| 중립 | `'neutral'` | 해당 없음 | 무작위 배회 | `0` (커서 영향 없음) | 커서에 반응하지 않고 무작위로 돌아다님 |
| 호기심 | `'curious'` | 50px ~ 400px | 커서 방향 | 틱당 `+0.1` | 커서가 가까우면 접근, 너무 가까우면(< 50px) 무시 |
| 수줍음 | `'shy'` | < 200px | 커서 반대 방향 | 틱당 `+0.2` | 커서가 가까워지면 도망 |
| 공격적 | `'aggressive'` | < 500px | 커서 방향 | 틱당 `+0.3` | 넓은 범위에서 커서를 적극적으로 추적 |

### AI 동작 세부 사항

- **틱 간격**: `100ms` (`Date.now()` 기반)
- **우선순위**: 액션 모드 또는 클릭 도주 상태이면 AI 로직 무시
- **속도 수정 방식**: 커서 방향의 단위 벡터에 수정자를 곱하여 `vx`, `vy`에 가산
- **속도 상한**: `updatePosition()` 내 1% 확률 속도 정규화에서 최대 `2`로 제한

```javascript
// AI 속도 수정 예시 (curious 타입)
const ang = Math.atan2(mouseY - this.y, mouseX - this.x);
this.vx += Math.cos(ang) * 0.1;
this.vy += Math.sin(ang) * 0.1;
```

---

## 무기 사양

| 무기 | 키 | 발사 속도 | 탄속 | 투사체 수명 | 특수 효과 |
|------|-----|----------|------|------------|----------|
| 기관총 | `'machinegun'` | 100ms | 15 | 200프레임 | 단발, 약간의 무작위 각도 변화 |
| 산탄총 | `'shotgun'` | 단발 | 15 | 200프레임 | 5발 동시 확산 (각 ±0.2 rad 간격) |
| 화염방사기 | `'flamethrower'` | 80ms | 5~10 | 30프레임 | 근거리 범위 데미지, 5프레임마다 타격 검사 |
| 수류탄 | `'grenade'` | 단발 | 8 | 200프레임 | 접촉 시 폭발, 100px 폭발 반경, 밀어내기 |
| 미사일 | `'missile'` | 단발 | 초기 5 (최대 10) | 200프레임 | 무작위 다른 마스코트 유도, 유도 가속 0.5/프레임 |

### 무기 동작 상세

#### 기관총 (`machinegun`)
- 마우스 누르고 있는 동안 `100ms` 간격으로 연속 발사
- 각 총알에 `±0.05 rad` 무작위 확산
- `'bullet'` 사운드 재생
- 50% 확률로 머즐 플래시 스파크

#### 산탄총 (`shotgun`)
- 마우스 클릭 시 5발 동시 발사
- 확산 패턴: `-0.4`, `-0.2`, `0`, `+0.2`, `+0.4` rad
- 각 총알에 추가 `±0.05 rad` 무작위 변화

#### 화염방사기 (`flamethrower`)
- 마우스 누르고 있는 동안 `80ms` 간격으로 연속 발사
- 수명이 짧아 (`30프레임`) 근거리 전용
- 화염은 관통하며, 5프레임마다 타격 검사
- `'scorch'` 타격 자국 생성

#### 수류탄 (`grenade`)
- 마우스 클릭 시 단발 발사
- 마스코트에 접촉하면 `explode()` 트리거
- 폭발 반경 `100px` 내 모든 마스코트에 `'scorch'` 자국 + 밀어내기 (힘: `10`)
- 폭발 FX: 15개 스파크 파티클 + 화면 흔들림 + 폭발 사운드

#### 미사일 (`missile`)
- 마우스 클릭 시 단발 발사
- 비활성화되지 않은 다른 마스코트 중 무작위 대상 선택
- 유도 가속: 프레임당 `0.5` (대상 방향으로)
- 최대 속도: `10`
- 투사체가 진행 방향으로 회전 (`transform: rotate`)

---

## 페이지 가시성 최적화

페이지가 보이지 않을 때 (탭 전환, 최소화 등) 애니메이션 루프가 업데이트를 건너뛰어 CPU 및 배터리를 절약합니다.

```javascript
document.addEventListener('visibilitychange', () => {
    isPageVisible = !document.hidden;
    window.dispatchEvent(new CustomEvent('pageVisibilityChange', {
        detail: { visible: isPageVisible }
    }));
});
```

- `'pageVisibilityChange'` 커스텀 이벤트를 통해 다른 시스템 (예: Matrix Rain)에 가시성 변경을 알립니다.

---

## 전역 이벤트 리스너

| 이벤트 | 대상 | 동작 |
|--------|------|------|
| `mousemove` | `window` | `mouseX`, `mouseY` 업데이트 |
| `mouseup` | `window` | 모든 마스코트 `stopShooting()` |
| `blur` | `window` | 모든 마스코트 `stopShooting()` |
| `contextmenu` | `window` | 모든 마스코트 `stopShooting()` |
| `visibilitychange` | `document` | `isPageVisible` 업데이트 |
| `resize` | `window` | 각 마스코트의 `onResize()` 호출 |
| `load` / `readyState` | `window` | `initMascotSystem()` 호출 |

---

## 시스템 초기화 흐름

```
페이지 로드
  └─ initMascotSystem()
       ├─ loadMascotsFromStorage()
       │    ├─ IndexedDB에서 로드 시도
       │    ├─ 데이터 없으면 localStorage 마이그레이션 시도
       │    └─ 모두 실패 시 기본 마스코트 1개 생성
       ├─ setupGlobalMascotUI()
       │    ├─ 탭 시스템 초기화
       │    ├─ 마스코트 목록 UI 생성
       │    └─ 컨트롤 이벤트 바인딩
       ├─ 전역 이벤트 리스너 등록
       │    ├─ mouseup → stopShooting
       │    ├─ blur → stopShooting
       │    └─ contextmenu → stopShooting
       └─ globalUpdate() (애니메이션 루프 시작)
            ├─ 투사체 정리 및 업데이트
            ├─ 파티클 정리 및 업데이트
            ├─ 마스코트 위치 업데이트
            ├─ 충돌 검사
            └─ requestAnimationFrame(globalUpdate)
```
