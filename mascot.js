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
            function initMascot() {
                if (!mascot) {
                    mascot = new Mascot();
                }
            }

// Auto-start mascot
setTimeout(initMascot, 1000);
