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
        this.playBtn = document.getElementById('play-btn');
        this.prevBtn = document.getElementById('prev-btn');
        this.nextBtn = document.getElementById('next-btn');
        this.volumeSlider = document.getElementById('volume-slider');
        this.playlistContainer = document.getElementById('playlist');
        this.trackTitle = document.getElementById('track-title');
        this.trackArtist = document.getElementById('track-artist');
    }

    bindEvents() {
        this.playerBtn.addEventListener('click', () => this.togglePlayer());
        this.closeBtn.addEventListener('click', () => this.togglePlayer());

        this.playBtn.addEventListener('click', () => this.togglePlay());
        this.prevBtn.addEventListener('click', () => this.playPrev());
        this.nextBtn.addEventListener('click', () => this.playNext());

        this.volumeSlider.addEventListener('input', (e) => {
            this.audio.volume = e.target.value;
        });

        this.audio.addEventListener('ended', () => this.playNext());
    }

    async loadPlaylist() {
        try {
            const response = await fetch('Music/playlist.json');
            if (!response.ok) throw new Error('Failed to load playlist');
            this.playlist = await response.json();
            this.renderPlaylist();

            // Load first track but don't play
            if (this.playlist.length > 0) {
                this.loadTrack(0);
            }
        } catch (error) {
            console.error('Error loading playlist:', error);
            this.playlistContainer.innerHTML = '<div class="playlist-item">Error loading playlist</div>';
        }
    }

    renderPlaylist() {
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
        this.trackTitle.textContent = track.title;
        this.trackArtist.textContent = track.artist;

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
                this.playBtn.textContent = '⏸';
            })
            .catch(e => console.error("Playback failed:", e));
    }

    pause() {
        this.audio.pause();
        this.isPlaying = false;
        this.playBtn.textContent = '▶';
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
        this.player.classList.toggle('show');
    }
}

// Initialize player
document.addEventListener('DOMContentLoaded', () => {
    new MusicPlayer();
});
