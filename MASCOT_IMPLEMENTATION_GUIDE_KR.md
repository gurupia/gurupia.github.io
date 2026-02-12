# 📘 마스코트 시스템 기술 참조 매뉴얼

## 1. 시스템 아키텍처

마스코트 시스템은 외부 프레임워크 의존성 없이 DOM 상에서 작동하는 독립형 JavaScript 모듈(`mascot.js`)입니다. 중앙 업데이트 루프를 가진 객체 지향 디자인 패턴을 따릅니다.

### 핵심 클래스 (Core Classes)

| 클래스 | 설명 | 주요 역할 |
|-------|-------------|----------------------|
| **`Mascot`** | 메인 엔티티 | 이동, AI 상태, 애니메이션, 충돌, 렌더링. |
| **`Projectile`** | 마스코트가 발사하는 무기 | 궤적 계산, 타격 감지, 수명 관리. |
| **`Particle`** | 시각 효과(FX) 요소 | 물리 기반 움직임, 페이딩(Fading), DOM 정리. |
| **`SoundManager`** | 오디오 엔진 | Web Audio API 관리, 실시간 합성, 스테레오 패닝. |

---

## 2. 컴포넌트 상세

### 2.1 마스코트 엔티티 (`class Mascot`)
각 마스코트는 고유한 상태와 속성을 가진 독립적인 인스턴스입니다.

#### **속성 (Properties)**
- `id`: 고유 식별자 (문자열).
- `x, y`: 현재 좌표 (좌상단 기준).
- `vx, vy`: 속도 벡터.
- `aiType`: 행동 성격 (`neutral`, `curious`, `shy`, `aggressive`).
- `weaponType`: 현재 장착된 무기 (`machinegun`, `shotgun`, 등).

#### **행동 AI (State Machine)**
AI 로직은 `updatePosition()` 내에서 실행되며 `aiType`에 따라 기본 이동을 재정의합니다.
- **Neutral (중립)**: 벽 튕기기를 포함한 무작위 배회.
- **Curious (호기심)**: 커서와의 거리가 > 50px & < 400px 일 때 커서 방향으로 벡터 계산.
- **Shy (수줍음)**: 커서와의 거리가 < 200px 일 때 커서 *반대* 방향으로 벡터 계산.
- **Aggressive (공격적)**: 커서와의 거리가 < 500px 일 때 커서 방향으로 고속 벡터 계산.

### 2.2 시각 효과 시스템

#### **파티클 엔진 (`class Particle`)**
- Canvas 컨텍스트 전환 오버헤드를 피하기 위해 DOM 요소(`div.fx-particle`)를 사용합니다.
- **물리 (Physics)**: 매 프레임마다 중력(`vy += 0.1`)과 마찰력(`decay`)을 적용합니다.
- **수명주기 (Lifecycle)**: `life <= 0`이 되면 자동으로 요소를 제거합니다.

#### **화면 흔들림 (Screen Shake)**
- CSS 애니메이션: `@keyframes screen-shake`
- `Projectile.explode()`가 `createExplosionFX()`를 호출할 때 트리거됩니다.
- 구현: `document.body`에 `.shake` 클래스를 300ms 동안 추가합니다.

### 2.3 공간 오디오 (`class SoundManager`)
- **기술**: Web Audio API (외부 에셋 불필요).
- **PannerNode**: 화면 위치에 따른 실시간 스테레오 패닝.
  - `pan.value = (x / window.innerWidth) * 2 - 1` (-1 왼쪽 ~ +1 오른쪽).
- **합성 (Synthesis)**:
  - `Bullet`: 지수적 주파수 램프를 가진 사각파 (레이저 느낌).
  - `Flame`: 노이즈 특성을 가진 톱니파.
  - `Explosion`: 급격한 주파수 하강을 가진 삼각파.

---

## 3. 데이터 영속성 (`IndexedDB`)

설정은 **IndexedDB**를 사용하여 자동으로 저장됩니다. 이전 버전의 localStorage보다 더 큰 용량과 성능을 제공합니다.

> **참고**: 이전 버전은 5-10MB 제한이 있는 localStorage를 사용했습니다. 현재 시스템은 IndexedDB를 사용하며, localStorage의 기존 데이터는 자동으로 마이그레이션됩니다.

**스토리지 매니저** (`MascotDB`):
- `MascotDB.save(data)`: IndexedDB에 비동기 저장
- `MascotDB.load()`: IndexedDB에서 비동기 로드
- `MascotDB.migrateFromLocalStorage()`: 기존 localStorage 데이터 자동 마이그레이션

**스키마 구조**:
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

## 4. 설정 상수

시스템 제한 및 물리 매개변수는 `mascot.js` 상단에 정의되어 있습니다.

```javascript
const MAX_PROJECTILES = 100;     // DOM 지연 방지를 위한 최대 활성 탄환 수
const MAX_PARTICLES = 50;        // 최대 시각 효과 파티클 수
const collisionSettings = { 
    enabled: true, 
    strength: 0.8                // 탄성 계수 (0.0 - 1.0)
};
const fxSettings = {             // 전역 토글
    screenShake: true,
    particles: true,
    sound: true
};
```

