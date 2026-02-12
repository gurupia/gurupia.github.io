# 음악 & 유튜브 플레이어 가이드

## 음악 플레이어 (`music-player.js`)

### 개요
`Music/playlist.json`에서 트랙을 로드하는 재생목록 기반 오디오 플레이어입니다. 표준 미디어 컨트롤과 자동 다음 트랙 재생 기능을 제공합니다.

### 기능
- JSON 메타데이터에서 재생목록 로드
- 재생/일시정지, 이전/다음 트랙 탐색
- 볼륨 조절 슬라이더
- 폴더 스캔 (로컬 HTTP 서버 사용 시)
- 트랙 완료 시 자동으로 다음 트랙 재생
- 순환 재생목록 탐색 (처음/끝 연결)
- 음악 플레이어 시작 시 배경 BGM 일시정지

### 재생목록 형식 (`Music/playlist.json`)
```json
[
  {
    "title": "트랙 제목",
    "artist": "아티스트 이름",
    "file": "filename.mp3"
  }
]
```
- `file`은 로컬 파일명(`Music/` 기준 상대 경로) 또는 전체 HTTP URL을 사용할 수 있습니다
- MP3 형식 지원

### 필수 HTML 요소
플레이어는 다음 DOM 요소 ID에 바인딩됩니다:
| 요소 ID | 유형 | 용도 |
|-----------|------|---------|
| `music-player-btn` | 버튼 | 플레이어 표시/숨기기 토글 |
| `music-player` | 컨테이너 | 플레이어 패널 (`.show` 클래스 토글) |
| `close-player` | 버튼 | 플레이어 패널 닫기 |
| `scan-btn` | 버튼 | Music 폴더에서 MP3 스캔 |
| `play-btn` | 버튼 | 재생/일시정지 토글 |
| `prev-btn` | 버튼 | 이전 트랙 |
| `next-btn` | 버튼 | 다음 트랙 |
| `volume-slider` | 범위 입력 | 볼륨 조절 (0-1) |
| `playlist` | 컨테이너 | 재생목록 항목이 렌더링되는 곳 |
| `track-title` | 텍스트 | 현재 트랙 제목 |
| `track-artist` | 텍스트 | 현재 트랙 아티스트 |

### API 레퍼런스

#### class MusicPlayer

**생성자**: `new MusicPlayer()`
- 자동으로 `init()`을 호출하며, `cacheDOM()`, `bindEvents()`, `loadPlaylist()`를 실행합니다

**메서드**:
- `init()` → Promise - 플레이어 초기화
- `cacheDOM()` - 모든 DOM 요소 참조 캐시
- `bindEvents()` - 클릭/입력 이벤트 리스너 바인딩
- `loadPlaylist()` → Promise - `Music/playlist.json`을 가져와서 파싱. 오류 시 단일 BGM 트랙으로 폴백
- `scanMusicFolder()` → Promise - `Music/` 디렉토리 목록을 가져와서 MP3 파일을 추출하고 재생목록 재구성
- `renderPlaylist()` - DOM에서 재생목록 항목 다시 렌더링
- `loadTrack(index)` - 해당 인덱스의 트랙으로 오디오 소스 설정 및 UI 업데이트
- `togglePlay()` - play()와 pause() 사이 전환
- `play()` → Promise - 재생 시작. 활성화된 BGM 오디오(`#bgm-audio`)도 일시정지
- `pause()` - 재생 일시정지
- `playNext()` - 다음 트랙으로 이동 (순환)
- `playPrev()` - 이전 트랙으로 이동 (순환)
- `updatePlaylistUI()` - 재생목록 항목의 `.active` 클래스 업데이트
- `togglePlayer()` - 플레이어 컨테이너의 `.show` 클래스 토글

**속성**:
- `playlist` (Array) - 로드된 트랙 객체 배열
- `currentIndex` (number) - 현재 트랙 인덱스
- `isPlaying` (boolean) - 재생 상태
- `audio` (Audio) - HTML5 Audio 요소

### 참고사항
- `file://` 프로토콜로 열 때 CORS로 인해 `playlist.json` 로딩이 차단될 수 있습니다
- 폴더 스캔은 디렉토리 목록을 제공하는 서버(예: Python HTTP 서버)에서만 작동합니다
- 플레이어는 `DOMContentLoaded` 이벤트에서 초기화됩니다

