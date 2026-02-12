/**
 * Playlist-based audio player loading tracks from Music/playlist.json.
 * Music/playlist.json에서 트랙을 로드하는 플레이리스트 기반 오디오 플레이어.
 *
 * Features: Play/Pause, Previous/Next, Volume control, Folder scan, Auto-advance.
 * 기능: 재생/일시정지, 이전/다음, 볼륨 컨트롤, 폴더 스캔, 자동 다음 곡.
 *
 * @class MusicPlayer
 */
class MusicPlayer {
    constructor() {
        /** @type {Array<{title: string, artist: string, file: string}>} Loaded tracks / 로드된 트랙 목록 */
        this.playlist = [];
        /** @type {number} Current track index / 현재 트랙 인덱스 */
        this.currentIndex = 0;
        /** @type {boolean} Playback state / 재생 상태 */
        this.isPlaying = false;
        /** @type {HTMLAudioElement} HTML5 Audio element / HTML5 오디오 요소 */
        this.audio = new Audio();

        this.init();
    }

    /** Initialize: cache DOM, bind events, load playlist. / 초기화: DOM 캐시, 이벤트 바인딩, 플레이리스트 로드. */
    async init() {
        this.cacheDOM();
        this.bindEvents();
        await this.loadPlaylist();
    }

    /** Cache all DOM element references for performance. / 성능을 위해 모든 DOM 요소 참조 캐시. */
    cacheDOM() {
        this.playerBtn = document.getElementById('music-player-btn');
        this.player = document.getElementById('music-player');
        this.closeBtn = document.getElementById('close-player');
        this.scanBtn = document.getElementById('scan-btn');
        this.playBtn = document.getElementById('play-btn');
        this.prevBtn = document.getElementById('prev-btn');
        this.nextBtn = document.getElementById('next-btn');
        this.volumeSlider = document.getElementById('volume-slider');
        this.playlistContainer = document.getElementById('playlist');
        this.trackTitle = document.getElementById('track-title');
        this.trackArtist = document.getElementById('track-artist');
    }