---

## 5. 전역 이벤트 루프

`globalUpdate()` 함수는 `requestAnimationFrame`을 사용하여 전체 시스템을 구동합니다.

1. **발사체 업데이트**: 탄환 이동, 충돌 확인, 소멸된 탄환 제거.
2. **파티클 업데이트**: 물리 적용, 페이드 아웃, 소멸된 파티클 제거.
3. **마스코트 업데이트**: 속도 적용, AI 로직 실행, 벽 충돌 처리.
4. **충돌 체크**: 공간 분할을 통한 효율적인 O(N) 충돌 감지.
5. **루프**: 다음 프레임 요청.

### 5.1 성능 최적화

#### **공간 분할 (Spatial Partitioning)** - `SpatialGrid`
기존의 O(N²) 브루트 포스 충돌 검사 대신, 그리드 기반 공간 분할을 사용합니다:
- 화면을 150px 셀로 분할
- 마스코트는 같은 셀/인접 셀의 엔티티와만 충돌 검사
- 100개 마스코트 기준 충돌 검사 횟수: ~5000회 → ~50회로 감소

```javascript
const SpatialGrid = {
    cellSize: 150,
    getCellKey(x, y) { /* "cellX,cellY" 반환 */ },
    insert(mascot) { /* 그리드에 추가 */ },
    getNearby(mascot) { /* 3x3 셀 영역의 마스코트 반환 */ }
};
```

#### **페이지 가시성 API (Page Visibility API)**
브라우저 탭이 숨겨지면 애니메이션이 자동으로 일시 중지됩니다:
- 탭 전환 시 CPU/배터리 절약
- Matrix Rain과 마스코트 업데이트 모두 가시성 상태를 따름
- 탭이 다시 활성화되면 즉시 재개

```javascript
document.addEventListener('visibilitychange', () => {
    isPageVisible = !document.hidden;
});

---

## 6. 마스코트 애니메이터 (WebP Generator)

`mascot-animator`는 정적 이미지를 움직이는 WebP/GIF로 변환하는 독립형 도구입니다.

### 6.1 주요 기능
- **소스 지원**: 이미지(PNG, JPG) 및 비디오(MP4, WebM) 파일/URL.
- **절차적 애니메이션**: Breathing, Floating, Jump, Shake, Squash, Spin 등.
- **내보내기 포맷**:
  - `Animated WebP`: 투명 배경 지원, 고압축.
  - `GIF`: 투명 배경 지원, 팔레트 최적화.
  - `WebM`: 투명 비디오 (VP9 코덱).

### 6.2 투명도 보장 기술 (Frame-by-Frame Rendering)
브라우저의 `MediaRecorder` API는 실시간 압축 시 알파 채널(투명도)을 종종 유실하거나 검은 배경으로 처리하는 문제가 있습니다. 이를 해결하기 위해 **프레임 단위 렌더링** 방식을 채택했습니다.

> **⚠️ Known Issue (알려진 문제)**: 현재 `ffmpeg.wasm` 기반의 WebP 인코더는 애니메이션 투명도 처리(WebP Disposal Method)에 한계가 있어, 복잡한 움직임에서 잔상(Ghosting)이 남을 수 있습니다. 완벽한 결과물을 위해서는 생성된 프레임(PNG)을 다운로드하여 로컬 FFmpeg 최신 버전에서 변환하는 것을 권장합니다.
- **WebM (HQ)**: `libvpx-vp9` 코덱을 사용하여 투명도 손실 없는 고화질 비디오 생성.
- **Sprite Sheet**: 잔상 문제의 완벽한 대안. 모든 프레임을 가로로 연결한 단일 PNG 이미지와 CSS `steps()` 애니메이션 코드를 생성합니다. **(결과창에서 즉시 미리보기 가능)**

### 6.3 보안 요구사항 (Security Requirements)
`ffmpeg.wasm`은 고성능 처리를 위해 `SharedArrayBuffer`를 사용합니다. 브라우저 보안 정책상 이를 사용하려면 다음 HTTP 헤더가 필수입니다.

- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

**해결책**:
`file://` 프로토콜에서는 작동하지 않으므로, 포함된 `server.py`를 사용하여 로컬 서버를 구동해야 합니다.
```bash
python server.py
# http://localhost:8080 에서 헤더와 함께 서빙됨
```

---

## 7. [실험적] 배경 제거 도구 (Background Remover)

`/background-remover` 경로에 위치한 실험적 기능입니다. `@imgly/background-removal` 라이브러리를 사용하여 클라이언트 측에서 배경 제거를 시도합니다.

> **✅ Resolved (해결됨)**: 이전에는 WASM/ONNX 모델 로딩 시 CORS 문제가 있었으나, `server.py`가 업데이트되어 조건부로 헤더를 전송합니다. 이제 로컬 서버(`python server.py`)를 통해 정상적으로 작동합니다.

