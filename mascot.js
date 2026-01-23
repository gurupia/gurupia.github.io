// Mascot Character System
let isLoadingMascots = false;
let isAdjustingSlider = false;
let mascots = [];
let projectiles = [];
let selectedMascotId = null;
const MAX_PROJECTILES = 100;
const collisionSettings = { enabled: true, strength: 0.8 };

class Projectile {
    constructor(x, y, vx, vy, type, targetMascot = null) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.type = type;
        this.targetMascot = targetMascot;
        this.element = document.createElement('div');
        this.element.className = `projectile ${type}`;
        this.element.style.left = x + 'px';
        this.element.style.top = y + 'px';
        document.body.appendChild(this.element);

        this.lifeTime = 0;
        this.maxLifeTime = type === 'flame' ? 30 : 200;
        this.alive = true;
    }

    update() {
        if (!this.alive) return;

        if (this.type === 'missile' && this.targetMascot) {
            const dx = this.targetMascot.x + this.targetMascot.size / 2 - this.x;
            const dy = this.targetMascot.y + this.targetMascot.size / 2 - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 5) {
                this.vx += (dx / dist) * 0.5;
                this.vy += (dy / dist) * 0.5;
                const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                if (speed > 10) {
                    this.vx = (this.vx / speed) * 10;
                    this.vy = (this.vy / speed) * 10;
                }
                const angle = Math.atan2(this.vy, this.vx);
                this.element.style.transform = `rotate(${angle + Math.PI / 2}rad)`;
            }
        }

        this.x += this.vx;
        this.y += this.vy;
        this.element.style.left = this.x + 'px';
        this.element.style.top = this.y + 'px';

        this.lifeTime++;
        if (this.lifeTime > this.maxLifeTime) {
            this.destroy();
        }

        // Hit Detection
        if (this.type !== 'flame' || this.lifeTime % 5 === 0) {
            mascots.forEach(m => {
                if (m.isDisabled) return;
                const dx = this.x - (m.x + m.size / 2);
                const dy = this.y - (m.y + m.size / 2);
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < m.size / 2) {
                    if (this.type === 'grenade') {
                        this.explode();
                    } else {
                        m.createImpact(this.type === 'flame' ? 'scorch' : 'hole', this.x - m.x, this.y - m.y);
                        if (this.type !== 'flame') this.destroy();
                    }
                }
            });
        }
    }

    explode() {
        const explosion = document.createElement('div');
        explosion.className = 'explosion-effect';
        explosion.style.left = (this.x - 50) + 'px';
        explosion.style.top = (this.y - 50) + 'px';
        document.body.appendChild(explosion);
        setTimeout(() => explosion.remove(), 500);

        mascots.forEach(m => {
            const dx = this.x - (m.x + m.size / 2);
            const dy = this.y - (m.y + m.size / 2);
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 100) {
                m.createImpact('scorch', (m.size / 2) + (Math.random() - 0.5) * m.size / 2, (m.size / 2) + (Math.random() - 0.5) * m.size / 2);
                const pushX = (dx / dist || 0) * -10;
                const pushY = (dy / dist || 0) * -10;
                m.vx += pushX;
                m.vy += pushY;
            }
        });
        this.destroy();
    }

    destroy() {
        if (!this.alive) return;
        this.alive = false;
        this.element.remove();
        const idx = projectiles.indexOf(this);
        if (idx > -1) projectiles.splice(idx, 1);
    }
}

