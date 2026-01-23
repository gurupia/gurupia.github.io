(function () {
    'use strict';

    let isLoadingMascots = false;
    let isAdjustingSlider = false;

    // Central Manager for all mascots
    class MascotManager {
        constructor() {
            this.mascots = [];
            this.selectedMascotId = null;
            this.saveTimeout = null;
            this.isDragging = false;
            this.init();
        }

        init() {
            this.animate();
        }

        add(mascot) {
            this.mascots.push(mascot);
        }

        remove(id) {
            const index = this.mascots.findIndex(m => m.id === id);
            if (index !== -1) {
                const mascot = this.mascots[index];
                if (mascot.element) mascot.element.remove();
                this.mascots.splice(index, 1);

                if (this.selectedMascotId === id) {
                    this.selectedMascotId = this.mascots.length > 0 ? this.mascots[0].id : null;
                }
                this.save();
                return true;
            }
            return false;
        }

        getById(id) {
            return this.mascots.find(m => m.id === id);
        }

        save() {
            if (isLoadingMascots) return;
            if (this.saveTimeout) clearTimeout(this.saveTimeout);
            this.saveTimeout = setTimeout(() => {
                const data = this.mascots.map(m => ({
                    id: m.id,
                    image: m.currentImage,
                    isCustom: m.isCustom,
                    size: m.size,
                    x: m.x,
                    y: m.y,
                    vx: m.vx,
                    vy: m.vy,
                    disabled: m.isDisabled,
                    noFloat: m.isFloatDisabled
                }));
                localStorage.setItem('mascots-data', JSON.stringify(data));
                this.saveTimeout = null;
            }, 500);
        }

        animate() {
            this.mascots.forEach(mascot => {
                if (!mascot.isDisabled) {
                    mascot.update();
                }
            });
            this.handleCollisions();
            requestAnimationFrame(() => this.animate());
        }

        handleCollisions() {
            if (!collisionSettings.enabled) return;
            for (let i = 0; i < this.mascots.length; i++) {
                for (let j = i + 1; j < this.mascots.length; j++) {
                    const m1 = this.mascots[i];
                    const m2 = this.mascots[j];
                    if (m1.checkCollisionWith(m2)) {
                        m1.handleCollision(m2);
                    }
                }
            }
        }
    }

    const manager = new MascotManager();
    let selectedMascotId = null; // Sync with manager and compatibility wrappers

    class Mascot {
        constructor(id, config = {}) {
            this.id = id;
            this.element = null;
            this.x = config.x !== undefined ? config.x : Math.random() * (window.innerWidth - 100);
            this.y = config.y !== undefined ? config.y : Math.random() * (window.innerHeight - 100);
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
            this.currentImage = config.image || 'mascot.png';

            this.messages = ["李뚮Ⅴ吏 留?", "?꾩빞! ?삢", "??洹몃옒!", "洹몃쭔?? ?솀", "媛꾩??ъ썙!", "?붾뫊! ?삤", "?レ뼱!", "?꾨쭩媛?? ?룂", "紐??≪븘! ?삚", "?ㅽ뿤 ?쁽"];
            this.easterEggMessages = ["?뺣쭚 ?ъ떖?섍뎄??.. ?쁾", "?댁젣 洹몃쭔 醫... ??", "?덈Т 留롮씠 李붾??? ?뮖", "?붾궗?? ?삞", "...臾댁떆?좊옒 ?삊", "留덉?留됱쑝濡?李몃뒗?? ??踰덈쭔 ??李붾윭遊?", "Fucking!!", "洹몃쭔 ?꾨Ⅴ?쇨퀬 ?덈떎...", "留덉?留?寃쎄퀬!!", "?덉쓽 ?덇린??媛먰깂?덉뼱~"];

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
            window.addEventListener('resize', () => this.onResize());

            manager.add(this);

            if (manager.mascots.length === 1) {
                this.setupSettings();
            }
        }

        updateVisibility() {
            this.element.style.display = this.isDisabled ? 'none' : 'block';
        }

        updateAnimation() {
            if (this.isCustom) {
                this.element.style.animation = this.isFloatDisabled ? 'none' : 'float 2s ease-in-out infinite';
            } else {
                this.element.style.animation = '';
            }
        }

        updateImage(src, isCustom) {
            this.isCustom = isCustom;
            this.currentImage = src;
            const existingImg = this.element.querySelector('img.custom-mascot-img');
            if (existingImg) existingImg.remove();
            this.element.style.backgroundImage = '';
            this.element.classList.remove('custom-image');

            if (isCustom) {
                this.element.classList.add('custom-image');
                this.element.style.backgroundImage = 'none';
                const img = document.createElement('img');
                img.className = 'custom-mascot-img';
                img.src = src;
                img.style.width = '100%';
                img.style.height = 'auto';
                img.style.display = 'block';
                img.draggable = false;
                this.element.insertBefore(img, this.element.firstChild);
                this.updateAnimation();
            } else {
                this.element.style.backgroundImage = `url('${src}')`;
                this.element.style.backgroundSize = 'contain';
                this.element.style.backgroundPosition = 'center';
                this.element.style.animation = '';
            }
            this.setSize(this.size);
            if (!isLoadingMascots) manager.save();
        }

        setSize(size) {
            this.size = parseInt(size);
            if (this.element) {
                this.element.style.width = `${this.size}px`;
                this.element.style.height = this.isCustom ? 'auto' : `${this.size}px`;
            }
        }

        setupSettings() {
            const btn = document.getElementById('mascot-settings-btn');
            const modal = document.getElementById('mascot-modal');
            const closeBtn = document.getElementById('close-mascot-modal');
            const uploadInput = document.getElementById('mascot-upload');
            const resetBtn = document.getElementById('reset-mascot');
            const sizeSlider = document.getElementById('mascot-size');
            const sizeInput = document.getElementById('mascot-size-input');
            const disableCheckbox = document.getElementById('mascot-disable');
            const noFloatCheckbox = document.getElementById('mascot-no-float');

            if (!btn || !modal) return;

            const updateSettingsUI = () => {
                const selectedMascot = manager.getById(selectedMascotId);
                if (!selectedMascot) return;
                if (!isAdjustingSlider) {
                    if (sizeSlider) sizeSlider.value = selectedMascot.size;
                    if (sizeInput) sizeInput.value = selectedMascot.size;
                }
                if (disableCheckbox) disableCheckbox.checked = selectedMascot.isDisabled;
                if (noFloatCheckbox) noFloatCheckbox.checked = selectedMascot.isFloatDisabled;
            };

            const updateMascotListUI = () => {
                const listContainer = document.getElementById('mascot-list');
                const countSpan = document.getElementById('mascot-count');
                const selectedNameSpan = document.getElementById('selected-mascot-name');
                if (!listContainer) return;

                if (countSpan) countSpan.textContent = `(${manager.mascots.length} active)`;
                if (selectedNameSpan) {
                    const index = manager.mascots.findIndex(m => m.id === selectedMascotId);
                    selectedNameSpan.textContent = `Mascot #${index + 1}`;
                }

                listContainer.innerHTML = '';
                manager.mascots.forEach((mascot, index) => {
                    const item = document.createElement('div');
                    item.dataset.id = mascot.id;
                    item.style.cssText = `padding: 8px; margin: 5px 0; background: ${mascot.id === selectedMascotId ? 'rgba(0,255,65,0.2)' : 'rgba(0,0,0,0.2)'}; border: 1px solid ${mascot.id === selectedMascotId ? 'var(--primary-color)' : 'transparent'}; border-radius: 5px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.3s;`;
                    item.innerHTML = `<span style="flex: 1;"><strong>Mascot #${index + 1}</strong><span class="size-display" style="opacity: 0.7; font-size: 0.9em;"> - ${mascot.size}px ${mascot.isDisabled ? '(Disabled)' : ''}</span></span><button class="btn delete-mascot-btn" data-id="${mascot.id}" style="padding: 3px 8px; font-size: 0.8em;">?뿊截?/button>`;
                    item.addEventListener('click', (e) => {
                        if (!e.target.classList.contains('delete-mascot-btn')) {
                            selectedMascotId = mascot.id;
                            updateMascotListUI();
                            updateSettingsUI();
                        }
                    });
                    const deleteBtn = item.querySelector('.delete-mascot-btn');
                    deleteBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (manager.mascots.length > 1) {
                            manager.remove(mascot.id);
                            updateMascotListUI();
                            updateSettingsUI();
                        } else {
                            alert('Cannot delete the last mascot!');
                        }
                    });
                    listContainer.appendChild(item);
                });
            };

            const createMascotListUI = () => {
                if (document.getElementById('mascot-list')) return;
                const h3 = modal.querySelector('h3');
                if (!h3) return;
                if (!document.getElementById('mascot-count')) {
                    const countSpan = document.createElement('span');
                    countSpan.id = 'mascot-count';
                    countSpan.style.fontSize = '0.8em';
                    countSpan.style.opacity = '0.7';
                    h3.appendChild(countSpan);
                }
                const listSectionHTML = `<div class="mascot-list-section" style="margin-bottom: 20px;"><div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;"><label style="margin: 0; font-weight: bold;">Mascots:</label><button class="btn" id="add-mascot-btn" style="padding: 5px 12px; font-size: 0.9em;">??Add New</button></div><div id="mascot-list" style="max-height: 150px; overflow-y: auto; border: 1px solid var(--primary-color); border-radius: 5px; padding: 10px; background: rgba(0,0,0,0.3);"></div></div><div style="margin-bottom: 15px; padding: 8px; background: rgba(0,255,65,0.1); border-radius: 5px; border: 1px solid var(--primary-color);"><strong>Selected:</strong> <span id="selected-mascot-name">Mascot #1</span></div>`;
                h3.insertAdjacentHTML('afterend', listSectionHTML);
                document.getElementById('add-mascot-btn').addEventListener('click', () => {
                    const newMascot = addMascot({});
                    selectedMascotId = newMascot.id;
                    updateMascotListUI();
                    updateSettingsUI();
                });
                updateMascotListUI();
            };

            createMascotListUI();
            updateSettingsUI();

            if (sizeSlider) {
                const handleSizeChange = (e) => {
                    const selectedMascot = manager.getById(selectedMascotId);
                    if (selectedMascot) {
                        const newSize = parseInt(e.target.value);
                        selectedMascot.setSize(newSize);
                        if (sizeInput) sizeInput.value = newSize;
                        const sizeDisplay = document.querySelector(`#mascot-list [data-id="${selectedMascotId}"] .size-display`);
                        if (sizeDisplay) sizeDisplay.textContent = ` - ${newSize}px ${selectedMascot.isDisabled ? '(Disabled)' : ''}`;
                    }
                };
                sizeSlider.addEventListener('mousedown', () => { isAdjustingSlider = true; });
                sizeSlider.addEventListener('touchstart', () => { isAdjustingSlider = true; });
                sizeSlider.addEventListener('input', handleSizeChange);
                sizeSlider.addEventListener('change', (e) => {
                    const selectedMascot = manager.getById(selectedMascotId);
                    if (selectedMascot) {
                        const finalSize = parseInt(e.target.value);
                        selectedMascot.setSize(finalSize);
                        manager.save();
                        e.target.value = finalSize;
                        setTimeout(() => { e.target.value = finalSize; }, 50);
                    }
                    setTimeout(() => { isAdjustingSlider = false; }, 100);
                });
                sizeSlider.addEventListener('mouseup', () => { isAdjustingSlider = false; });
                sizeSlider.addEventListener('touchend', () => { isAdjustingSlider = false; });
            }

            if (sizeInput) {
                sizeInput.addEventListener('input', (e) => {
                    const mascot = manager.getById(selectedMascotId);
                    if (mascot) {
                        let size = Math.max(32, Math.min(1280, parseInt(e.target.value) || 64));
                        mascot.setSize(size);
                        if (sizeSlider) sizeSlider.value = size;
                    }
                });
                sizeInput.addEventListener('change', (e) => {
                    const mascot = manager.getById(selectedMascotId);
                    if (mascot) {
                        let size = Math.max(32, Math.min(1280, parseInt(e.target.value) || 64));
                        mascot.setSize(size);
                        e.target.value = size;
                        if (sizeSlider) sizeSlider.value = size;
                        manager.save();
                    }
                });
            }

            if (disableCheckbox) disableCheckbox.addEventListener('change', (e) => {
                const mascot = manager.getById(selectedMascotId);
                if (mascot) { mascot.isDisabled = e.target.checked; mascot.updateVisibility(); manager.save(); }
            });

            if (noFloatCheckbox) noFloatCheckbox.addEventListener('change', (e) => {
                const mascot = manager.getById(selectedMascotId);
                if (mascot) { mascot.isFloatDisabled = e.target.checked; mascot.updateAnimation(); manager.save(); }
            });

            btn.addEventListener('click', () => { updateSettingsUI(); updateMascotListUI(); modal.classList.add('show'); });
            closeBtn.addEventListener('click', () => modal.classList.remove('show'));
            window.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('show'); });

            if (uploadInput) uploadInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const mascot = manager.getById(selectedMascotId);
                        if (mascot) mascot.updateImage(event.target.result, true);
                        modal.classList.remove('show');
                    };
                    reader.readAsDataURL(file);
                }
            });

            const dropZone = document.getElementById('mascot-drop-zone');
            if (dropZone) {
                ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(ev => dropZone.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); }));
                ['dragenter', 'dragover'].forEach(ev => dropZone.addEventListener(ev, () => dropZone.classList.add('dragover')));
                ['dragleave', 'drop'].forEach(ev => dropZone.addEventListener(ev, () => dropZone.classList.remove('dragover')));
                dropZone.addEventListener('drop', e => {
                    const file = e.dataTransfer.files[0];
                    if (file && file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = ev => {
                            const mascot = manager.getById(selectedMascotId);
                            if (mascot) mascot.updateImage(ev.target.result, true);
                            modal.classList.remove('show');
                        };
                        reader.readAsDataURL(file);
                    }
                });
                dropZone.addEventListener('click', () => uploadInput.click());
            }

            if (resetBtn) resetBtn.addEventListener('click', () => {
                const mascot = manager.getById(selectedMascotId);
                if (mascot) {
                    mascot.updateImage('mascot.png', false);
                    mascot.setSize(64);
                    mascot.isDisabled = false;
                    mascot.isFloatDisabled = false;
                    mascot.updateVisibility();
                    updateSettingsUI();
                    manager.save();
                    modal.classList.remove('show');
                }
            });

            const createCollisionSettingsUI = () => {
                if (document.getElementById('collision-settings-section')) return;
                const section = document.createElement('div');
                section.id = 'collision-settings-section';
                section.className = 'mascot-option';
                section.style.borderTop = '1px solid var(--primary-color)';
                section.style.paddingTop = '15px';
                section.style.marginTop = '15px';
                section.innerHTML = `<h4 style="color: var(--primary-color); margin-bottom: 10px;">??Collision Settings</h4><div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;"><input type="checkbox" id="collision-enabled" ${collisionSettings.enabled ? 'checked' : ''}><label for="collision-enabled" style="margin: 0; cursor: pointer;">Enable Collisions</label></div><div style="margin-bottom: 10px;"><label for="collision-strength">Collision Strength: <span id="collision-strength-value">${collisionSettings.strength}</span></label><input type="range" id="collision-strength" min="0" max="1" step="0.1" value="${collisionSettings.strength}" style="width: 100%;"></div><div style="display: flex; align-items: center; gap: 10px;"><input type="checkbox" id="collision-messages" ${collisionSettings.showMessages ? 'checked' : ''}><label for="collision-messages" style="margin: 0; cursor: pointer; font-size: 0.9em;">Show Collision Messages</label></div>`;
                modal.querySelector('.mascot-option:last-child').parentNode.insertBefore(section, modal.querySelector('.mascot-option:last-child'));

                document.getElementById('collision-enabled').addEventListener('change', e => {
                    collisionSettings.enabled = e.target.checked;
                    localStorage.setItem('collision-enabled', collisionSettings.enabled);
                });
                const strSlider = document.getElementById('collision-strength');
                const strVal = document.getElementById('collision-strength-value');
                strSlider.addEventListener('input', e => {
                    collisionSettings.strength = parseFloat(e.target.value);
                    strVal.textContent = collisionSettings.strength.toFixed(1);
                    localStorage.setItem('collision-strength', collisionSettings.strength);
                });
                document.getElementById('collision-messages').addEventListener('change', e => {
                    collisionSettings.showMessages = e.target.checked;
                    localStorage.setItem('collision-messages', collisionSettings.showMessages);
                });
            };
            createCollisionSettingsUI();
        }

        onClick(e) {
            e.stopPropagation();
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
            this.showSpeechBubble(this.clickCount > 20 ? this.easterEggMessages[Math.floor(Math.random() * this.easterEggMessages.length)] : this.messages[Math.floor(Math.random() * this.messages.length)]);

            setTimeout(() => {
                this.isRunning = false;
                this.element.classList.remove('running');
                this.vx = (Math.random() - 0.5) * 2;
                this.vy = (Math.random() - 0.5) * 2;
            }, 2000);
        }

        showSpeechBubble(message) {
            const existing = this.element.querySelector('.speech-bubble');
            if (existing) existing.remove();
            const bubble = document.createElement('div');
            bubble.className = 'speech-bubble';
            bubble.textContent = message;
            bubble.style.cssText = 'bottom: 100%; left: 50%; transform: translateX(-50%); margin-bottom: 12px;';
            this.element.appendChild(bubble);
            setTimeout(() => {
                bubble.classList.add('fade-out');
                setTimeout(() => bubble.remove(), 300);
            }, 3000);
        }

        update() {
            if (!this.element) return;
            const currentSpeed = this.isRunning ? this.runningSpeed : this.speed;
            this.x += this.vx * (currentSpeed / this.speed);
            this.y += this.vy * (currentSpeed / this.speed);

            const width = this.element.offsetWidth || this.size;
            const height = this.element.offsetHeight || this.size;
            const maxX = window.innerWidth - width;
            const maxY = window.innerHeight - height;

            if (this.x < 0 || this.x > maxX) { this.vx *= -1; this.x = Math.max(0, Math.min(maxX, this.x)); }
            if (this.y < 0 || this.y > maxY) { this.vy *= -1; this.y = Math.max(0, Math.min(maxY, this.y)); }

            this.element.classList.toggle('flipped', this.vx < 0);

            if (Math.random() < 0.01 && !this.isRunning) {
                this.vx += (Math.random() - 0.5) * 0.5;
                this.vy += (Math.random() - 0.5) * 0.5;
                const s = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                if (s > 2) { this.vx = (this.vx / s) * 2; this.vy = (this.vy / s) * 2; }
            }
            this.element.style.left = this.x + 'px';
            this.element.style.top = this.y + 'px';
        }

        checkCollisionWith(other) {
            if (this.isDisabled || other.isDisabled) return false;
            const r1 = this.size / 2.5;
            const r2 = other.size / 2.5;
            const dist = Math.sqrt(Math.pow((this.x + this.size / 2) - (other.x + other.size / 2), 2) + Math.pow((this.y + this.size / 2) - (other.y + other.size / 2), 2));
            return dist < (r1 + r2);
        }

        getRadius() { return this.size / 2.5; }

        handleCollision(other) {
            const dx = (other.x + other.size / 2) - (this.x + this.size / 2);
            const dy = (other.y + other.size / 2) - (this.y + this.size / 2);
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance === 0) return;
            const nx = dx / distance;
            const ny = dy / distance;
            const rvx = other.vx - this.vx;
            const rvy = other.vy - this.vy;
            const velAlongNormal = rvx * nx + rvy * ny;
            if (velAlongNormal > 0) return;
            const e = collisionSettings.strength;
            const j = -(1 + e) * velAlongNormal / (1 / this.size + 1 / other.size);
            const impulseX = j * nx;
            const impulseY = j * ny;
            this.vx -= impulseX / this.size;
            this.vy -= impulseY / this.size;
            other.vx += impulseX / other.size;
            other.vy += impulseY / other.size;
        }

        onResize() {
            const maxX = window.innerWidth - this.element.offsetWidth;
            const maxY = window.innerHeight - this.element.offsetHeight;
            this.x = Math.min(this.x, maxX);
            this.y = Math.min(this.y, maxY);
        }
    }

    const collisionSettings = { enabled: true, strength: 0.8, showMessages: true };
    const loadCollisionSettings = () => {
        const en = localStorage.getItem('collision-enabled');
        const st = localStorage.getItem('collision-strength');
        const ms = localStorage.getItem('collision-messages');
        if (en !== null) collisionSettings.enabled = en === 'true';
        if (st !== null) collisionSettings.strength = parseFloat(st);
        if (ms !== null) collisionSettings.showMessages = ms === 'true';
    };
    loadCollisionSettings();

    function addMascot(config = {}, skipSave = false) {
        const id = config.id || ('mascot_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9));
        const mascot = new Mascot(id, config);
        if (!skipSave) manager.save();
        return mascot;
    }

    function loadMascotsFromStorage() {
        isLoadingMascots = true;
        const dataStr = localStorage.getItem('mascots-data');
        if (dataStr) {
            try {
                JSON.parse(dataStr).forEach(d => addMascot(d, true));
                if (manager.mascots.length > 0) selectedMascotId = manager.mascots[0].id;
                isLoadingMascots = false;
                return;
            } catch (e) { console.error(e); }
        }
        const oldImg = localStorage.getItem('mascot-image');
        if (oldImg) {
            addMascot({ image: oldImg, isCustom: localStorage.getItem('mascot-is-custom') === 'true', size: parseInt(localStorage.getItem('mascot-size')) || 64, disabled: localStorage.getItem('mascot-disabled') === 'true', noFloat: localStorage.getItem('mascot-no-float') === 'true' });
            ['mascot-image', 'mascot-is-custom', 'mascot-size', 'mascot-disabled', 'mascot-no-float'].forEach(k => localStorage.removeItem(k));
            manager.save();
        } else { addMascot({}); }
        if (manager.mascots.length > 0) selectedMascotId = manager.mascots[0].id;
        isLoadingMascots = false;
    }

    window.addEventListener('load', loadMascotsFromStorage);

})();
