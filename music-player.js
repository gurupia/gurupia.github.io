class MusicPlayer {
    constructor() {
        this.playlist = [];
        this.currentIndex = 0;
        this.isPlaying = false;
        this.audio = new Audio();

        this.init();
    }

    async init() {
        this.cacheDOM();
        this.bindEvents();
        await this.loadPlaylist();
    }

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

    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

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

    pause() {
        this.audio.pause();
        this.isPlaying = false;
        if (this.playBtn) this.playBtn.textContent = '▶';
    }

    playNext() {
        this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
        this.loadTrack(this.currentIndex);
        this.play();
    }

    playPrev() {
        this.currentIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
        this.loadTrack(this.currentIndex);
        this.play();
    }

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

    togglePlayer() {
        if (this.player) {
            this.player.classList.toggle('show');
        }
    }
}

// Initialize player
document.addEventListener('DOMContentLoaded', () => {
    new MusicPlayer();
});
