class YouTubePlayer {
    constructor() {
        this.init();
    }

    init() {
        this.cacheDOM();
        this.bindEvents();
        this.makeDraggable(this.player, this.header);
    }

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

    clearError() {
        if (this.errorMsg) this.errorMsg.style.display = 'none';
    }

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

    togglePlayer() {
        if (this.player) {
            this.player.classList.toggle('show');
        }
    }

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
