/**
 * Floating, draggable YouTube embed player with URL parsing.
 * URL 파싱 기능을 갖춘 플로팅 드래그 가능 YouTube 임베드 플레이어.
 *
 * Supports video URLs, shorts, embeds, playlists with ReDoS-safe parsing.
 * 비디오 URL, Shorts, 임베드, 재생목록을 ReDoS 안전 파싱으로 지원.
 *
 * @class YouTubePlayer
 */
class YouTubePlayer {
    constructor() {
        this.init();
    }

    /** Initialize: cache DOM, bind events, make player draggable. / 초기화: DOM 캐시, 이벤트 바인딩, 드래그 설정. */
    init() {
        this.cacheDOM();
        this.bindEvents();
        this.makeDraggable(this.player, this.header);
    }

    /** Cache all DOM element references. / 모든 DOM 요소 참조 캐시. */
    cacheDOM() {
        this.playerBtn = document.getElementById('youtube-player-btn');
        this.player = document.getElementById('youtube-player');
        this.header = document.getElementById('youtube-header');
        this.closeBtn = document.getElementById('close-youtube');
        this.loadBtn = document.getElementById('load-youtube');
        this.urlInput = document.getElementById('youtube-url');
        this.iframe = document.getElementById('youtube-iframe');
        this.errorMsg = null; // Will be created on demand
    }

    /**
     * Display error message below URL input (auto-hides after 5 seconds).
     * URL 입력 아래에 에러 메시지 표시 (5초 후 자동 숨김).
     * @param {string} message - Error text to display / 표시할 에러 텍스트
     */
    showError(message) {
        // Create error message element if not exists
        if (!this.errorMsg) {
            this.errorMsg = document.createElement('div');
            this.errorMsg.style.cssText = 'color: #ff4444; font-size: 12px; margin-top: 5px; padding: 5px; background: rgba(255,0,0,0.1); border-radius: 3px; display: none;';
            this.urlInput.parentNode.insertBefore(this.errorMsg, this.urlInput.nextSibling);
        }
        this.errorMsg.textContent = message;
        this.errorMsg.style.display = 'block';
        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (this.errorMsg) this.errorMsg.style.display = 'none';
        }, 5000);
    }

    /** Hide error message element. / 에러 메시지 요소 숨김. */
    clearError() {
        if (this.errorMsg) this.errorMsg.style.display = 'none';
    }

    /** Bind click and keypress event listeners to player controls. / 플레이어 컨트롤에 클릭 및 키프레스 이벤트 리스너 바인딩. */
    bindEvents() {
        if (this.playerBtn) {
            this.playerBtn.addEventListener('click', () => this.togglePlayer());
        }
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.togglePlayer());
        }
        if (this.loadBtn) {
            this.loadBtn.addEventListener('click', () => this.loadVideo());
        }
        if (this.urlInput) {
            this.urlInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.loadVideo();
            });
        }
    }

    /** Toggle player panel visibility via .show CSS class. / .show CSS 클래스로 플레이어 패널 가시성 토글. */
    togglePlayer() {
        if (this.player) {
            this.player.classList.toggle('show');
        }
    }

    /** Parse URL input and load video/playlist into iframe. / URL 입력을 파싱하여 iframe에 비디오/재생목록 로드. */
    loadVideo() {
        const url = this.urlInput.value.trim();
        if (!url) return;

        this.clearError();
        const result = this.parseUrl(url);

        if (result.type === 'video') {
            this.iframe.src = `https://www.youtube.com/embed/${result.id}?autoplay=1`;
        } else if (result.type === 'playlist') {
            this.iframe.src = `https://www.youtube.com/embed/videoseries?list=${result.id}&autoplay=1`;
        } else {
            this.showError('⚠️ Invalid YouTube URL. Please enter a valid video or playlist URL.');
        }
    }

    /**
     * Extract video or playlist ID from YouTube URL (ReDoS-safe).
     * YouTube URL에서 비디오 또는 재생목록 ID 추출 (ReDoS 안전).
     *
     * Supports: watch?v=, youtu.be/, embed/, shorts/, ?list=
     * URL length capped at 500 chars. Video IDs validated as 11 chars [a-zA-Z0-9_-].
     *
     * @param {string} url - YouTube URL to parse / 파싱할 YouTube URL
     * @returns {{type: 'video'|'playlist'|null, id: string|null}} Parsed result / 파싱 결과
     */
    parseUrl(url) {
        // Validate URL length to prevent DoS (YouTube URLs are never this long)
        if (!url || url.length > 500) {
            return { type: null, id: null };
        }

        // Check for Playlist first (simple pattern)
        const playlistMatch = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
        if (playlistMatch) {
            return { type: 'playlist', id: playlistMatch[1] };
        }

        // Extract video ID using simple patterns (ReDoS-safe)
        let videoId = null;

        // Pattern 1: youtu.be/VIDEO_ID
        const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
        if (shortMatch) videoId = shortMatch[1];

        // Pattern 2: youtube.com/watch?v=VIDEO_ID
        if (!videoId) {
            const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
            if (watchMatch) videoId = watchMatch[1];
        }

        // Pattern 3: youtube.com/embed/VIDEO_ID
        if (!videoId) {
            const embedMatch = url.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
            if (embedMatch) videoId = embedMatch[1];
        }

        // Pattern 4: youtube.com/shorts/VIDEO_ID
        if (!videoId) {
            const shortsMatch = url.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
            if (shortsMatch) videoId = shortsMatch[1];
        }

        if (videoId) {
            return { type: 'video', id: videoId };
        }

        return { type: null, id: null };
    }

    /**
     * Make an element draggable by a handle element.
     * 핸들 요소로 요소를 드래그 가능하게 설정.
     * @param {HTMLElement} element - Element to move / 이동할 요소
     * @param {HTMLElement} handle - Drag handle element / 드래그 핸들 요소
     */
    makeDraggable(element, handle) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

        if (handle) {
            handle.onmousedown = dragMouseDown;
        } else {
            element.onmousedown = dragMouseDown;
        }

        function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault();
            // get the mouse cursor position at startup:
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            // call a function whenever the cursor moves:
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            // calculate the new cursor position:
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            // set the element's new position:
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";

            // Reset bottom/right to auto so top/left take precedence
            element.style.bottom = 'auto';
            element.style.right = 'auto';
        }

        function closeDragElement() {
            // stop moving when mouse button is released:
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }
}

// Initialize player immediately
new YouTubePlayer();
