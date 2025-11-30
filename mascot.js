// Mascot Character System
class Mascot {
    constructor() {
        this.element = null;
        this.x = Math.random() * (window.innerWidth - 100);
        this.y = Math.random() * (window.innerHeight - 100);
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.speed = 1.5;
        this.runningSpeed = 2.5; // Slowed down for readability
        this.isRunning = false;
        this.clickCount = 0;
        this.lastClickTime = 0;
        this.isCustom = false;

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
            "...무시할래 😑",
            "마지막으로 참는다 한 번만 더 찔러봐. 그냥 콱",
            "Fucking!!",
            "그만 누르라고 했다...",
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
        const savedSize = localStorage.getItem('mascot-size') || '64';

        if (savedImage) {
            this.updateImage(savedImage, savedIsCustom);
        } else {
            this.updateImage('mascot.png', false);
        }

        this.setSize(savedSize);

        // Event listeners
        this.element.addEventListener('click', (e) => this.onClick(e));
        window.addEventListener('resize', () => this.onResize());

        this.animate();
        this.setupSettings();
    }

    updateImage(src, isCustom) {
        this.isCustom = isCustom;
        this.element.style.backgroundImage = `url('${src}')`;

        if (isCustom) {
            this.element.classList.add('custom-image');
            this.element.style.backgroundSize = 'contain';
            // Reset animation for custom image
            this.element.style.animation = 'float 2s ease-in-out infinite';
        } else {
            this.element.classList.remove('custom-image');
            this.element.style.backgroundSize = '800% 100%';
            this.element.style.animation = ''; // Revert to CSS default
        }

        // Save to localStorage
        if (src.startsWith('data:') || src === 'mascot.png') {
            localStorage.setItem('mascot-image', src);
            localStorage.setItem('mascot-is-custom', isCustom);
        }
    }

    setSize(size) {
        if (this.element) {
            this.element.style.width = `${size}px`;
            this.element.style.height = `${size}px`;
        }
    }

    setupSettings() {
        const btn = document.getElementById('mascot-settings-btn');
        const modal = document.getElementById('mascot-modal');
        const closeBtn = document.getElementById('close-mascot-modal');
        const uploadInput = document.getElementById('mascot-upload');
        const resetBtn = document.getElementById('reset-mascot');
        const sizeSlider = document.getElementById('mascot-size');

        if (!btn || !modal) return;

        // Initialize Slider
        if (sizeSlider) {
            const savedSize = localStorage.getItem('mascot-size') || '64';
            sizeSlider.value = savedSize;

            sizeSlider.addEventListener('input', (e) => {
                const size = e.target.value;
                this.setSize(size);
                localStorage.setItem('mascot-size', size);
            });
        }

        // Open Modal
        btn.addEventListener('click', () => {
            modal.classList.add('show');
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
        if (uploadInput) {
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
        }

        // Handle Reset
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.updateImage('mascot.png', false);
                this.setSize(64);
                if (sizeSlider) sizeSlider.value = 64;
                localStorage.removeItem('mascot-image');
                localStorage.removeItem('mascot-is-custom');
                localStorage.removeItem('mascot-size');
                modal.classList.remove('show');
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
        const existing = this.element.querySelector('.speech-bubble');
        if (existing) {
            existing.remove();
        }

        // Create new bubble
        const bubble = document.createElement('div');
        bubble.className = 'speech-bubble';
        bubble.textContent = message;

        // Position relative to mascot (handled by CSS absolute positioning)
        bubble.style.bottom = '100%';
        bubble.style.left = '50%';
        bubble.style.transform = 'translateX(-50%) translateY(-10px)';
        bubble.style.marginBottom = '10px'; // Spacing

        this.element.appendChild(bubble);

        // Remove after 3 seconds
        setTimeout(() => {
            bubble.classList.add('fade-out');
            setTimeout(() => bubble.remove(), 300);
        }, 3000);
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
