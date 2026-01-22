// Mascot Character System
class Mascot {
    constructor(id, config = {}) {
        this.id = id;
        this.element = null;
        this.x = config.x !== undefined ? config.x : Math.random() * (window.innerWidth - 100);
        this.y = config.y !== undefined ? config.y : Math.random() * (window.innerHeight - 100);
        this.vx = config.vx !== undefined ? config.vx : (Math.random() - 0.5) * 2;
        this.vy = config.vy !== undefined ? config.vy : (Math.random() - 0.5) * 2;
        this.speed = 1.5;
        this.runningSpeed = 2.5; // Slowed down for readability
        this.isRunning = false;
        this.clickCount = 0;
        this.lastClickTime = 0;
        this.isCustom = config.isCustom || false;
        this.size = config.size || 64; // Default size
        this.isDisabled = config.disabled || false;
        this.isFloatDisabled = config.noFloat || false;
        this.currentImage = config.image || 'mascot.png';

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
            "마지막으로 참는다. 한 번만 더 찔러봐.",
            "Fucking!!",
            "그만 누르라고 했다...",
            "마지막 경고!!",
            "너의 끈기에 감탄했어~"
        ];

        this.init();
    }

    init() {
        // Create mascot element
        this.element = document.createElement('div');
        this.element.className = 'mascot';
        this.element.style.left = this.x + 'px';
        this.element.style.top = this.y + 'px';
        this.element.dataset.mascotId = this.id; // Store ID in element
        document.body.appendChild(this.element);

        // Apply saved image and settings
        this.updateImage(this.currentImage, this.isCustom);
        this.setSize(this.size);
        this.updateVisibility();

        // Event listeners
        this.element.addEventListener('click', (e) => this.onClick(e));
        window.addEventListener('resize', () => this.onResize());

        this.animate();

        // Only setup settings UI once (for the first mascot)
        if (mascots.length === 0) {
            this.setupSettings();
        }
    }

    updateVisibility() {
        if (this.isDisabled) {
            this.element.style.display = 'none';
        } else {
            this.element.style.display = 'block';
        }
    }

    updateAnimation() {
        if (this.isCustom) {
            if (this.isFloatDisabled) {
                this.element.style.animation = 'none';
            } else {
                this.element.style.animation = 'float 2s ease-in-out infinite';
            }
        } else {
            this.element.style.animation = ''; // Revert to CSS default (walk)
        }
    }

    updateImage(src, isCustom) {
        this.isCustom = isCustom;
        this.currentImage = src;

        // Remove existing custom image if any
        const existingImg = this.element.querySelector('img.custom-mascot-img');
        if (existingImg) existingImg.remove();

        // Reset background
        this.element.style.backgroundImage = '';
        this.element.classList.remove('custom-image');

        if (isCustom) {
            this.element.classList.add('custom-image');
            this.element.style.backgroundImage = 'none';

            // Create img tag for custom images to maintain aspect ratio
            const img = document.createElement('img');
            img.className = 'custom-mascot-img';
            img.src = src;
            img.style.width = '100%';
            img.style.height = 'auto';
            img.style.display = 'block';
            img.draggable = false;

            // Insert as first child to not mess up appended bubbles
            this.element.insertBefore(img, this.element.firstChild);

            this.updateAnimation();
        } else {
            this.element.style.backgroundImage = `url('${src}')`;
            this.element.style.backgroundSize = 'contain';
            this.element.style.backgroundPosition = 'center';
            this.element.style.animation = ''; // Revert to CSS default
        }

        // Re-apply size to ensure correct dimensions
        this.setSize(this.size);

        // Save to storage
        saveMascotsToStorage();
    }

    setSize(size) {
        this.size = parseInt(size);
        if (this.element) {
            this.element.style.width = `${this.size}px`;
            if (this.isCustom) {
                this.element.style.height = 'auto';
            } else {
                this.element.style.height = `${this.size}px`;
            }
        }
    }

    setupSettings() {
        const btn = document.getElementById('mascot-settings-btn');
        const modal = document.getElementById('mascot-modal');
        const closeBtn = document.getElementById('close-mascot-modal');
        const uploadInput = document.getElementById('mascot-upload');
        const resetBtn = document.getElementById('reset-mascot');
        const sizeSlider = document.getElementById('mascot-size');
        const disableCheckbox = document.getElementById('mascot-disable');
        const noFloatCheckbox = document.getElementById('mascot-no-float');

        if (!btn || !modal) return;

        // Function to update UI with selected mascot's settings
        const updateSettingsUI = () => {
            const selectedMascot = getMascotById(selectedMascotId);
            if (!selectedMascot) return;

            if (sizeSlider) sizeSlider.value = selectedMascot.size;
            if (disableCheckbox) disableCheckbox.checked = selectedMascot.isDisabled;
            if (noFloatCheckbox) noFloatCheckbox.checked = selectedMascot.isFloatDisabled;
        };

        // Function to update mascot list UI
        const updateMascotListUI = () => {
            const listContainer = document.getElementById('mascot-list');
            const countSpan = document.getElementById('mascot-count');
            const selectedNameSpan = document.getElementById('selected-mascot-name');

            if (!listContainer) return;

            // Update count
            if (countSpan) {
                countSpan.textContent = `(${mascots.length} active)`;
            }

            // Update selected name
            if (selectedNameSpan) {
                const index = mascots.findIndex(m => m.id === selectedMascotId);
                selectedNameSpan.textContent = `Mascot #${index + 1}`;
            }

            // Clear list
            listContainer.innerHTML = '';

            // Add mascot items
            mascots.forEach((mascot, index) => {
                const item = document.createElement('div');
                item.style.cssText = `
                    padding: 8px;
                    margin: 5px 0;
                    background: ${mascot.id === selectedMascotId ? 'rgba(0,255,65,0.2)' : 'rgba(0,0,0,0.2)'};
                    border: 1px solid ${mascot.id === selectedMascotId ? 'var(--primary-color)' : 'transparent'};
                    border-radius: 5px;
                    cursor: pointer;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    transition: all 0.3s;
                `;

                item.innerHTML = `
                    <span style="flex: 1;">
                        <strong>Mascot #${index + 1}</strong>
                        <span style="opacity: 0.7; font-size: 0.9em;"> - ${mascot.size}px ${mascot.isDisabled ? '(Disabled)' : ''}</span>
                    </span>
                    <button class="btn delete-mascot-btn" data-id="${mascot.id}" style="padding: 3px 8px; font-size: 0.8em;">🗑️</button>
                `;

                // Select mascot on click
                item.addEventListener('click', (e) => {
                    if (!e.target.classList.contains('delete-mascot-btn')) {
                        selectedMascotId = mascot.id;
                        updateMascotListUI();
                        updateSettingsUI();
                    }
                });

                // Delete button
                const deleteBtn = item.querySelector('.delete-mascot-btn');
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (mascots.length > 1) {
                        removeMascot(mascot.id);
                        updateMascotListUI();
                        updateSettingsUI();
                    } else {
                        alert('Cannot delete the last mascot!');
                    }
                });

                listContainer.appendChild(item);
            });
        };



        // Create mascot list UI elements if they don't exist
        const createMascotListUI = () => {
            if (document.getElementById('mascot-list')) return; // Already exists

            const h3 = modal.querySelector('h3');
            if (!h3) return;

            // Add mascot count to h3
            if (!document.getElementById('mascot-count')) {
                const countSpan = document.createElement('span');
                countSpan.id = 'mascot-count';
                countSpan.style.fontSize = '0.8em';
                countSpan.style.opacity = '0.7';
                h3.appendChild(countSpan);
            }

            // Create mascot list section
            const listSectionHTML = `
                <!-- Mascot List Section -->
                <div class="mascot-list-section" style="margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <label style="margin: 0; font-weight: bold;">Mascots:</label>
                        <button class="btn" id="add-mascot-btn" style="padding: 5px 12px; font-size: 0.9em;">➕ Add New</button>
                    </div>
                    <div id="mascot-list" style="max-height: 150px; overflow-y: auto; border: 1px solid var(--primary-color); border-radius: 5px; padding: 10px; background: rgba(0,0,0,0.3);">
                        <!-- Mascot items will be dynamically inserted here -->
                    </div>
                </div>

                <!-- Selected Mascot Indicator -->
                <div style="margin-bottom: 15px; padding: 8px; background: rgba(0,255,65,0.1); border-radius: 5px; border: 1px solid var(--primary-color);">
                    <strong>Selected:</strong> <span id="selected-mascot-name">Mascot #1</span>
                </div>
            `;

            // Insert after h3
            h3.insertAdjacentHTML('afterend', listSectionHTML);

            // Attach event listener to Add New button
            const addMascotBtn = document.getElementById('add-mascot-btn');
            if (addMascotBtn) {
                addMascotBtn.addEventListener('click', () => {
                    const newMascot = addMascot({});
                    selectedMascotId = newMascot.id;
                    updateMascotListUI();
                    updateSettingsUI();
                });
            }

            // Initial UI update
            updateMascotListUI();
        };

        // Create mascot list UI on first call
        createMascotListUI();

        // Initialize with current selected mascot
        updateSettingsUI();

        // Size Slider
        if (sizeSlider) {
            sizeSlider.addEventListener('input', (e) => {
                const selectedMascot = getMascotById(selectedMascotId);
                if (selectedMascot) {
                    selectedMascot.setSize(e.target.value);
                    saveMascotsToStorage();
                }
            });
        }

        // Disable Checkbox
        if (disableCheckbox) {
            disableCheckbox.addEventListener('change', (e) => {
                const selectedMascot = getMascotById(selectedMascotId);
                if (selectedMascot) {
                    selectedMascot.isDisabled = e.target.checked;
                    selectedMascot.updateVisibility();
                    saveMascotsToStorage();
                }
            });
        }

        // No Float Checkbox
        if (noFloatCheckbox) {
            noFloatCheckbox.addEventListener('change', (e) => {
                const selectedMascot = getMascotById(selectedMascotId);
                if (selectedMascot) {
                    selectedMascot.isFloatDisabled = e.target.checked;
                    selectedMascot.updateAnimation();
                    saveMascotsToStorage();
                }
            });
        }

        // Open Modal
        btn.addEventListener('click', () => {
            updateSettingsUI();
            updateMascotListUI(); // Update list when opening
            modal.classList.add('show');
        });

        // Add New Mascot button
        const addMascotBtn = document.getElementById('add-mascot-btn');
        if (addMascotBtn) {
            addMascotBtn.addEventListener('click', () => {
                const newMascot = addMascot({});
                selectedMascotId = newMascot.id;
                updateMascotListUI();
                updateSettingsUI();
            });
        }


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
                        const selectedMascot = getMascotById(selectedMascotId);
                        if (selectedMascot) {
                            selectedMascot.updateImage(event.target.result, true);
                            modal.classList.remove('show');
                        }
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        // Handle Drag and Drop
        const dropZone = document.getElementById('mascot-drop-zone');
        if (dropZone) {
            // Prevent default behaviors
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                }, false);
            });

            // Highlight drop zone
            ['dragenter', 'dragover'].forEach(eventName => {
                dropZone.addEventListener(eventName, () => {
                    dropZone.classList.add('dragover');
                }, false);
            });

            // Unhighlight drop zone
            ['dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, () => {
                    dropZone.classList.remove('dragover');
                }, false);
            });

            // Handle dropped file
            dropZone.addEventListener('drop', (e) => {
                const dt = e.dataTransfer;
                const files = dt.files;
                const file = files[0];

                if (file && file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const selectedMascot = getMascotById(selectedMascotId);
                        if (selectedMascot) {
                            selectedMascot.updateImage(event.target.result, true);
                            modal.classList.remove('show');
                        }
                    };
                    reader.readAsDataURL(file);
                }
            }, false);

            // Allow clicking drop zone to trigger file input
            dropZone.addEventListener('click', () => {
                if (uploadInput) uploadInput.click();
            });
        }

        // Handle Reset
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                const selectedMascot = getMascotById(selectedMascotId);
                if (selectedMascot) {
                    selectedMascot.updateImage('mascot.png', false);
                    selectedMascot.setSize(64);
                    selectedMascot.isDisabled = false;
                    selectedMascot.isFloatDisabled = false;
                    selectedMascot.updateVisibility();

                    updateSettingsUI();
                    saveMascotsToStorage();
                    modal.classList.remove('show');
                }
            });
        }

        // Collision Settings UI
        // Create collision settings section if it doesn't exist
        const createCollisionSettingsUI = () => {
            if (document.getElementById('collision-settings-section')) return;

            const collisionSection = document.createElement('div');
            collisionSection.id = 'collision-settings-section';
            collisionSection.className = 'mascot-option';
            collisionSection.style.borderTop = '1px solid var(--primary-color)';
            collisionSection.style.paddingTop = '15px';
            collisionSection.style.marginTop = '15px';

            collisionSection.innerHTML = `
                <h4 style="color: var(--primary-color); margin-bottom: 10px;">⚡ Collision Settings</h4>
                
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <input type="checkbox" id="collision-enabled" ${collisionSettings.enabled ? 'checked' : ''}>
                    <label for="collision-enabled" style="margin: 0; cursor: pointer;">Enable Collisions</label>
                </div>

                <div style="margin-bottom: 10px;">
                    <label for="collision-strength">Collision Strength: <span id="collision-strength-value">${collisionSettings.strength}</span></label>
                    <input type="range" id="collision-strength" min="0" max="1" step="0.1" value="${collisionSettings.strength}" style="width: 100%;">
                </div>

                <div style="display: flex; align-items: center; gap: 10px;">
                    <input type="checkbox" id="collision-messages" ${collisionSettings.showMessages ? 'checked' : ''}>
                    <label for="collision-messages" style="margin: 0; cursor: pointer; font-size: 0.9em;">Show Collision Messages</label>
                </div>
            `;

            // Insert before the last mascot-option (upload section)
            const uploadSection = modal.querySelector('.mascot-option:last-child');
            if (uploadSection) {
                uploadSection.parentNode.insertBefore(collisionSection, uploadSection);
            }

            // Attach event listeners
            const enabledCheckbox = document.getElementById('collision-enabled');
            const strengthSlider = document.getElementById('collision-strength');
            const strengthValue = document.getElementById('collision-strength-value');
            const messagesCheckbox = document.getElementById('collision-messages');

            if (enabledCheckbox) {
                enabledCheckbox.addEventListener('change', (e) => {
                    collisionSettings.enabled = e.target.checked;
                    localStorage.setItem('collision-enabled', collisionSettings.enabled);
                });
            }

            if (strengthSlider && strengthValue) {
                strengthSlider.addEventListener('input', (e) => {
                    collisionSettings.strength = parseFloat(e.target.value);
                    strengthValue.textContent = collisionSettings.strength.toFixed(1);
                    localStorage.setItem('collision-strength', collisionSettings.strength);
                });
            }

            if (messagesCheckbox) {
                messagesCheckbox.addEventListener('change', (e) => {
                    collisionSettings.showMessages = e.target.checked;
                    localStorage.setItem('collision-messages', collisionSettings.showMessages);
                });
            }
        };

        // Create collision settings UI on first modal open
        createCollisionSettingsUI();
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

        // Check collisions with other mascots
        checkAllCollisions();

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

    // Collision Detection Methods
    getCenter() {
        const width = this.element.offsetWidth || this.size;
        const height = this.element.offsetHeight || this.size;
        return {
            x: this.x + width / 2,
            y: this.y + height / 2
        };
    }

    getRadius() {
        // Use average of width and height for radius
        const width = this.element.offsetWidth || this.size;
        const height = this.element.offsetHeight || this.size;
        return (width + height) / 4; // Divide by 4 to get average radius
    }

    checkCollisionWith(otherMascot) {
        if (!otherMascot || otherMascot.id === this.id) return false;
        if (this.isDisabled || otherMascot.isDisabled) return false;

        const center1 = this.getCenter();
        const center2 = otherMascot.getCenter();
        const radius1 = this.getRadius();
        const radius2 = otherMascot.getRadius();

        const dx = center2.x - center1.x;
        const dy = center2.y - center1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        return distance < (radius1 + radius2);
    }

    handleCollision(otherMascot) {
        if (!collisionSettings.enabled) return;

        const center1 = this.getCenter();
        const center2 = otherMascot.getCenter();

        // Calculate collision normal
        const dx = center2.x - center1.x;
        const dy = center2.y - center1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) return; // Prevent division by zero

        // Normalize collision vector
        const nx = dx / distance;
        const ny = dy / distance;

        // Calculate relative velocity
        const dvx = otherMascot.vx - this.vx;
        const dvy = otherMascot.vy - this.vy;

        // Calculate relative velocity in collision normal direction
        const dvn = dvx * nx + dvy * ny;

        // Do not resolve if velocities are separating
        if (dvn > 0) return;

        // Calculate mass based on size (larger = heavier)
        const mass1 = this.size / 64; // Normalized to default size
        const mass2 = otherMascot.size / 64;

        // Calculate impulse scalar with restitution (bounciness)
        const restitution = collisionSettings.strength;
        const impulse = (-(1 + restitution) * dvn) / (1 / mass1 + 1 / mass2);

        // Apply impulse to velocities
        const impulseX = impulse * nx;
        const impulseY = impulse * ny;

        this.vx -= impulseX / mass1;
        this.vy -= impulseY / mass1;
        otherMascot.vx += impulseX / mass2;
        otherMascot.vy += impulseY / mass2;

        // Separate overlapping mascots
        const overlap = (this.getRadius() + otherMascot.getRadius()) - distance;
        if (overlap > 0) {
            const separationX = nx * overlap / 2;
            const separationY = ny * overlap / 2;

            this.x -= separationX;
            this.y -= separationY;
            otherMascot.x += separationX;
            otherMascot.y += separationY;
        }

        // Show collision message if enabled
        if (collisionSettings.showMessages && Math.random() < 0.3) {
            const collisionMessages = [
                "앗! 😮",
                "조심해! ⚠️",
                "어! 😯",
                "미안! 😅",
                "아야! 💥"
            ];
            const message = collisionMessages[Math.floor(Math.random() * collisionMessages.length)];
            this.showSpeechBubble(message);
        }
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