class Mascot {
    constructor(id, config = {}) {
        this.id = id;
        this.element = null;
        this.x = config.x !== undefined ? config.x : 50 + Math.random() * (window.innerWidth - 200);
        this.y = config.y !== undefined ? config.y : 50 + Math.random() * (window.innerHeight - 200);
        this.vx = config.vx !== undefined ? config.vx : (Math.random() - 0.5) * 2;
        this.vy = config.vy !== undefined ? config.vy : (Math.random() - 0.5) * 2;
        this.speed = 1.5;
        this.runningSpeed = 2.5;
        this.isRunning = false;
        this.clickCount = 0;
        this.lastClickTime = 0;
        this.isCustom = config.isCustom || false;
        this.size = config.size || 64;
        this.isDisabled = config.disabled || false;
        this.isFloatDisabled = config.noFloat || false;
        this.is3DEffectEnabled = config.effect3d || false;
        this.isActionModeEnabled = config.actionMode || false;
        this.weaponType = config.weaponType || 'machinegun';
        this.currentImage = config.image || 'mascot.png';

        this.messages = [
            "찌르지 마!", "아야! 😣", "왜 그래!", "그만해! 🙅", "간지러워!",
            "놔둬! 😤", "싫어!", "도망가자! 🏃", "못 잡아! 😝", "헤헤 😄"
        ];

        this.easterEggMessages = [
            "정말 심심하구나... 😅", "이제 그만 좀... 🥺", "너무 많이 찔렀어! 💢",
            "화났어! 😡", "...무시할래 😑", "마지막으로 참는다. 한 번만 더 찔러봐.",
            "Fucking!!", "그만 누르라고 했다...", "마지막 경고!!", "너의 끈기에 감탄했어~"
        ];

        this.init();
    }

    init() {
        this.element = document.createElement('div');
        this.element.className = 'mascot';
        this.element.style.left = this.x + 'px';
        this.element.style.top = this.y + 'px';
        this.element.dataset.mascotId = this.id;
        document.body.appendChild(this.element);

        this.updateImage(this.currentImage, this.isCustom);
        this.setSize(this.size);
        this.updateVisibility();

        this.element.addEventListener('click', (e) => this.onClick(e));
        this.element.addEventListener('mousedown', (e) => {
            if (this.isActionModeEnabled && e.button === 0) {
                this.startShooting(e);
            }
        });
        this.element.addEventListener('mousemove', (e) => this.onMouseMove(e));

        this.resizeHandler = () => this.onResize();
        window.addEventListener('resize', this.resizeHandler);
    }

    destroy() {
        if (this.element) this.element.remove();
        if (this.shootInterval) clearInterval(this.shootInterval);
        window.removeEventListener('resize', this.resizeHandler);
        this.element = null;
    }

    onClick(e) {
        e.stopPropagation();
        if (this.isActionModeEnabled) {
            if (!this.shootInterval) this.fireWeapon();
            return;
        }

        this.clickCount++;
        const now = Date.now();
        if (now - this.lastClickTime < 500) this.clickCount += 2;
        this.lastClickTime = now;

        const rect = this.element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const angle = Math.atan2(centerY - e.clientY, centerX - e.clientX);
        this.vx = Math.cos(angle) * this.runningSpeed;
        this.vy = Math.sin(angle) * this.runningSpeed;

        this.isRunning = true;
        this.element.classList.add('running');
        this.updateAnimation();

        let message = (this.clickCount > 20)
            ? this.easterEggMessages[Math.floor(Math.random() * this.easterEggMessages.length)]
            : this.messages[Math.floor(Math.random() * this.messages.length)];

        this.showSpeechBubble(message);

        setTimeout(() => {
            if (!this.element) return;
            this.isRunning = false;
            this.element.classList.remove('running');
            this.vx = (Math.random() - 0.5) * 2;
            this.vy = (Math.random() - 0.5) * 2;
            this.updateAnimation();
        }, 2000);
    }

    updateVisibility() {
        if (!this.element) return;
        this.element.style.display = this.isDisabled ? 'none' : 'block';
        this.update3DEffects();
    }

    update3DEffects() {
        if (!this.element) return;
        if (this.is3DEffectEnabled && !this.isDisabled) {
            this.element.classList.add('effect-3d');
        } else {
            this.element.classList.remove('effect-3d');
            this.element.style.setProperty('--tilt-x', '0deg');
            this.element.style.setProperty('--tilt-y', '0deg');
        }
    }

