# 마스코트 애니메이터 사용 가이드

## 개요
마스코트 애니메이터는 정적 이미지 또는 비디오 파일을 애니메이션 형식으로 변환하는 브라우저 기반 도구입니다. 클라이언트 측 인코딩에 FFmpeg.wasm을 사용하므로 서버 측 처리가 필요하지 않습니다.

## 시작하기

### 사전 요구 사항
- Python 3 (보안 헤더가 포함된 로컬 서버용)
- 최신 브라우저 (Chrome/Firefox/Edge 권장)

### 실행
```bash
python server.py
# http://localhost:8080/mascot-animator/ 로 이동
```

> FFmpeg.wasm은 SharedArrayBuffer가 필요하며, 이를 위해 COOP/COEP 헤더가 필요하므로 server.py가 필수입니다.

## 소스 불러오기

### 파일에서 불러오기
"Choose File"을 클릭하여 PNG, JPG 이미지 또는 MP4, WebM 비디오 파일을 업로드합니다.

### URL에서 불러오기
이미지/비디오의 직접 URL을 입력하고 "Load"를 클릭합니다. 교차 출처 리소스에는 CORS 제한이 적용될 수 있습니다.

## 애니메이션 종류

| 애니메이션 | 효과 | 적합한 용도 |
|-----------|------|------------|
| Breathing (대기) | 수직 스케일 진동 | 대기 상태, 숨쉬기 효과 |
| Floating (유령) | 수직 위아래 이동 | 떠다니는, 유령 같은 움직임 |
| Jumping (기쁨) | 착지 시 찌그러짐이 있는 수직 바운스 | 흥분, 기쁜 상태 |
| Shaking (피격) | 회전 진동 | 타격 반응, 피격 피드백 |
| Squash & Stretch (젤리) | 수평/수직 반비례 스케일링 | 젤리 같은, 만화 바운스 |
| Spin (3D 효과) | 수평 스케일 반전 (코사인) | 동전 뒤집기, 3D 회전 착시 |

## 컨트롤
- **Speed** (0.1x - 3.0x): 애니메이션 재생 속도
- **Intensity** (0% - 200%): 애니메이션 효과의 진폭

## 내보내기 형식

### Animated WebP (투명 지원)
- 투명도를 지원하는 최고의 압축률
- 알려진 문제: FFmpeg.wasm이 투명 영역에서 고스팅 아티팩트를 생성할 수 있음
- libwebp 코덱 사용

### WebM 고품질 (FFmpeg)
- 진정한 알파 채널을 위한 yuva420p 픽셀 포맷의 VP9 코덱
- 투명 비디오에 최고 품질
- 고정 품질 모드 (CRF 30)

### CSS 스프라이트 시트 (고스팅 없음)
- **웹 사용에 권장** -- 아티팩트 제로
- 단일 수평 PNG 스트립 생성
- 바로 사용 가능한 CSS `steps()` 애니메이션 코드 제공
- 실제 CSS 애니메이션으로 실시간 미리보기
- FFmpeg 아티팩트 없음 -- 순수 캔버스 렌더링

### GIF (투명 지원)
- 2패스 인코딩: 팔레트 생성 후 paletteuse 적용
- 알파 지원을 위한 `reserve_transparent=1`
- 깨끗한 투명도 경계를 위한 `alpha_threshold=128`

### WebM 빠른 내보내기 (MediaRecorder)
- `canvas.captureStream(60)`을 사용한 네이티브 브라우저 녹화
- 가장 빠른 내보내기이나 품질은 낮음
- VP9, VP8, WebM 코덱 순으로 폴백 시도

## 기술 상세

### 프레임 캡처 과정 (WebP/GIF/WebM HQ)
1. 애니메이션 시간을 0으로 초기화
2. 3초 동안 30fps로 각 프레임 렌더링 (총 90프레임)
3. 캔버스에서 각 프레임을 PNG 블롭으로 캡처
4. FFmpeg 가상 파일 시스템에 프레임 기록
5. 형식별 FFmpeg 명령어로 인코딩
6. 다운로드 링크 생성

### 스프라이트 시트 과정
1. PNG 블롭으로 프레임 캡처 (위와 동일)
2. 넓은 캔버스 생성 (512px * 프레임 수)
3. `createImageBitmap`을 사용하여 각 프레임을 나란히 배치
4. 단일 PNG로 내보내기
5. `steps()` 타이밍 함수를 사용한 CSS 애니메이션 코드 생성
6. 실시간 미리보기 표시

### 보안
- FFmpeg.wasm은 SharedArrayBuffer가 필요하며, 이는 COOP/COEP 헤더를 필요로 함
- `file://` 프로토콜은 자동으로 WebM (MediaRecorder) 방식으로 폴백됨
- URL 검증으로 스프라이트 시트 출력에서 CSS 인젝션 방지 (sanitizeAnimName, sanitizeNumber)

## API 레퍼런스 (animator.js)

### 상태
```javascript
let state = {
    anim: 'breath',    // 현재 애니메이션 종류
    speed: 1.0,        // 재생 속도 배율
    intensity: 1.0,    // 효과 진폭 (0-2)
    format: 'webp'     // 내보내기 형식
};
```

### 상수
- `ALLOWED_ANIMS` = ['breath', 'float', 'jump', 'shake', 'squash', 'spin']
- `ALLOWED_FORMATS` = ['webp', 'gif', 'webm', 'webm_hq', 'sprite']

### 함수
- `loadImage(src)` - 이미지 소스를 캔버스에 로드
- `loadVideo(src)` - 비디오 소스를 캔버스에 로드
- `fitCanvasToSource()` - 캔버스를 512x512로 설정
- `drawScene()` - 현재 애니메이션으로 단일 프레임 렌더링
- `animate()` - RequestAnimationFrame 루프 (미리보기 전용, 녹화 중 일시정지)
- `startRecording()` - 내보내기 과정 시작
- `recordWebM()` - 빠른 네이티브 WebM 녹화 (3초)
- `recordFrameSequence()` - 고품질 프레임별 캡처
- `convertFramesToOutput(frames, format, fps)` - FFmpeg를 통해 캡처된 프레임 인코딩
- `finishRecording(blob)` - 다운로드 링크 설정
- `sanitizeAnimName(name)` - 화이트리스트 기반 애니메이션 이름 검증 (문자열 반환)
- `sanitizeNumber(val)` - 숫자 값 파싱 및 검증 (숫자 반환)