// Collision Settings
const collisionSettings = {
    enabled: true,
    strength: 0.8, // Restitution coefficient (0 = no bounce, 1 = perfect bounce)
    showMessages: true
};

// Load collision settings from localStorage
const loadCollisionSettings = () => {
    const savedEnabled = localStorage.getItem('collision-enabled');
    const savedStrength = localStorage.getItem('collision-strength');
    const savedMessages = localStorage.getItem('collision-messages');

    if (savedEnabled !== null) collisionSettings.enabled = savedEnabled === 'true';
    if (savedStrength !== null) collisionSettings.strength = parseFloat(savedStrength);
    if (savedMessages !== null) collisionSettings.showMessages = savedMessages === 'true';
};

loadCollisionSettings();

// Frame counter for collision check throttling
let collisionFrameCounter = 0;
const COLLISION_CHECK_INTERVAL = 2; // Check every N frames

// Check collisions between all mascots
function checkAllCollisions() {
    if (!collisionSettings.enabled || mascots.length < 2) return;

    // Throttle collision checks for performance
    collisionFrameCounter++;
    if (collisionFrameCounter < COLLISION_CHECK_INTERVAL) return;
    collisionFrameCounter = 0;

    // Check each pair of mascots only once
    for (let i = 0; i < mascots.length; i++) {
        for (let j = i + 1; j < mascots.length; j++) {
            const mascot1 = mascots[i];
            const mascot2 = mascots[j];

            if (mascot1.checkCollisionWith(mascot2)) {
                mascot1.handleCollision(mascot2);
            }
        }
    }
}

