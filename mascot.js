// Mascot Character System
class Mascot {
    constructor() {
        this.element = null;
        this.x = Math.random() * (window.innerWidth - 100);
        this.y = Math.random() * (window.innerHeight - 100);
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.speed = 1.5;
        this.runningSpeed = 4;
        this.isRunning = false;
        this.clickCount = 0;
        this.lastClickTime = 0;
        this.isCustom = false;
        this.soundEnabled = false;
        this.synth = window.speechSynthesis;
        this.voice = null;

        this.messages = [
            "찌르지 마!",
            "아야! 😣",
            "왜 그래!",
            "그만해! 🙅",
            "간지러워!",
            "놔둬! 😤",
            "싫어!",
            "도망가자! 🏃",
            "못 잡아! 😝",
            "헤헤 😄"
        ];

        this.easterEggMessages = [
            "정말 심심하구나... 😅",
            "이제 그만 좀... 🥺",
            "너무 많이 찔렀어! 💢",
            "화났어! 😡",
            "...무시할래 😑"
        ];

        this.init();
    }

    init() {
        // Create mascot element
        this.element = document.createElement('div');
        this.element.className = 'mascot';
        this.element.style.left = this.x + 'px';
        this.element.style.top = this.y + 'px';
        document.body.appendChild(this.element);

        // Load saved character
        const savedImage = localStorage.getItem('mascot-image');
        const savedIsCustom = localStorage.getItem('mascot-is-custom') === 'true';

        if (savedImage) {
            this.updateImage(savedImage, savedIsCustom);
        } else {
            this.updateImage('mascot.png', false);
        }

        // Event listeners
        this.element.addEventListener('click', (e) => this.onClick(e));
        window.addEventListener('resize', () => this.onResize());

        this.animate();
        this.setupSettings();
        this.initSpeech();
    }

    setupSettings() {
        const btn = document.getElementById('mascot-settings-btn');
        const modal = document.getElementById('mascot-modal');
        const closeBtn = document.getElementById('close-mascot-modal');
        const uploadInput = document.getElementById('mascot-upload');
        const resetBtn = document.getElementById('reset-mascot');
        const soundToggle = document.getElementById('mascot-sound-toggle');

        if (!btn || !modal) return;

        // Open Modal
        btn.addEventListener('click', () => {
            modal.classList.add('show');
            if (soundToggle) {
                soundToggle.checked = this.soundEnabled;
            }
        });

        // Close Modal
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('show');
        });

        // Close on outside click
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        });

        // Handle File Upload
        uploadInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    this.updateImage(event.target.result, true);
                    modal.classList.remove('show');
                };
                reader.readAsDataURL(file);
            }
        });

        // Handle Reset
        resetBtn.addEventListener('click', () => {
            this.updateImage('mascot.png', false);
            localStorage.removeItem('mascot-image');
            localStorage.removeItem('mascot-is-custom');
            modal.classList.remove('show');
        });

        // Handle Sound Toggle
        if (soundToggle) {
            soundToggle.addEventListener('change', (e) => {
                this.soundEnabled = e.target.checked;
                localStorage.setItem('mascot-sound', this.soundEnabled);

                if (this.soundEnabled) {
                    this.speak("목소리가 들리나요?");
                }
            });
        }
    }

    onClick(e) {
        e.stopPropagation();
        this.clickCount++;
        const now = Date.now();

        // Check for rapid clicks
        if (now - this.lastClickTime < 500) {
            this.clickCount += 2; // Bonus for rapid clicking
        }
        this.lastClickTime = now;

        // Run away from click
        const rect = this.element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const angle = Math.atan2(centerY - e.clientY, centerX - e.clientX);
        this.vx = Math.cos(angle) * this.runningSpeed;
        this.vy = Math.sin(angle) * this.runningSpeed;

        this.isRunning = true;
        this.element.classList.add('running');

        // Show message
        let message;
        if (this.clickCount > 20) {
            message = this.easterEggMessages[Math.floor(Math.random() * this.easterEggMessages.length)];
        } else {
            message = this.messages[Math.floor(Math.random() * this.messages.length)];
        }

        this.showSpeechBubble(message);
        this.speak(message);

        // Stop running after a while
        setTimeout(() => {
            this.isRunning = false;
            this.element.classList.remove('running');
            this.vx = (Math.random() - 0.5) * 2;
            this.vy = (Math.random() - 0.5) * 2;
        }, 2000);
    }

    showSpeechBubble(message) {
        // Remove existing bubble
        const existing = document.querySelector('.speech-bubble');
        if (existing) {
            existing.remove();
        }

        // Create new bubble
        const bubble = document.createElement('div');
        bubble.className = 'speech-bubble';
        bubble.textContent = message;

        const rect = this.element.getBoundingClientRect();
        bubble.style.left = (rect.left + rect.width / 2) + 'px';
        bubble.style.top = (rect.top - 50) + 'px';
        bubble.style.transform = 'translateX(-50%)';

        document.body.appendChild(bubble);

        // Remove after 2 seconds
        setTimeout(() => {
            bubble.classList.add('fade-out');
            setTimeout(() => bubble.remove(), 300);
        }, 2000);
    }

    animate() {
        // Update position
        const currentSpeed = this.isRunning ? this.runningSpeed : this.speed;
        this.x += this.vx * (currentSpeed / this.speed);
        this.y += this.vy * (currentSpeed / this.speed);

        // Bounce off edges
        if (this.x < 0 || this.x > window.innerWidth - 60) {
            this.vx *= -1;
            this.x = Math.max(0, Math.min(window.innerWidth - 60, this.x));
        }
        if (this.y < 0 || this.y > window.innerHeight - 60) {
            this.vy *= -1;
            this.y = Math.max(0, Math.min(window.innerHeight - 60, this.y));
        }

        // Flip direction
        if (this.vx < 0) {
            this.element.classList.add('flipped');
        } else {
            this.element.classList.remove('flipped');
        }

        // Random direction change
        if (Math.random() < 0.01 && !this.isRunning) {
            this.vx += (Math.random() - 0.5) * 0.5;
            this.vy += (Math.random() - 0.5) * 0.5;

            // Limit speed
            const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            if (speed > 2) {
                this.vx = (this.vx / speed) * 2;
                this.vy = (this.vy / speed) * 2;
            }
        }

        // Apply position
        this.element.style.left = this.x + 'px';
        this.element.style.top = this.y + 'px';

        requestAnimationFrame(() => this.animate());
    }

    onResize() {
        this.x = Math.min(this.x, window.innerWidth - 60);
        this.y = Math.min(this.y, window.innerHeight - 60);
    }
}

// Initialize mascot when page loads
let mascot = null;

function initMascot() {
    if (!mascot) {
        mascot = new Mascot();
    }
}

// Auto-start mascot
setTimeout(initMascot, 1000);
