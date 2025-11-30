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

    setupSettings() {
        const btn = document.getElementById('mascot-settings-btn');
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
