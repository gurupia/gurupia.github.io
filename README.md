<p align="center">
  <img src="Logos/logo-gurupia.png" alt="Gurupia Logo" width="200">
</p>

<h1 align="center">gurupia@github:~$</h1>

<p align="center">
  <strong>Terminal-Styled Interactive Portfolio Website</strong><br>
  <strong>터미널 스타일 인터랙티브 포트폴리오 웹사이트</strong>
</p>

<p align="center">
  <a href="#english">English</a> | <a href="#한국어">한국어</a>
</p>

---

<a name="english"></a>

## English

### Overview

A sophisticated personal portfolio website featuring a terminal-themed UI with an advanced interactive mascot system, integrated media players, and a mascot animation tool. Built entirely with vanilla JavaScript — no frameworks required.

### Key Features

#### Interactive Mascot System (`mascot.js`)
- **Behavioral AI**: Four personality types — Curious, Shy, Aggressive, Neutral — each with distinct movement patterns toward/away from the cursor
- **Weapon System**: Five weapon types (Machine Gun, Shotgun, Flamethrower, Grenade, Missile) with real-time firing and projectile physics
- **Visual Effects**: DOM-based particle engine (sparks, smoke), screen shake on explosions, 3D tilt effect on hover
- **Spatial Audio**: Web Audio API synthesized sounds (bullet, flame, explosion) with real-time stereo panning based on screen position
- **Collision Physics**: Spatial partitioning grid for O(N) collision detection with elastic bounce response
- **Data Persistence**: IndexedDB storage with automatic migration from localStorage. Custom images (Base64) supported
- **Performance**: Page Visibility API auto-pause, capped projectile/particle counts, spatial grid optimization