    onMouseMove(e) {
        if (!this.is3DEffectEnabled || this.isDisabled || !this.element) return;
        const rect = this.element.getBoundingClientRect();
        const mouseX = e.clientX - (rect.left + rect.width / 2);
        const mouseY = e.clientY - (rect.top + rect.height / 2);
        const tiltX = (mouseY / (rect.height / 2)) * -20;
        const tiltY = (mouseX / (rect.width / 2)) * 20;
        this.element.style.setProperty('--tilt-x', `${tiltX}deg`);
        this.element.style.setProperty('--tilt-y', `${tiltY}deg`);
    }

    onMouseLeave() {
        if (!this.element) return;
        this.element.style.setProperty('--tilt-x', '0deg');
        this.element.style.setProperty('--tilt-y', '0deg');
    }

    updateAnimation() {
        if (!this.element) return;
        if (this.isCustom) {
            this.element.style.animation = this.isFloatDisabled ? 'none' : 'float 2s ease-in-out infinite';
        } else {
            this.element.style.animation = '';
        }
        // Force dispersion on update if overlapping or just created
        if (Math.random() < 0.05) {
            this.vx += (Math.random() - 0.5) * 0.1;
            this.vy += (Math.random() - 0.5) * 0.1;
        }
    }

    startShooting(e) {
        if (this.shootInterval) return;
        this.fireWeapon();
        const rate = (this.weaponType === 'machinegun') ? 100 : ((this.weaponType === 'flamethrower') ? 80 : 0);
        if (rate > 0) this.shootInterval = setInterval(() => this.fireWeapon(), rate);
    }

    stopShooting() {
        if (this.shootInterval) {
            clearInterval(this.shootInterval);
            this.shootInterval = null;
        }
    }

    setActionMode(enabled) {
        this.isActionModeEnabled = enabled;
        this.stopShooting();
        if (this.element) {
            const sec = document.getElementById('weapon-selection');
            if (selectedMascotId === this.id && sec) {
                sec.style.display = enabled ? 'block' : 'none';
            }
        }
        this.updateVisibility();
    }

    setWeaponType(type) {
        const wasShooting = !!this.shootInterval;
        if (wasShooting) this.stopShooting();
        this.weaponType = type;
        // If it was shooting, we don't necessarily restart automatically 
        // because it depends on mouse state, but usually changing weapon 
        // in UI is enough to reset.
    }

    fireWeapon() {
        if (!this.element || !this.isActionModeEnabled || this.isDisabled) {
            this.stopShooting();
            return;
        }
        const rect = this.element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        switch (this.weaponType) {
            case 'machinegun': this.fireBullet(centerX, centerY); break;
            case 'shotgun': for (let i = -2; i <= 2; i++) this.fireBullet(centerX, centerY, i * 0.2); break;
            case 'flamethrower': this.fireFlame(centerX, centerY); break;
            case 'grenade': this.fireGrenade(centerX, centerY); break;
            case 'missile': this.fireMissile(centerX, centerY); break;
        }
    }

    fireBullet(x, y, angleOffset = 0) {
        const angle = (Math.random() - 0.5) * 0.1 + angleOffset;
        const vx = Math.cos(angle - Math.PI / 2) * 15;
        const vy = Math.sin(angle - Math.PI / 2) * 15;
        projectiles.push(new Projectile(x, y, vx, vy, 'bullet'));
    }

    fireFlame(x, y) {
        const angle = (Math.random() - 0.5) * 0.5 - Math.PI / 2;
        const speed = 5 + Math.random() * 5;
        projectiles.push(new Projectile(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 'flame'));
    }

