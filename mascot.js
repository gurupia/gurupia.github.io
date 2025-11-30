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
        bubble.style.transform = 'translateX(-50%)';
        bubble.style.marginBottom = '12px'; // Just enough for the arrow (10px) + small gap

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

        // Bounce off edges with dynamic size
        // Use offsetWidth/Height to handle auto-height correctly
        const width = this.element.offsetWidth || this.size;
        const height = this.element.offsetHeight || this.size;

        const maxX = window.innerWidth - width;
        const maxY = window.innerHeight - height;

        if (this.x < 0 || this.x > maxX) {
            this.vx *= -1;
            this.x = Math.max(0, Math.min(maxX, this.x));
        }
        if (this.y < 0 || this.y > maxY) {
            this.vy *= -1;
            this.y = Math.max(0, Math.min(maxY, this.y));
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
        const width = this.element.offsetWidth || this.size;
        const height = this.element.offsetHeight || this.size;
        const maxX = window.innerWidth - width;
        const maxY = window.innerHeight - height;
        this.x = Math.min(this.x, maxX);
        this.y = Math.min(this.y, maxY);
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