    /** Bind click/input event listeners to player controls. / 플레이어 컨트롤에 이벤트 리스너 바인딩. */
    bindEvents() {
        if (this.playerBtn) {
            this.playerBtn.addEventListener('click', () => this.togglePlayer());
        }
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.togglePlayer());
        }

        if (this.scanBtn) {
            this.scanBtn.addEventListener('click', () => this.scanMusicFolder());
        }

        if (this.playBtn) {
            this.playBtn.addEventListener('click', () => this.togglePlay());
        }
        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', () => this.playPrev());
        }
        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => this.playNext());
        }

        if (this.volumeSlider) {
            this.volumeSlider.addEventListener('input', (e) => {
                this.audio.volume = e.target.value;
            });
        }

        this.audio.addEventListener('ended', () => this.playNext());
    }

    /**
     * Fetch and parse Music/playlist.json. Falls back to single BGM track on CORS error.
     * Music/playlist.json을 페치하여 파싱. CORS 오류 시 단일 BGM 트랙으로 폴백.
     */
    async loadPlaylist() {
        try {
            const response = await fetch('Music/playlist.json');
            if (!response.ok) throw new Error('Failed to load playlist');
            this.playlist = await response.json();
            this.renderPlaylist();

            if (this.playlist.length > 0) {
                this.loadTrack(0);
            }
        } catch (error) {
            console.error('Error loading playlist (CORS in local file?):', error);
            // FALLBACK PLAYLIST FOR LOCAL TESTING
            this.playlist = [
                { title: "Mascot Theme 1", artist: "Gurupia", file: "bgm.mp3" }
            ];
            this.renderPlaylist();
            if (this.playlist.length > 0) this.loadTrack(0);

            if (this.playlistContainer) {
                const notice = document.createElement('div');
                notice.style.fontSize = '10px';
                notice.style.color = '#ff4500';
                notice.style.marginTop = '5px';
                notice.innerHTML = '⚠️ Firefox: Local file access (CORS) blocked. Use Live Server for full playlist.';
                this.playlistContainer.appendChild(notice);
            }
        }
    }

    /**
     * Scan Music/ directory for MP3 files via directory listing (local HTTP server only).
     * 디렉토리 리스팅을 통해 Music/ 폴더의 MP3 파일 스캔 (로컬 HTTP 서버 전용).
     */
    async scanMusicFolder() {
        try {
            // Try to fetch directory listing (works on local python server)
            const response = await fetch('Music/');
            if (!response.ok) throw new Error('Cannot list directory');

            const text = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');
            const links = Array.from(doc.querySelectorAll('a'));

            const mp3s = links
                .map(link => link.getAttribute('href'))
                .filter(href => href && href.toLowerCase().endsWith('.mp3'))
                .map(href => decodeURIComponent(href));

            if (mp3s.length === 0) {
                alert('No MP3 files found in Music folder (or directory listing disabled).');
                return;
            }

            // Create new playlist from scanned files
            const newPlaylist = mp3s.map(file => ({
                title: file.replace('.mp3', ''),
                artist: 'Unknown',
                file: file
            }));

            this.playlist = newPlaylist;
            this.renderPlaylist();
            alert(`Found ${mp3s.length} songs! Playlist updated.`);

        } catch (error) {
            console.error('Scan failed:', error);
            // Fallback to reloading playlist.json
            await this.loadPlaylist();
            alert('Directory scan failed (normal on GitHub Pages). Reloaded playlist.json.');
        }
    }

    /** Render playlist items in the DOM container. / DOM 컨테이너에 플레이리스트 항목 렌더링. */
    renderPlaylist() {
        if (!this.playlistContainer) return;
        this.playlistContainer.innerHTML = '';
        this.playlist.forEach((track, index) => {
            const item = document.createElement('div');
            item.className = `playlist-item ${index === this.currentIndex ? 'active' : ''}`;
            item.textContent = `${index + 1}. ${track.title} - ${track.artist}`;
            item.addEventListener('click', () => {
                this.currentIndex = index;
                this.loadTrack(index);
                this.play();
            });
            this.playlistContainer.appendChild(item);
        });
    }

    /**
     * Set audio source to track at given index and update UI.
     * 주어진 인덱스의 트랙으로 오디오 소스 설정 및 UI 업데이트.
     * @param {number} index - Track index in playlist / 플레이리스트 내 트랙 인덱스
     */
    loadTrack(index) {
        if (index < 0 || index >= this.playlist.length) return;

        const track = this.playlist[index];
        // Handle both local files in Music/ and external URLs if needed
        const src = track.file.startsWith('http') ? track.file : `Music/${track.file}`;

        this.audio.src = src;
        if (this.trackTitle) this.trackTitle.textContent = track.title;
        if (this.trackArtist) this.trackArtist.textContent = track.artist;

        this.updatePlaylistUI();
    }

    /** Toggle between play and pause state. / 재생과 일시정지 상태 토글. */
    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    /** Start playback. Also pauses any active BGM audio element. / 재생 시작. 활성 BGM 오디오도 일시정지. */
    play() {
        // Pause BGM if it's playing (from mascot.js)
        const bgmAudio = document.getElementById('bgm-audio');
        if (bgmAudio && !bgmAudio.paused) {
            bgmAudio.pause();
            // Uncheck the toggle in settings
            const bgmToggle = document.getElementById('bgm-toggle');
            if (bgmToggle) bgmToggle.checked = false;
        }

        this.audio.play()
            .then(() => {
                this.isPlaying = true;
                if (this.playBtn) this.playBtn.textContent = '⏸';
            })
            .catch(e => console.error("Playback failed:", e));
    }

    /** Pause playback and update button icon. / 재생 일시정지 및 버튼 아이콘 업데이트. */
    pause() {
        this.audio.pause();
        this.isPlaying = false;
        if (this.playBtn) this.playBtn.textContent = '▶';
    }

    /** Advance to next track (circular navigation). / 다음 트랙으로 이동 (순환 탐색). */
    playNext() {
        this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
        this.loadTrack(this.currentIndex);
        this.play();
    }

    /** Go to previous track (circular navigation). / 이전 트랙으로 이동 (순환 탐색). */
    playPrev() {
        this.currentIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
        this.loadTrack(this.currentIndex);
        this.play();
    }

    /** Update .active CSS class on playlist items to reflect current track. / 현재 트랙을 반영하여 .active CSS 클래스 업데이트. */
    updatePlaylistUI() {
        if (!this.playlistContainer) return;
        const items = this.playlistContainer.querySelectorAll('.playlist-item');
        items.forEach((item, index) => {
            if (index === this.currentIndex) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    /** Toggle player panel visibility via .show CSS class. / .show CSS 클래스로 플레이어 패널 가시성 토글. */
    togglePlayer() {
        if (this.player) {
            this.player.classList.toggle('show');
        }
    }
}

// Initialize player on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    new MusicPlayer();
});