    fireGrenade(x, y) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.2;
        projectiles.push(new Projectile(x, y, Math.cos(angle) * 8, Math.sin(angle) * 8, 'grenade'));
    }

    fireMissile(x, y) {
        const others = mascots.filter(m => m !== this && !m.isDisabled);
        const target = others.length > 0 ? others[Math.floor(Math.random() * others.length)] : null;
        projectiles.push(new Projectile(x, y, 0, -5, 'missile', target));
    }

    createImpact(type, x, y) {
        if (!this.element) return;
        const mark = document.createElement('div');
        mark.className = `impact-mark impact-${type}`;
        mark.style.left = x + 'px';
        mark.style.top = y + 'px';
        this.element.appendChild(mark);
        setTimeout(() => { if (mark.parentElement) mark.remove(); }, 3000);
    }

    showSpeechBubble(message) {
        if (!this.element) return;
        const existing = this.element.querySelector('.speech-bubble');
        if (existing) existing.remove();
        const bubble = document.createElement('div');
        bubble.className = 'speech-bubble';
        bubble.textContent = message;
        bubble.style.bottom = '100%';
        bubble.style.left = '50%';
        bubble.style.transform = 'translateX(-50%)';
        bubble.style.marginBottom = '12px';
        this.element.appendChild(bubble);
        setTimeout(() => {
            if (!bubble.parentElement) return;
            bubble.classList.add('fade-out');
            setTimeout(() => { if (bubble.parentElement) bubble.remove(); }, 300);
        }, 3000);
    }

    updateImage(src, isCustom) {
        if (!this.element) return;
        this.isCustom = isCustom;
        this.currentImage = src;
        const existingImg = this.element.querySelector('img.custom-mascot-img');
        if (existingImg) existingImg.remove();
        this.element.style.backgroundImage = '';
        this.element.classList.remove('custom-image');
        if (isCustom) {
            this.element.classList.add('custom-image');
            const img = document.createElement('img');
            img.className = 'custom-mascot-img';
            img.src = src;
            img.style.width = '100%';
            img.style.height = 'auto';
            img.style.display = 'block';
            img.draggable = false;
            this.element.insertBefore(img, this.element.firstChild);
        } else {
            this.element.style.backgroundImage = `url('${src}')`;
            this.element.style.backgroundSize = 'contain';
            this.element.style.backgroundPosition = 'center';
        }
        this.setSize(this.size);
        this.updateAnimation();
        if (!isLoadingMascots) saveMascotsToStorage();
    }

    setSize(size) {
        this.size = parseInt(size);
        if (this.element) {
            this.element.style.width = `${this.size}px`;
            this.element.style.height = this.isCustom ? 'auto' : `${this.size}px`;
        }
    }

    updatePosition() {
        if (!this.element) return;
        const curSpd = this.isRunning ? this.runningSpeed : this.speed;
        this.x += this.vx * (curSpd / this.speed);
        this.y += this.vy * (curSpd / this.speed);

        const w = (this.element ? this.element.offsetWidth : this.size) || this.size;
        const h = (this.element ? this.element.offsetHeight : this.size) || this.size;
        const mxX = window.innerWidth - w;
        const mxY = window.innerHeight - h;

        if (this.x < 0 || this.x > mxX) { this.vx *= -1; this.x = Math.max(0, Math.min(mxX, this.x)); }
        if (this.y < 0 || this.y > mxY) { this.vy *= -1; this.y = Math.max(0, Math.min(mxY, this.y)); }

        if (this.vx < 0) this.element.classList.add('flipped');
        else this.element.classList.remove('flipped');

        if (Math.random() < 0.01 && !this.isRunning) {
            this.vx += (Math.random() - 0.5) * 0.5;
            this.vy += (Math.random() - 0.5) * 0.5;
            const s = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            if (s > 2) { this.vx = (this.vx / s) * 2; this.vy = (this.vy / s) * 2; }
        }

        this.element.style.left = this.x + 'px';
        this.element.style.top = this.y + 'px';
    }

    getCenter() {
        const w = (this.element ? this.element.offsetWidth : this.size) || this.size;
        const h = (this.element ? this.element.offsetHeight : this.size) || this.size;
        return { x: this.x + w / 2, y: this.y + h / 2 };
    }

    getRadius() {
        const w = (this.element ? this.element.offsetWidth : this.size) || this.size;
        const h = (this.element ? this.element.offsetHeight : this.size) || this.size;
        return (w + h) / 4;
    }

    checkCollisionWith(other) {
        if (!other || other.id === this.id || this.isDisabled || other.isDisabled) return false;
        const c1 = this.getCenter(), c2 = other.getCenter();
        const dist = Math.sqrt((c2.x - c1.x) ** 2 + (c2.y - c1.y) ** 2);
        return dist < (this.getRadius() + other.getRadius());
    }

    handleCollision(other) {
        if (!collisionSettings.enabled) return;
        const c1 = this.getCenter(), c2 = other.getCenter();
        let dx = c2.x - c1.x, dy = c2.y - c1.y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        const minDistance = (this.getRadius() + other.getRadius());

        if (dist < 10) {
            // Strong kick for tight overlaps
            const angle = Math.random() * Math.PI * 2;
            const force = 4;
            this.vx -= Math.cos(angle) * force;
            this.vy -= Math.sin(angle) * force;
            other.vx += Math.cos(angle) * force;
            other.vy += Math.sin(angle) * force;
            // Physical displacement to break deadlock
            const sep = 10;
            this.x -= Math.cos(angle) * sep;
            this.y -= Math.sin(angle) * sep;
            return;
        }

        const nx = dx / dist, ny = dy / dist;
        const dvn = (other.vx - this.vx) * nx + (other.vy - this.vy) * ny;
        if (dvn > 0) return;
        const m1 = this.size / 64, m2 = other.size / 64;
        const impulse = (-(1 + collisionSettings.strength) * dvn) / (1 / m1 + 1 / m2);
        this.vx -= (impulse * nx) / m1; this.vy -= (impulse * ny) / m1;
        other.vx += (impulse * nx) / m2; other.vy += (impulse * ny) / m2;

        const overlap = minDistance - dist;
        if (overlap > 0) {
            const pushX = nx * overlap / 1.1; // Aggressive separation
            const pushY = ny * overlap / 1.1;
            this.x -= pushX; this.y -= pushY;
            other.x += pushX; other.y += pushY;
        }
    }

    onResize() {
        if (!this.element) return;
        const mxX = window.innerWidth - (this.element.offsetWidth || this.size);
        const mxY = window.innerHeight - (this.element.offsetHeight || this.size);
        this.x = Math.min(this.x, mxX);
        this.y = Math.min(this.y, mxY);
    }
}