---

## 유튜브 플레이어 (`youtube-player.js`)

### 개요
동영상 URL, 쇼츠, 임베드, 재생목록을 지원하는 플로팅 드래그 가능한 유튜브 임베드 플레이어입니다. 입력 검증과 함께 ReDoS 안전 URL 파싱을 지원합니다.

### 기능
- 드래그 가능한 플로팅 윈도우 (헤더로 드래그)
- 다양한 유튜브 URL 형식 지원
- 재생목록 자동 감지
- 자동 숨김 오류 표시 (5초)
- DoS 방지를 위한 URL 길이 검증 (최대 500자)
- ReDoS 안전 정규식 패턴

### 지원되는 URL 형식
| 형식 | 예시 | 추출 대상 |
|--------|---------|-----------|
| 표준 시청 | `youtube.com/watch?v=VIDEO_ID` | 동영상 ID |
| 짧은 URL | `youtu.be/VIDEO_ID` | 동영상 ID |
| 임베드 URL | `youtube.com/embed/VIDEO_ID` | 동영상 ID |
| 쇼츠 | `youtube.com/shorts/VIDEO_ID` | 동영상 ID |
| 재생목록 | `youtube.com/watch?list=PLAYLIST_ID` | 재생목록 ID |

### 필수 HTML 요소
| 요소 ID | 유형 | 용도 |
|-----------|------|---------|
| `youtube-player-btn` | 버튼 | 플레이어 표시/숨기기 토글 |
| `youtube-player` | 컨테이너 | 플레이어 패널 |
| `youtube-header` | 헤더 | 드래그 핸들 |
| `close-youtube` | 버튼 | 플레이어 닫기 |
| `load-youtube` | 버튼 | URL에서 동영상 로드 |
| `youtube-url` | 입력 | URL 텍스트 입력 |
| `youtube-iframe` | iframe | 유튜브 임베드 컨테이너 |

### API 레퍼런스

#### class YouTubePlayer

**생성자**: `new YouTubePlayer()`
- `init()` 호출 → `cacheDOM()`, `bindEvents()`, `makeDraggable()`

**메서드**:
- `init()` - 플레이어 초기화
- `cacheDOM()` - DOM 요소 참조 캐시
- `showError(message)` - 오류 메시지 표시 (5초 후 자동 숨김)
- `clearError()` - 오류 메시지 숨기기
- `bindEvents()` - 클릭 및 키 입력 이벤트 리스너 바인딩
- `togglePlayer()` - `.show` 클래스 토글
- `loadVideo()` - URL 입력 파싱 후 iframe src 설정
- `parseUrl(url)` → `{type: 'video'|'playlist'|null, id: string|null}` - URL에서 동영상/재생목록 ID 추출
- `makeDraggable(element, handle)` - 핸들을 이용하여 요소를 드래그 가능하게 설정

**URL 파싱 로직** (`parseUrl`):
1. 500자 초과 URL 거부
2. `list=` 매개변수 확인 → 재생목록
3. `youtu.be/VIDEO_ID` 패턴 시도 (11자)
4. `?v=VIDEO_ID` 패턴 시도 (11자)
5. `/embed/VIDEO_ID` 패턴 시도 (11자)
6. `/shorts/VIDEO_ID` 패턴 시도 (11자)
7. 일치하는 항목 없으면 `{type: null, id: null}` 반환

### 보안
- URL 길이 최대 500자로 제한
- 동영상 ID는 `[a-zA-Z0-9_-]`와 일치하는 정확히 11자로 검증
- ReDoS를 방지하기 위한 단순 비역추적 정규식 패턴
- 재생목록 ID는 `[a-zA-Z0-9_-]+` 패턴으로 검증

### 참고사항
- 플레이어는 즉시 초기화됩니다 (DOMContentLoaded 대기 없음)
- URL 입력 필드에서 Enter 키를 누르면 동영상 로드 실행
- 드래그 시 위치 일관성을 위해 `bottom`/`right` CSS가 `auto`로 재설정됩니다