#### Terminal Interface
- Fully responsive terminal UI with 7 themes: Matrix (Green), Cyberpunk (Magenta), Terminal (Cyan), Retro (Orange), Monochrome, Grayscale, Artist (Rainbow)
- Interactive command-line experience
- Comment system via [Giscus](https://giscus.app/) (GitHub Discussions)

#### Music Player (`music-player.js`)
- Playlist-based audio player loading from `Music/playlist.json`
- Play/Pause, Previous/Next, Volume control
- Folder scan capability (when served via local HTTP server)
- Auto-advances to next track on completion

#### YouTube Player (`youtube-player.js`)
- Floating, draggable YouTube embed player
- Supports video URLs, shorts, embeds, and playlists
- ReDoS-safe URL parsing with input length validation

#### Mascot Animator (`/mascot-animator`)
- Convert static images or videos into animated formats
- **Animations**: Breathing, Floating, Jumping, Shaking, Squash & Stretch, Spin
- **Export Formats**: Animated WebP, GIF (palette-optimized), WebM (VP9 HQ), CSS Sprite Sheet
- Powered by FFmpeg.wasm for client-side encoding
- Live sprite sheet preview with generated CSS code

### Quick Start

```bash
# Clone the repository
git clone https://github.com/gurupia/gurupia.github.io.git
cd gurupia.github.io

# Option 1: Open directly (basic features work)
# Open index.html in your browser

# Option 2: Local server (recommended - enables all features)
python server.py
# Visit http://localhost:8080
```

> **Note**: `server.py` serves with `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers required by FFmpeg.wasm's `SharedArrayBuffer`.

### Project Structure

```
gurupia.github.io/
├── index.html              # Main portfolio page
├── mascot.js               # Mascot AI system (43KB)
├── mascot-styles.css       # Mascot & FX styling
├── music-player.js         # Music player module
├── music-player.css        # Music player styling
├── youtube-player.js       # YouTube embed player
├── youtube-player.css      # YouTube player styling
├── server.py               # Local dev server with security headers
│
├── mascot-animator/        # Animation generator tool
│   ├── index.html          # Animator UI
│   ├── animator.js         # FFmpeg.wasm animation engine
│   └── animator.css        # Animator styling
│
├── background-remover/     # [Experimental] AI background removal
│
├── GurupiaCapture/         # Screen capture application
│   ├── index.html          # Download page
│   └── docs/               # Application documentation
│
├── Music/                  # BGM collection (40+ tracks)
│   └── playlist.json       # Playlist metadata
│
├── Charactor/              # Character assets (PSD + PNG)
├── Logos/                  # Logo collection (PNG, WebP, SVG)
└── mascot.png              # Default mascot image
```

### Documentation

| Document | Language | Description |
|----------|----------|-------------|
| [README.md](README.md) | EN/KR | This file — project overview |
| [MASCOT_API_REFERENCE.md](MASCOT_API_REFERENCE.md) | EN | Mascot system API reference |
| [MASCOT_API_REFERENCE_KR.md](MASCOT_API_REFERENCE_KR.md) | KR | 마스코트 시스템 API 레퍼런스 |
| [MASCOT_IMPLEMENTATION_GUIDE.md](MASCOT_IMPLEMENTATION_GUIDE.md) | EN | Technical architecture manual |
| [MASCOT_IMPLEMENTATION_GUIDE_KR.md](MASCOT_IMPLEMENTATION_GUIDE_KR.md) | KR | 기술 아키텍처 매뉴얼 |
| [ANIMATOR_GUIDE.md](ANIMATOR_GUIDE.md) | EN | Mascot Animator user guide |
| [ANIMATOR_GUIDE_KR.md](ANIMATOR_GUIDE_KR.md) | KR | 마스코트 애니메이터 사용 가이드 |
| [PLAYER_GUIDE.md](PLAYER_GUIDE.md) | EN | Music & YouTube player guide |
| [PLAYER_GUIDE_KR.md](PLAYER_GUIDE_KR.md) | KR | 음악 & 유튜브 플레이어 가이드 |
| [GISCUS_SETUP.md](GISCUS_SETUP.md) | KR | Comment system setup guide |

### Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+), CSS3 Custom Properties
- **Storage**: IndexedDB (primary), localStorage (fallback)
- **Audio**: Web Audio API (real-time synthesis, no external audio files)
- **Animation**: FFmpeg.wasm (client-side video encoding)
- **Security**: COOP/COEP headers for SharedArrayBuffer support

### Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Core Mascot System | ✅ | ✅ | ✅ | ✅ |
| Spatial Audio | ✅ | ✅ | ✅ | ✅ |
| Mascot Animator (FFmpeg) | ✅ | ✅ | ⚠️ | ✅ |
| Background Remover | ✅ | ⚠️ | ⚠️ | ✅ |

> ⚠️ = Partial support or requires specific server configuration

---

<a name="한국어"></a>

## 한국어

### 개요

터미널 테마 UI를 기반으로 한 개인 포트폴리오 웹사이트입니다. 고급 인터랙티브 마스코트 시스템, 통합 미디어 플레이어, 마스코트 애니메이션 도구를 포함합니다. 순수 바닐라 JavaScript로 제작되었으며 외부 프레임워크가 필요하지 않습니다.

### 주요 기능

#### 인터랙티브 마스코트 시스템 (`mascot.js`)
- **행동 AI**: 4가지 성격 유형 — 호기심(Curious), 수줍음(Shy), 공격적(Aggressive), 중립(Neutral) — 커서를 향하거나 피하는 고유한 이동 패턴
- **무기 시스템**: 5종 무기(기관총, 산탄총, 화염방사기, 수류탄, 미사일)와 실시간 발사 및 투사체 물리
- **시각 효과**: DOM 기반 파티클 엔진(스파크, 연기), 폭발 시 화면 흔들림, 호버 시 3D 틸트 효과
- **공간 오디오**: Web Audio API 합성 사운드(총알, 화염, 폭발)와 화면 위치 기반 실시간 스테레오 패닝
- **충돌 물리**: 공간 분할 그리드를 활용한 O(N) 충돌 감지와 탄성 반발 응답
- **데이터 영속성**: IndexedDB 저장소 (localStorage에서 자동 마이그레이션). 커스텀 이미지(Base64) 지원
- **성능 최적화**: Page Visibility API 자동 일시정지, 투사체/파티클 수 제한, 공간 그리드 최적화

#### 터미널 인터페이스
- 7가지 테마를 지원하는 반응형 터미널 UI: Matrix(녹색), Cyberpunk(마젠타), Terminal(시안), Retro(주황), Monochrome, Grayscale, Artist(무지개)
- 인터랙티브 커맨드라인 경험
- [Giscus](https://giscus.app/) 기반 댓글 시스템 (GitHub Discussions)

#### 음악 플레이어 (`music-player.js`)
- `Music/playlist.json`에서 로드하는 플레이리스트 기반 오디오 플레이어
- 재생/일시정지, 이전/다음 트랙, 볼륨 컨트롤
- 폴더 스캔 기능 (로컬 HTTP 서버 사용 시)
- 트랙 종료 시 자동 다음 곡 재생

#### 유튜브 플레이어 (`youtube-player.js`)
- 드래그 가능한 플로팅 YouTube 임베드 플레이어
- 비디오 URL, Shorts, 임베드, 재생목록 지원
- ReDoS 방지 URL 파싱 및 입력 길이 검증

#### 마스코트 애니메이터 (`/mascot-animator`)
- 정적 이미지 또는 비디오를 애니메이션 포맷으로 변환
- **애니메이션**: 숨쉬기, 부유, 점프, 흔들기, 스쿼시 & 스트레치, 스핀
- **내보내기 포맷**: Animated WebP, GIF(팔레트 최적화), WebM(VP9 고품질), CSS Sprite Sheet
- FFmpeg.wasm 기반 클라이언트 사이드 인코딩
- 스프라이트 시트 라이브 미리보기 및 CSS 코드 자동 생성

### 빠른 시작

```bash
# 리포지토리 클론
git clone https://github.com/gurupia/gurupia.github.io.git
cd gurupia.github.io

# 방법 1: 직접 열기 (기본 기능 작동)
# 브라우저에서 index.html 열기

# 방법 2: 로컬 서버 (권장 - 모든 기능 활성화)
python server.py
# http://localhost:8080 방문
```

> **참고**: `server.py`는 FFmpeg.wasm의 `SharedArrayBuffer`에 필요한 `Cross-Origin-Opener-Policy`와 `Cross-Origin-Embedder-Policy` 헤더를 포함하여 서빙합니다.

### 프로젝트 구조

```
gurupia.github.io/
├── index.html              # 메인 포트폴리오 페이지
├── mascot.js               # 마스코트 AI 시스템 (43KB)
├── mascot-styles.css       # 마스코트 & FX 스타일링
├── music-player.js         # 음악 플레이어 모듈
├── music-player.css        # 음악 플레이어 스타일링
├── youtube-player.js       # YouTube 임베드 플레이어
├── youtube-player.css      # YouTube 플레이어 스타일링
├── server.py               # 보안 헤더 포함 로컬 개발 서버
│
├── mascot-animator/        # 애니메이션 생성 도구
│   ├── index.html          # 애니메이터 UI
│   ├── animator.js         # FFmpeg.wasm 애니메이션 엔진
│   └── animator.css        # 애니메이터 스타일링
│
├── background-remover/     # [실험적] AI 배경 제거
│
├── GurupiaCapture/         # 화면 캡처 애플리케이션
│   ├── index.html          # 다운로드 페이지
│   └── docs/               # 애플리케이션 문서
│
├── Music/                  # BGM 컬렉션 (40+ 트랙)
│   └── playlist.json       # 플레이리스트 메타데이터
│
├── Charactor/              # 캐릭터 에셋 (PSD + PNG)
├── Logos/                  # 로고 컬렉션 (PNG, WebP, SVG)
└── mascot.png              # 기본 마스코트 이미지
```

### 문서

| 문서 | 언어 | 설명 |
|------|------|------|
| [README.md](README.md) | EN/KR | 이 파일 — 프로젝트 개요 |
| [MASCOT_API_REFERENCE.md](MASCOT_API_REFERENCE.md) | EN | Mascot system API reference |
| [MASCOT_API_REFERENCE_KR.md](MASCOT_API_REFERENCE_KR.md) | KR | 마스코트 시스템 API 레퍼런스 |
| [MASCOT_IMPLEMENTATION_GUIDE.md](MASCOT_IMPLEMENTATION_GUIDE.md) | EN | Technical architecture manual |
| [MASCOT_IMPLEMENTATION_GUIDE_KR.md](MASCOT_IMPLEMENTATION_GUIDE_KR.md) | KR | 기술 아키텍처 매뉴얼 |
| [ANIMATOR_GUIDE.md](ANIMATOR_GUIDE.md) | EN | Mascot Animator user guide |
| [ANIMATOR_GUIDE_KR.md](ANIMATOR_GUIDE_KR.md) | KR | 마스코트 애니메이터 사용 가이드 |
| [PLAYER_GUIDE.md](PLAYER_GUIDE.md) | EN | Music & YouTube player guide |
| [PLAYER_GUIDE_KR.md](PLAYER_GUIDE_KR.md) | KR | 음악 & 유튜브 플레이어 가이드 |
| [GISCUS_SETUP.md](GISCUS_SETUP.md) | KR | 댓글 시스템 설정 가이드 |

### 기술 스택

- **프론트엔드**: Vanilla JavaScript (ES6+), CSS3 Custom Properties
- **저장소**: IndexedDB (주), localStorage (폴백)
- **오디오**: Web Audio API (실시간 합성, 외부 오디오 파일 불필요)
- **애니메이션**: FFmpeg.wasm (클라이언트 사이드 비디오 인코딩)
- **보안**: SharedArrayBuffer 지원을 위한 COOP/COEP 헤더

### 브라우저 지원

| 기능 | Chrome | Firefox | Safari | Edge |
|------|--------|---------|--------|------|
| 코어 마스코트 시스템 | ✅ | ✅ | ✅ | ✅ |
| 공간 오디오 | ✅ | ✅ | ✅ | ✅ |
| 마스코트 애니메이터 (FFmpeg) | ✅ | ✅ | ⚠️ | ✅ |
| 배경 제거 | ✅ | ⚠️ | ⚠️ | ✅ |

> ⚠️ = 부분 지원 또는 특정 서버 설정 필요

---

## License

This project is open source. See the repository for details.