// GLOBAL UI CORE
function setupGlobalMascotUI() {
    const modal = document.getElementById('mascot-modal');
    const btn = document.getElementById('mascot-settings-btn');
    if (!modal || !btn) return;

    const updateSettingsUI = () => {
        const m = getMascotById(selectedMascotId);
        if (!m) return;
        const sizeSlider = document.getElementById('mascot-size');
        const sizeInput = document.getElementById('mascot-size-input');
        const disableCheck = document.getElementById('mascot-disable');
        const noFloatCheck = document.getElementById('mascot-no-float');
        const effect3dCheck = document.getElementById('mascot-effect-3d');
        const actionCheck = document.getElementById('mascot-action-mode');
        const weaponSel = document.getElementById('mascot-weapon');
        const weaponSec = document.getElementById('weapon-selection');

        if (!isAdjustingSlider) {
            if (sizeSlider) sizeSlider.value = m.size;
            if (sizeInput) sizeInput.value = m.size;
        }
        if (disableCheck) disableCheck.checked = m.isDisabled;
        if (noFloatCheck) noFloatCheck.checked = m.isFloatDisabled;
        if (effect3dCheck) effect3dCheck.checked = m.is3DEffectEnabled;
        if (actionCheck) actionCheck.checked = m.isActionModeEnabled;
        if (weaponSel) weaponSel.value = m.weaponType;
        if (weaponSec) weaponSec.style.display = m.isActionModeEnabled ? 'block' : 'none';
    };

    const tabBtns = modal.querySelectorAll('.tab-btn');
    const tabContents = modal.querySelectorAll('.tab-content');
    tabBtns.forEach(b => {
        b.addEventListener('click', () => {
            const tabId = b.dataset.tab;
            tabBtns.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            b.classList.add('active');
            const target = document.getElementById(`tab-${tabId}`);
            if (target) target.classList.add('active');
        });
    });

    const updateMascotListUI = () => {
        const list = document.getElementById('mascot-list');
        if (!list) return;
        const count = document.getElementById('mascot-count');
        if (count) count.textContent = `(${mascots.length} active)`;
        const nameEl = document.getElementById('selected-mascot-name');
        if (nameEl) nameEl.textContent = `Mascot #${mascots.findIndex(m => m.id === selectedMascotId) + 1}`;

        list.innerHTML = '';
        mascots.forEach((m, i) => {
            const item = document.createElement('div');
            item.style.cssText = `padding: 8px; margin: 5px 0; background: ${m.id === selectedMascotId ? 'rgba(0,255,65,0.2)' : 'rgba(0,0,0,0.2)'}; border: 1px solid ${m.id === selectedMascotId ? 'var(--primary-color)' : 'transparent'}; border-radius: 5px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; color: white;`;
            item.innerHTML = `<span><strong>Mascot #${i + 1}</strong> <span style="opacity:0.7;font-size:0.9em;">- ${m.size}px</span></span><button class="btn delete-btn" style="padding:2px 6px;">🗑️</button>`;
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('delete-btn')) {
                    selectedMascotId = m.id;
                    updateMascotListUI();
                    updateSettingsUI();
                }
            });
            item.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                if (mascots.length > 1) {
                    removeMascot(m.id);
                    updateMascotListUI();
                    updateSettingsUI();
                } else {
                    alert('Cannot delete last mascot!');
                }
            });
            list.appendChild(item);
        });
    };

    const addBtn = document.getElementById('add-mascot-btn');
    if (addBtn) addBtn.addEventListener('click', () => {
        const m = addMascot({});
        selectedMascotId = m.id;
        updateMascotListUI();
        updateSettingsUI();
    });

    const sizeSlider = document.getElementById('mascot-size');
    if (sizeSlider) {
        sizeSlider.addEventListener('input', (e) => {
            const m = getMascotById(selectedMascotId);
            if (m) {
                m.setSize(e.target.value);
                const inp = document.getElementById('mascot-size-input');
                if (inp) inp.value = e.target.value;
            }
        });
        sizeSlider.addEventListener('change', () => saveMascotsToStorage());
    }

    const sizeInput = document.getElementById('mascot-size-input');
    if (sizeInput) {
        sizeInput.addEventListener('change', (e) => {
            const m = getMascotById(selectedMascotId);
            if (m) {
                m.setSize(e.target.value);
                const sli = document.getElementById('mascot-size');
                if (sli) sli.value = e.target.value;
                saveMascotsToStorage();
            }
        });
    }

    const closeMod = document.getElementById('close-mascot-modal');
    if (closeMod) closeMod.addEventListener('click', () => modal.classList.remove('show'));

    const disableCheck = document.getElementById('mascot-disable');
    if (disableCheck) disableCheck.addEventListener('change', (e) => {
        const m = getMascotById(selectedMascotId);
        if (m) { m.isDisabled = e.target.checked; m.updateVisibility(); saveMascotsToStorage(); }
    });

    const noFloatCheck = document.getElementById('mascot-no-float');
    if (noFloatCheck) noFloatCheck.addEventListener('change', (e) => {
        const m = getMascotById(selectedMascotId);
        if (m) { m.isFloatDisabled = e.target.checked; m.updateAnimation(); saveMascotsToStorage(); }
    });

    const effect3dCheck = document.getElementById('mascot-effect-3d');
    if (effect3dCheck) effect3dCheck.addEventListener('change', (e) => {
        const m = getMascotById(selectedMascotId);
        if (m) { m.is3DEffectEnabled = e.target.checked; m.update3DEffects(); saveMascotsToStorage(); }
    });

    const actionCheck = document.getElementById('mascot-action-mode');
    if (actionCheck) actionCheck.addEventListener('change', (e) => {
        const m = getMascotById(selectedMascotId);
        if (m) {
            m.setActionMode(e.target.checked);
            saveMascotsToStorage();
        }
    });

    const weaponSel = document.getElementById('mascot-weapon');
    if (weaponSel) weaponSel.addEventListener('change', (e) => {
        const m = getMascotById(selectedMascotId);
        if (m) {
            m.setWeaponType(e.target.value);
            saveMascotsToStorage();
        }
    });

    const uploadInp = document.getElementById('mascot-upload');
    if (uploadInp) uploadInp.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const m = getMascotById(selectedMascotId);
                if (m) m.updateImage(ev.target.result, true);
            };
            reader.readAsDataURL(file);
        }
    });

    btn.addEventListener('click', () => {
        updateMascotListUI();
        updateSettingsUI();
        modal.classList.add('show');
    });

    updateMascotListUI();
    updateSettingsUI();
}

