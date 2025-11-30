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
        this.size = 64; // Default size

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
            "그만 누르라고 했다..."
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
        const savedSize = parseInt(localStorage.getItem('mascot-size')) || 64;

        if (savedImage) {
            this.updateImage(savedImage, savedIsCustom);
        } else {
            this.updateImage('mascot.png', false);
        }

        this.setSize(savedSize);

        // Event listeners
        this.element.addEventListener('click', (e) => this.onClick(e));
        window.addEventListener('resize', () => this.onResize());

        let mascot = null;

        function initMascot() {
            if (!mascot) {
                mascot = new Mascot();
            }
        }

        // Auto-start mascot
        setTimeout(initMascot, 1000);
