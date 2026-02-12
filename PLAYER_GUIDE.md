# Music & YouTube Player Guide

## Music Player (`music-player.js`)

### Overview
A playlist-based audio player that loads tracks from `Music/playlist.json`. Provides standard media controls with automatic next-track advancement.

### Features
- Playlist loading from JSON metadata
- Play/Pause, Previous/Next track navigation
- Volume control slider
- Folder scan (when using local HTTP server)
- Auto-advances to next track on completion
- Circular playlist navigation (wraps around)
- Pauses background BGM when music player starts

### Playlist Format (`Music/playlist.json`)
```json
[
  {
    "title": "Track Title",
    "artist": "Artist Name",
    "file": "filename.mp3"
  }
]
```
- `file` can be a local filename (relative to `Music/`) or a full HTTP URL
- MP3 format supported

### HTML Elements Required
The player binds to these DOM element IDs:
| Element ID | Type | Purpose |
|-----------|------|---------|
| `music-player-btn` | Button | Toggle player visibility |
| `music-player` | Container | Player panel (toggles `.show` class) |
| `close-player` | Button | Close player panel |
| `scan-btn` | Button | Scan Music folder for MP3s |
| `play-btn` | Button | Play/Pause toggle |
| `prev-btn` | Button | Previous track |
| `next-btn` | Button | Next track |
| `volume-slider` | Range input | Volume control (0-1) |
| `playlist` | Container | Playlist items rendered here |
| `track-title` | Text | Current track title |
| `track-artist` | Text | Current track artist |

### API Reference

#### class MusicPlayer

**Constructor**: `new MusicPlayer()`
- Automatically calls `init()` which runs `cacheDOM()`, `bindEvents()`, `loadPlaylist()`

**Methods**:
- `init()` → Promise - Initialize player
- `cacheDOM()` - Cache all DOM element references
- `bindEvents()` - Bind click/input event listeners
- `loadPlaylist()` → Promise - Fetch and parse `Music/playlist.json`. Falls back to single BGM track on error
- `scanMusicFolder()` → Promise - Fetch `Music/` directory listing, extract MP3 files, rebuild playlist
- `renderPlaylist()` - Re-render playlist items in DOM
- `loadTrack(index)` - Set audio source to track at index, update UI
- `togglePlay()` - Toggle between play() and pause()
- `play()` → Promise - Start playback. Also pauses any active BGM audio (`#bgm-audio`)
- `pause()` - Pause playback
- `playNext()` - Advance to next track (circular)
- `playPrev()` - Go to previous track (circular)
- `updatePlaylistUI()` - Update `.active` class on playlist items
- `togglePlayer()` - Toggle `.show` class on player container

**Properties**:
- `playlist` (Array) - Loaded track objects
- `currentIndex` (number) - Current track index
- `isPlaying` (boolean) - Playback state
- `audio` (Audio) - HTML5 Audio element

### Notes
- CORS may block `playlist.json` loading when opened via `file://` protocol
- Folder scan only works on servers that provide directory listings (like Python's HTTP server)
- Player initializes on `DOMContentLoaded` event

---

## YouTube Player (`youtube-player.js`)

### Overview
A floating, draggable YouTube embed player that supports video URLs, shorts, embeds, and playlists. Features ReDoS-safe URL parsing with input validation.

### Features
- Draggable floating window (drag by header)
- Supports multiple YouTube URL formats
- Playlist auto-detection
- Error display with auto-hide (5 seconds)
- URL length validation (max 500 chars) to prevent DoS
- ReDoS-safe regex patterns

### Supported URL Formats
| Format | Example | Extracted |
|--------|---------|-----------|
| Standard watch | `youtube.com/watch?v=VIDEO_ID` | Video ID |
| Short URL | `youtu.be/VIDEO_ID` | Video ID |
| Embed URL | `youtube.com/embed/VIDEO_ID` | Video ID |
| Shorts | `youtube.com/shorts/VIDEO_ID` | Video ID |
| Playlist | `youtube.com/watch?list=PLAYLIST_ID` | Playlist ID |

### HTML Elements Required
| Element ID | Type | Purpose |
|-----------|------|---------|
| `youtube-player-btn` | Button | Toggle player visibility |
| `youtube-player` | Container | Player panel |
| `youtube-header` | Header | Drag handle |
| `close-youtube` | Button | Close player |
| `load-youtube` | Button | Load video from URL |
| `youtube-url` | Input | URL text input |
| `youtube-iframe` | iframe | YouTube embed container |

### API Reference

#### class YouTubePlayer

**Constructor**: `new YouTubePlayer()`
- Calls `init()` → `cacheDOM()`, `bindEvents()`, `makeDraggable()`

**Methods**:
- `init()` - Initialize player
- `cacheDOM()` - Cache DOM element references
- `showError(message)` - Display error message (auto-hides after 5s)
- `clearError()` - Hide error message
- `bindEvents()` - Bind click and keypress event listeners
- `togglePlayer()` - Toggle `.show` class
- `loadVideo()` - Parse URL input, set iframe src
- `parseUrl(url)` → `{type: 'video'|'playlist'|null, id: string|null}` - Extract video/playlist ID from URL
- `makeDraggable(element, handle)` - Make element draggable by handle

**URL Parsing Logic** (`parseUrl`):
1. Reject URLs longer than 500 characters
2. Check for `list=` parameter → playlist
3. Try `youtu.be/VIDEO_ID` pattern (11 chars)
4. Try `?v=VIDEO_ID` pattern (11 chars)
5. Try `/embed/VIDEO_ID` pattern (11 chars)
6. Try `/shorts/VIDEO_ID` pattern (11 chars)
7. Return `{type: null, id: null}` if no match

### Security
- URL length capped at 500 characters
- Video IDs validated as exactly 11 characters matching `[a-zA-Z0-9_-]`
- Simple, non-backtracking regex patterns to prevent ReDoS
- Playlist IDs validated with `[a-zA-Z0-9_-]+` pattern

### Notes
- Player initializes immediately (no DOMContentLoaded wait)
- Enter key in URL input triggers video load
- Dragging resets `bottom`/`right` CSS to `auto` for position consistency
