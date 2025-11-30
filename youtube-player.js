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

        const videoId = this.extractVideoId(url);
        if (videoId) {
            this.iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
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

                    const videoId = this.extractVideoId(url);
                    if (videoId) {
                        this.iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
                    } else {
                        alert('Invalid YouTube URL');
                    }
                }

                extractVideoId(url) {
                    // Regex to handle standard URLs, Shorts, Embeds, etc.
                    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?)\??v?=?|(&v=)|(shorts\/))([^#&?]*).*/;
                    const match = url.match(regExp);
                    return (match && match[9].length == 11) ? match[9] : null;
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