// Multi-Mascot Management System
let mascots = [];
let selectedMascotId = null;

// Generate unique ID for mascots
function generateMascotId() {
    return 'mascot_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Add new mascot
function addMascot(config = {}) {
    const id = config.id || generateMascotId();
    const mascot = new Mascot(id, config);
    mascots.push(mascot);
    saveMascotsToStorage();
    return mascot;
}

// Remove mascot by ID
function removeMascot(id) {
    const index = mascots.findIndex(m => m.id === id);
    if (index !== -1) {
        const mascot = mascots[index];
        if (mascot.element) {
            mascot.element.remove();
        }
        mascots.splice(index, 1);

        // If removed mascot was selected, clear selection
        if (selectedMascotId === id) {
            selectedMascotId = mascots.length > 0 ? mascots[0].id : null;
        }

        saveMascotsToStorage();
        return true;
    }
    return false;
}

// Get mascot by ID
function getMascotById(id) {
    return mascots.find(m => m.id === id);
}

// Save all mascots to localStorage
function saveMascotsToStorage() {
    const mascotsData = mascots.map(m => ({
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

    localStorage.setItem('mascots-data', JSON.stringify(mascotsData));
}

// Load all mascots from localStorage
function loadMascotsFromStorage() {
    // Try to load new format first
    const mascotsDataStr = localStorage.getItem('mascots-data');

    if (mascotsDataStr) {
        try {
            const mascotsData = JSON.parse(mascotsDataStr);
            mascotsData.forEach(data => {
                addMascot(data);
            });

            // Select first mascot
            if (mascots.length > 0) {
                selectedMascotId = mascots[0].id;
            }
            return;
        } catch (e) {
            console.error('Failed to load mascots data:', e);
        }
    }

    // Migrate old single mascot format
    const oldImage = localStorage.getItem('mascot-image');
    const oldIsCustom = localStorage.getItem('mascot-is-custom') === 'true';
    const oldSize = parseInt(localStorage.getItem('mascot-size')) || 64;
    const oldDisabled = localStorage.getItem('mascot-disabled') === 'true';
    const oldNoFloat = localStorage.getItem('mascot-no-float') === 'true';

    if (oldImage) {
        // Migrate old data to new format
        addMascot({
            image: oldImage,
            isCustom: oldIsCustom,
            size: oldSize,
            disabled: oldDisabled,
            noFloat: oldNoFloat
        });

        // Clean up old localStorage keys
        localStorage.removeItem('mascot-image');
        localStorage.removeItem('mascot-is-custom');
        localStorage.removeItem('mascot-size');
        localStorage.removeItem('mascot-disabled');
        localStorage.removeItem('mascot-no-float');

        saveMascotsToStorage();
    } else {
        // No existing data, create default mascot
        addMascot({});
    }

    // Select first mascot
    if (mascots.length > 0) {
        selectedMascotId = mascots[0].id;
    }
}

// Initialize mascots when page loads
function initMascots() {
    loadMascotsFromStorage();
}

// Auto-start mascots
setTimeout(initMascots, 1000);
