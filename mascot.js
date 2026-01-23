// Mascot Character System
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

    // Debounced save
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
            console.log('[Mascot] Storage updated (debounced)');
            this.saveTimeout = null;
        }, 500);
    }

    animate() {
        this.mascots.forEach(mascot => {
            if (!mascot.isDisabled && !mascot.isDragging) {
                mascot.update();
            }
        });

        // Handle collisions between all mascots
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
const mascots = manager.mascots; // Maintain backward compatibility for now
let selectedMascotId = null; // Will sync with manager

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
        this.isDragging = false;
        this.clickCount = 0;
        this.lastClickTime = 0;
        this.isCustom = config.isCustom || false;
        this.size = config.size || 64;
        this.isDisabled = config.disabled || false;
        this.isFloatDisabled = config.noFloat || false;
        this.currentImage = config.image || 'mascot.png';

        // Drag-Click coordination
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragDistanceThreshold = 5; // Minimum 5px to be considered a drag
        this.isRecentlyDragged = false;

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
        this.element.addEventListener('mousedown', (e) => this.onDragStart(e));
        this.element.addEventListener('click', (e) => this.onClick(e));
        window.addEventListener('resize', () => this.onResize());

        manager.add(this);

        // Only setup settings UI once (for the first mascot)
        if (manager.mascots.length === 1) {
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

        // Save to storage (but not during initial load)
        if (!isLoadingMascots) {
            saveMascotsToStorage();
        }
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
        const sizeInput = document.getElementById('mascot-size-input'); // Number input
        const disableCheckbox = document.getElementById('mascot-disable');
        const noFloatCheckbox = document.getElementById('mascot-no-float');

        if (!btn || !modal) return;

        // Function to update UI with selected mascot's settings
        const updateSettingsUI = () => {
            const selectedMascot = getMascotById(selectedMascotId);
            if (!selectedMascot) return;

            // Skip slider update during adjustment (Firefox fix)
            if (!isAdjustingSlider) {
                // Debug: track when slider is being reset
                const currentSliderValue = sizeSlider ? parseInt(sizeSlider.value) : 0;
                if (currentSliderValue !== selectedMascot.size) {
                    console.log(`[Mascot] updateSettingsUI: slider ${currentSliderValue} -> ${selectedMascot.size}`);
                }
                if (sizeSlider) sizeSlider.value = selectedMascot.size;
                if (sizeInput) sizeInput.value = selectedMascot.size; // Update number input too
            }

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
                item.dataset.id = mascot.id; // Add data-id for targeting
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
                        <span class="size-display" style="opacity: 0.7; font-size: 0.9em;"> - ${mascot.size}px ${mascot.isDisabled ? '(Disabled)' : ''}</span>
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

        // Size Slider - handle both input (while dragging) and change (on release)
        // Note: Using global isAdjustingSlider flag defined at top of file

        if (sizeSlider) {
            const handleSizeChange = (e) => {
                const selectedMascot = getMascotById(selectedMascotId);
                if (selectedMascot) {
                    const newSize = parseInt(e.target.value);
                    selectedMascot.setSize(newSize);
                    // Sync number input
                    if (sizeInput) sizeInput.value = newSize;
                    // Update the list UI to show new size (inline, without full refresh)
                    const sizeDisplay = document.querySelector(`#mascot-list [data-id="${selectedMascotId}"] .size-display`);
                    if (sizeDisplay) {
                        sizeDisplay.textContent = ` - ${newSize}px ${selectedMascot.isDisabled ? '(Disabled)' : ''}`;
                    }
                }
            };

            // Start adjusting
            sizeSlider.addEventListener('mousedown', () => { isAdjustingSlider = true; });
            sizeSlider.addEventListener('touchstart', () => { isAdjustingSlider = true; });

            sizeSlider.addEventListener('input', handleSizeChange);

            // Save on change (when slider is released)
            sizeSlider.addEventListener('change', (e) => {
                const selectedMascot = getMascotById(selectedMascotId);
                if (selectedMascot) {
                    const finalSize = parseInt(e.target.value);
                    selectedMascot.setSize(finalSize);
                    saveMascotsToStorage();

                    // Firefox fix: force slider value multiple times
                    const slider = e.target;
                    slider.value = finalSize;

                    // Force again after a short delay (Firefox workaround)
                    setTimeout(() => { slider.value = finalSize; }, 0);
                    setTimeout(() => { slider.value = finalSize; }, 10);
                    setTimeout(() => { slider.value = finalSize; }, 50);

                    console.log(`[Mascot] Size changed to ${finalSize}, saved.`);
                }

                // Delay flag reset
                setTimeout(() => {
                    isAdjustingSlider = false;
                }, 100);
            });

            // End adjusting on mouseup/touchend - also preserve slider value
            sizeSlider.addEventListener('mouseup', (e) => {
                const selectedMascot = getMascotById(selectedMascotId);
                if (selectedMascot) {
                    // Force slider to match mascot size
                    setTimeout(() => {
                        e.target.value = selectedMascot.size;
                        isAdjustingSlider = false;
                    }, 50);
                }
            });
            sizeSlider.addEventListener('touchend', (e) => {
                const selectedMascot = getMascotById(selectedMascotId);
                if (selectedMascot) {
                    setTimeout(() => {
                        e.target.value = selectedMascot.size;
                        isAdjustingSlider = false;
                    }, 50);
                }
            });
        }

        // Number Input (alternative for Firefox users)
        if (sizeInput) {
            sizeInput.addEventListener('input', (e) => {
                const selectedMascot = getMascotById(selectedMascotId);
                if (selectedMascot) {
                    let newSize = parseInt(e.target.value) || 64;
                    // Clamp to valid range
                    newSize = Math.max(32, Math.min(1280, newSize));
                    selectedMascot.setSize(newSize);
                    // Sync slider
                    if (sizeSlider) sizeSlider.value = newSize;
                }
            });

            sizeInput.addEventListener('change', (e) => {
                const selectedMascot = getMascotById(selectedMascotId);
                if (selectedMascot) {
                    let newSize = parseInt(e.target.value) || 64;
                    newSize = Math.max(32, Math.min(1280, newSize));
                    selectedMascot.setSize(newSize);
                    e.target.value = newSize; // Normalize display
                    if (sizeSlider) sizeSlider.value = newSize;
                    saveMascotsToStorage();
                    console.log(`[Mascot] Size set to ${newSize} via number input, saved.`);
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

        // Ignore click event if mascot was just dragged
        if (this.isRecentlyDragged) {
            this.isRecentlyDragged = false;
            return;
        }

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

    update() {
        if (!this.element) return;

        // Update position
        const currentSpeed = this.isRunning ? this.runningSpeed : this.speed;
        this.x += this.vx * (currentSpeed / this.speed);
        this.y += this.vy * (currentSpeed / this.speed);

        // Bounce off edges with dynamic size
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
    }

    // Drag and Drop implementation
    onDragStart(e) {
        if (e.button !== 0) return; // Only left click
        e.preventDefault();

        this.isDragging = true;
        this.isRecentlyDragged = false;
        this.element.classList.add('dragging');

        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        const initialX = this.x;
        const initialY = this.y;

        const onMouseMove = (moveEvent) => {
            this.x = initialX + (moveEvent.clientX - this.dragStartX);
            this.y = initialY + (moveEvent.clientY - this.dragStartY);

            // Apply position immediately for smooth drag
            this.element.style.left = this.x + 'px';
            this.element.style.top = this.y + 'px';
        };

        const onMouseUp = (upEvent) => {
            this.isDragging = false;
            this.element.classList.remove('dragging');
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);

            // Check if it was a significant drag
            const distance = Math.sqrt(
                Math.pow(upEvent.clientX - this.dragStartX, 2) +
                Math.pow(upEvent.clientY - this.dragStartY, 2)
            );

            if (distance > this.dragDistanceThreshold) {
                this.isRecentlyDragged = true;
            }

            // Stop movement for a second after dragging
            this.vx = 0;
            this.vy = 0;
            setTimeout(() => {
                this.vx = (Math.random() - 0.5) * 2;
                this.vy = (Math.random() - 0.5) * 2;
                // Reset recently dragged status after a short delay
                // Click event fires right after mouseup
                setTimeout(() => { this.isRecentlyDragged = false; }, 100);
            }, 1000);

            manager.save();
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }

    // Collision Detection Methods
    getCenter() {
        if (!this.element) return { x: this.x, y: this.y };
        const width = this.element.offsetWidth || this.size;
        const height = this.element.offsetHeight || this.size;
        return {
            x: this.x + width / 2,
            y: this.y + height / 2
        };
    }

    getRadius() {
        if (!this.element) return this.size / 2;
        // Use average of width and height for radius
        const width = this.element.offsetWidth || this.size;
        const height = this.element.offsetHeight || this.size;
        return (width + height) / 4; // Divide by 4 to get average radius
    }

    checkCollisionWith(otherMascot) {
        if (!otherMascot || otherMascot.id === this.id) return false;
        if (!this.element || !otherMascot.element) return false;
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
        if (!this.element || !otherMascot || !otherMascot.element) return;

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
// (이제 MascotManager.handleCollisions()에서 처리됨)

// Generate unique ID for mascots
function generateMascotId() {
    return 'mascot_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Compatibility wrappers for existing UI code
function addMascot(config = {}, skipSave = false) {
    const id = config.id || generateMascotId();
    const mascot = new Mascot(id, config);
    // Note: Mascot constructor calls manager.add(this)
    if (!skipSave) manager.save();
    return mascot;
}

function removeMascot(id) {
    return manager.remove(id);
}

function getMascotById(id) {
    return manager.getById(id);
}

function saveMascotsToStorage() {
    manager.save();
}

function loadMascotsFromStorage() {
    isLoadingMascots = true;
    const mascotsDataStr = localStorage.getItem('mascots-data');

    if (mascotsDataStr) {
        try {
            const mascotsData = JSON.parse(mascotsDataStr);
            mascotsData.forEach(data => addMascot(data, true));
            if (manager.mascots.length > 0) {
                selectedMascotId = manager.mascots[0].id;
            }
            isLoadingMascots = false;
            return;
        } catch (e) {
            console.error('Failed to load mascots data:', e);
        }
    }

    // Migration logic
    const oldImage = localStorage.getItem('mascot-image');
    if (oldImage) {
        addMascot({
            image: oldImage,
            isCustom: localStorage.getItem('mascot-is-custom') === 'true',
            size: parseInt(localStorage.getItem('mascot-size')) || 64,
            disabled: localStorage.getItem('mascot-disabled') === 'true',
            noFloat: localStorage.getItem('mascot-no-float') === 'true'
        });
        ['mascot-image', 'mascot-is-custom', 'mascot-size', 'mascot-disabled', 'mascot-no-float'].forEach(k => localStorage.removeItem(k));
        manager.save();
    } else {
        addMascot({});
    }

    if (manager.mascots.length > 0) {
        selectedMascotId = manager.mascots[0].id;
    }
    isLoadingMascots = false;
}

// Initialize mascots
function initMascots() {
    loadMascotsFromStorage();
}

// Auto-start
setTimeout(initMascots, 1000);