function generateMascotId() { return 'mascot_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9); }
function getMascotById(id) { return mascots.find(m => m.id === id); }

function checkAllCollisions() {
    if (!collisionSettings.enabled || mascots.length < 2) return;
    for (let i = 0; i < mascots.length; i++) {
        for (let j = i + 1; j < mascots.length; j++) {
            if (mascots[i].checkCollisionWith(mascots[j])) mascots[i].handleCollision(mascots[j]);
        }
    }
}

function addMascot(config = {}, skipSave = false) {
    const m = new Mascot(config.id || generateMascotId(), config);
    mascots.push(m);
    if (!skipSave && !isLoadingMascots) saveMascotsToStorage();
    return m;
}

function removeMascot(id) {
    const idx = mascots.findIndex(m => m.id === id);
    if (idx !== -1) {
        mascots[idx].destroy();
        mascots.splice(idx, 1);
        if (selectedMascotId === id) selectedMascotId = mascots.length > 0 ? mascots[0].id : null;
        saveMascotsToStorage();
        return true;
    }
    return false;
}

function saveMascotsToStorage() {
    localStorage.setItem('mascots-data', JSON.stringify(mascots.map(m => ({
        id: m.id, image: m.currentImage, isCustom: m.isCustom, size: m.size,
        x: m.x, y: m.y, vx: m.vx, vy: m.vy, disabled: m.isDisabled,
        noFloat: m.isFloatDisabled, effect3d: m.is3DEffectEnabled,
        actionMode: m.isActionModeEnabled, weaponType: m.weaponType
    }))));
}

function loadMascotsFromStorage() {
    isLoadingMascots = true;
    // Clear existing
    mascots.forEach(m => m.destroy());
    mascots = [];

    const data = localStorage.getItem('mascots-data');
    if (data) {
        try {
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed) && parsed.length > 0) {
                parsed.forEach(d => addMascot(d, true));
            } else {
                addMascot({});
            }
        } catch (e) {
            console.error('Mascot load error:', e);
            addMascot({});
        }
    } else {
        addMascot({});
    }
    if (mascots.length > 0) selectedMascotId = mascots[0].id;
    isLoadingMascots = false;
}

function globalUpdate() {
    if (projectiles.length > MAX_PROJECTILES) {
        const toRemove = projectiles.length - MAX_PROJECTILES;
        for (let i = 0; i < toRemove; i++) {
            if (projectiles[0]) projectiles[0].destroy();
        }
    }
    projectiles.forEach(p => p.update());
    mascots.forEach(m => {
        if (!m.isDisabled) m.updatePosition();
    });
    checkAllCollisions();
    requestAnimationFrame(globalUpdate);
}

// BOOTSTRAP
function initMascotSystem() {
    loadMascotsFromStorage();
    setupGlobalMascotUI();

    // Global Event Cleanup (Firefox Safety)
    window.addEventListener('mouseup', () => {
        mascots.forEach(m => m.stopShooting());
    });
    window.addEventListener('blur', () => {
        mascots.forEach(m => m.stopShooting());
    });
    window.addEventListener('contextmenu', () => {
        mascots.forEach(m => m.stopShooting());
    });

    globalUpdate();
}

if (document.readyState === 'complete') {
    initMascotSystem();
} else {
    window.addEventListener('load', initMascotSystem);
}
