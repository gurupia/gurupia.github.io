/**
 * Mascot Character System
 * 마스코트 캐릭터 시스템
 *
 * Interactive desktop mascot engine with behavioral AI, weapon systems,
 * particle effects, spatial audio, and IndexedDB persistence.
 * 행동 AI, 무기 시스템, 파티클 효과, 공간 오디오, IndexedDB 영속성을 갖춘
 * 인터랙티브 데스크톱 마스코트 엔진.
 *
 * @module MascotSystem
 */

/** @type {boolean} Flag to prevent auto-saving during bulk load / 대량 로드 시 자동 저장 방지 플래그 */
let isLoadingMascots = false;
/** @type {boolean} Flag to prevent slider value flickering during adjustment / 슬라이더 조정 중 값 깜박임 방지 */
let isAdjustingSlider = false;
/** @type {Mascot[]} Active mascot instances / 활성 마스코트 인스턴스 배열 */
let mascots = [];
/** @type {Projectile[]} Active projectile instances / 활성 투사체 인스턴스 배열 */
let projectiles = [];
/** @type {string|null} Currently selected mascot ID for settings UI / 설정 UI에서 선택된 마스코트 ID */
let selectedMascotId = null;
/** @constant {number} Maximum simultaneous projectiles to prevent DOM lag / DOM 지연 방지 최대 투사체 수 */
const MAX_PROJECTILES = 100;
/** @constant {number} Maximum simultaneous particles / 최대 파티클 수 */
const MAX_PARTICLES = 50;
/** @type {{enabled: boolean, strength: number}} Collision physics settings (strength: 0-1 bounciness) / 충돌 물리 설정 */
const collisionSettings = { enabled: true, strength: 0.8 };

/**
 * IndexedDB Storage Manager for mascot persistence.
 * 마스코트 영속성을 위한 IndexedDB 스토리지 매니저.
 *
 * Provides async save/load with automatic localStorage migration.
 * 비동기 저장/로드 및 localStorage 자동 마이그레이션 제공.
 *
 * @namespace MascotDB
 */
const MascotDB = {
    /** @type {string} Database name / 데이터베이스 이름 */
    dbName: 'MascotStorage',
    /** @type {number} Schema version / 스키마 버전 */
    dbVersion: 1,
    /** @type {string} Object store name / 오브젝트 스토어 이름 */
    storeName: 'mascots',
    /** @type {IDBDatabase|null} Cached database connection / 캐시된 DB 연결 */
    db: null,

    /**
     * Initialize IndexedDB connection. Creates object store on first run.
     * IndexedDB 연결 초기화. 첫 실행 시 오브젝트 스토어 생성.
     * @returns {Promise<IDBDatabase>}
     */
    async init() {
        if (this.db) return this.db;
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'id' });
                }
            };
        });
    },

    /**
     * Save mascot data to IndexedDB. Falls back to localStorage (without images) on error.
     * 마스코트 데이터를 IndexedDB에 저장. 오류 시 localStorage로 폴백 (이미지 제외).
     * @param {Object[]} mascotsData - Array of serialized mascot objects
     * @returns {Promise<boolean>} true if IndexedDB save succeeded
     */
    async save(mascotsData) {
        try {
            await this.init();
            const tx = this.db.transaction(this.storeName, 'readwrite');
            const store = tx.objectStore(this.storeName);
            // Clear existing data
            store.clear();
            // Save each mascot
            for (const m of mascotsData) {
                store.put(m);
            }
            return new Promise((resolve, reject) => {
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => reject(tx.error);
            });
        } catch (e) {
            console.error('IndexedDB save error:', e);
            // Fallback to localStorage (without images to avoid quota)
            const dataWithoutImages = mascotsData.map(m => ({
                ...m,
                image: m.isCustom ? null : m.image
            }));
            localStorage.setItem('mascots-data', JSON.stringify(dataWithoutImages));
            return false;
        }
    },

    /**
     * Load all mascot data from IndexedDB.
     * IndexedDB에서 모든 마스코트 데이터 로드.
     * @returns {Promise<Object[]|null>} Array of mascot objects, or null on error
     */
    async load() {
        try {
            await this.init();
            const tx = this.db.transaction(this.storeName, 'readonly');
            const store = tx.objectStore(this.storeName);
            const request = store.getAll();
            return new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            });
        } catch (e) {
            console.error('IndexedDB load error:', e);
            return null;
        }
    },

    /**
     * Migrate mascot data from localStorage to IndexedDB (one-time).
     * localStorage에서 IndexedDB로 마스코트 데이터 마이그레이션 (1회).
     * @returns {Promise<Object[]|null>} Migrated data, or null if no old data exists
     */
    async migrateFromLocalStorage() {
        const oldData = localStorage.getItem('mascots-data');
        if (oldData) {
            try {
                const parsed = JSON.parse(oldData);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    await this.save(parsed);
                    localStorage.removeItem('mascots-data');
                    console.log('Migrated mascot data from LocalStorage to IndexedDB');
                    return parsed;
                }
            } catch (e) {
                console.error('Migration error:', e);
            }
        }
        return null;
    }
};

/**
 * Global visual/audio effects toggle settings.
 * 전역 시각/오디오 효과 토글 설정.
 * @type {{screenShake: boolean, particles: boolean, sound: boolean}}
 */
const fxSettings = {
    screenShake: true,
    particles: true,
    sound: true
};

/**
 * Spatial audio engine using Web Audio API.
 * Web Audio API를 사용한 공간 오디오 엔진.
 *
 * Synthesizes sounds in real-time (no external audio files needed) with
 * stereo panning based on horizontal screen position.
 * 실시간 사운드 합성 (외부 오디오 파일 불필요) 및 수평 화면 위치 기반 스테레오 패닝.
 *
 * @class SoundManager
 */
class SoundManager {
    constructor() {
        /** @type {AudioContext|null} Web Audio API context / Web Audio API 컨텍스트 */
        this.ctx = null;
        /** @type {Map} Panner node pool / 패너 노드 풀 */
        this.pannerPool = new Map();
        /** @type {boolean} Master enable/disable / 마스터 활성화/비활성화 */
        this.enabled = true;
    }

    /**
     * Lazy-initialize AudioContext (requires user interaction in most browsers).
     * AudioContext 지연 초기화 (대부분의 브라우저에서 사용자 인터랙션 필요).
     */
    init() {
        if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    /**
     * Play a synthesized sound at a given screen position with stereo panning.
     * 주어진 화면 위치에서 스테레오 패닝과 함께 합성 사운드 재생.
     *
     * @param {'bullet'|'flame'|'explosion'} type - Sound type / 사운드 유형
     * @param {number} x - Horizontal screen position (0 = left, innerWidth = right)
     */
    async playSpatialSound(type, x) {
        if (!this.enabled || !fxSettings.sound) return;
        this.init();
        if (this.ctx.state === 'suspended') await this.ctx.resume();

        const pan = (x / window.innerWidth) * 2 - 1; // -1 (left) to 1 (right)

        // Simple oscillator/buffer sound generator for weapons (to avoid loading external assets)
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const panner = this.ctx.createStereoPanner();

        panner.pan.value = pan;

        osc.connect(gain);
        gain.connect(panner);
        panner.connect(this.ctx.destination);

        const now = this.ctx.currentTime;
        if (type === 'bullet') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'flame') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(60, now);
            gain.gain.setValueAtTime(0.02, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.08);
            osc.start(now);
            osc.stop(now + 0.08);
        } else if (type === 'explosion') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(100, now);
            osc.frequency.linearRampToValueAtTime(10, now + 0.5);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
        }
    }
}

/** @type {SoundManager} Global sound manager instance / 전역 사운드 매니저 인스턴스 */
const soundManager = new SoundManager();

/**
 * DOM-based visual effect particle.
 * DOM 기반 시각 효과 파티클.
 *
 * Uses div elements instead of Canvas to avoid context switching overhead.
 * Canvas 컨텍스트 전환 오버헤드를 피하기 위해 div 요소 사용.
 *
 * @class Particle
 */
class Particle {
    /**
     * @param {number} x - Initial X position / 초기 X 위치
     * @param {number} y - Initial Y position / 초기 Y 위치
     * @param {number} vx - X velocity / X 속도
     * @param {number} vy - Y velocity / Y 속도
     * @param {*} color - Unused (CSS class handles color) / 미사용 (CSS 클래스로 색상 처리)
     * @param {'spark'|'smoke'} type - Particle visual type / 파티클 시각 유형
     */
    constructor(x, y, vx, vy, color, type = 'spark') {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.life = 1.0;
        this.decay = 0.02 + Math.random() * 0.03;
        this.element = document.createElement('div');
        this.element.className = `fx-particle ${type === 'spark' ? 'fx-spark' : 'fx-smoke'}`;
        const size = type === 'spark' ? 2 + Math.random() * 3 : 5 + Math.random() * 10;
        this.element.style.width = size + 'px';
        this.element.style.height = size + 'px';
        this.element.style.left = x + 'px';
        this.element.style.top = y + 'px';
        document.body.appendChild(this.element);
    }

    /** Apply physics (gravity, decay) and update DOM position. Destroys when life <= 0. */
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.1; // Gravity
        this.life -= this.decay;
        this.element.style.left = this.x + 'px';
        this.element.style.top = this.y + 'px';
        this.element.style.opacity = this.life;
        if (this.life <= 0) this.destroy();
    }

    /** Remove particle from DOM and global array. / DOM 및 전역 배열에서 파티클 제거. */
    destroy() {
        this.element.remove();
        const idx = particles.indexOf(this);
        if (idx > -1) particles.splice(idx, 1);
    }
}

/** @type {Particle[]} Active particles / 활성 파티클 배열 */
let particles = [];

/**
 * Create explosion visual effect: 15 spark particles + screen shake.
 * 폭발 시각 효과 생성: 15개 스파크 파티클 + 화면 흔들림.
 * @param {number} x - Explosion center X / 폭발 중심 X
 * @param {number} y - Explosion center Y / 폭발 중심 Y
 */
function createExplosionFX(x, y) {
    if (!fxSettings.particles) return;
    for (let i = 0; i < 15; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = Math.random() * 8;
        particles.push(new Particle(x, y, Math.cos(ang) * spd, Math.sin(ang) * spd, null, 'spark'));
    }
    if (fxSettings.screenShake) {
        document.body.classList.remove('shake');
        void document.body.offsetWidth; // Trigger reflow
        document.body.classList.add('shake');
        setTimeout(() => document.body.classList.remove('shake'), 300);
    }
}

/**
 * Weapon projectile with trajectory, hit detection, and lifetime management.
 * 궤적, 타격 감지, 수명 관리를 갖춘 무기 투사체.
 *
 * @class Projectile
 */
class Projectile {
    /**
     * @param {number} x - Start X / 시작 X
     * @param {number} y - Start Y / 시작 Y
     * @param {number} vx - X velocity / X 속도
     * @param {number} vy - Y velocity / Y 속도
     * @param {'bullet'|'flame'|'grenade'|'missile'} type - Projectile type / 투사체 유형
     * @param {Mascot|null} targetMascot - Homing target for missiles / 미사일 유도 대상
     */
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

    /** Move projectile, handle missile homing, check hit detection against all mascots. */
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
                        if (fxSettings.particles) {
                            for (let i = 0; i < 3; i++) particles.push(new Particle(this.x, this.y, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, null, 'spark'));
                        }
                        if (this.type !== 'flame') this.destroy();
                    }
                }
            });
        }
    }

    /** Grenade explosion: 100px blast radius, push nearby mascots, FX + sound. / 수류탄 폭발: 100px 반경, 근처 마스코트 밀기, FX + 사운드. */
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
        createExplosionFX(this.x, this.y);
        soundManager.playSpatialSound('explosion', this.x);
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

/**
 * Interactive desktop mascot entity with behavioral AI, weapons, and persistence.
 * 행동 AI, 무기, 영속성을 갖춘 인터랙티브 데스크톱 마스코트 엔티티.
 *
 * Each mascot is an independent instance with its own state, AI personality,
 * weapon loadout, and visual configuration stored in IndexedDB.
 * 각 마스코트는 고유한 상태, AI 성격, 무기 장비, IndexedDB에 저장되는 시각 설정을 가진 독립 인스턴스.
 *
 * @class Mascot
 */
class Mascot {
    /**
     * @param {string} id - Unique mascot identifier / 고유 마스코트 식별자
     * @param {Object} config - Initial configuration / 초기 설정
     * @param {number} [config.x] - Initial X position (default: random) / 초기 X 위치
     * @param {number} [config.y] - Initial Y position (default: random) / 초기 Y 위치
     * @param {number} [config.vx] - Initial X velocity / 초기 X 속도
     * @param {number} [config.vy] - Initial Y velocity / 초기 Y 속도
     * @param {number} [config.size=64] - Pixel size / 픽셀 크기
     * @param {boolean} [config.isCustom=false] - Custom uploaded image flag / 커스텀 이미지 플래그
     * @param {string} [config.image='mascot.png'] - Image source (URL or data URI) / 이미지 소스
     * @param {boolean} [config.disabled=false] - Hidden state / 숨김 상태
     * @param {boolean} [config.noFloat=false] - Disable float animation / 부유 애니메이션 비활성화
     * @param {boolean} [config.effect3d=false] - Enable 3D tilt on hover / 호버 시 3D 틸트 활성화
     * @param {boolean} [config.actionMode=false] - Enable weapon firing / 무기 발사 활성화
     * @param {'machinegun'|'shotgun'|'flamethrower'|'grenade'|'missile'} [config.weaponType='machinegun'] - Weapon type / 무기 유형
     * @param {'neutral'|'curious'|'shy'|'aggressive'} [config.aiType='neutral'] - AI personality / AI 성격
     */
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

        // AI State
        this.aiType = config.aiType || 'neutral'; // neutral, curious, shy, aggressive
        this.targetX = this.x;
        this.targetY = this.y;
        this.lastAIUpdate = 0;

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

    /** Create DOM element, set image, bind event listeners. / DOM 요소 생성, 이미지 설정, 이벤트 리스너 바인딩. */
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

    /** Remove DOM element, clear intervals, remove event listeners. / DOM 요소 제거, 인터벌 해제, 이벤트 리스너 제거. */
    destroy() {
        if (this.element) this.element.remove();
        if (this.shootInterval) clearInterval(this.shootInterval);
        window.removeEventListener('resize', this.resizeHandler);
        this.element = null;
    }

    /**
     * Handle click: flee from click direction, show speech bubble, easter egg after 20+ clicks.
     * 클릭 처리: 클릭 반대 방향으로 도주, 말풍선 표시, 20회 이상 시 이스터에그.
     * @param {MouseEvent} e
     */
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

    /** Toggle display based on isDisabled state. / isDisabled 상태에 따라 표시 토글. */
    updateVisibility() {
        if (!this.element) return;
        this.element.style.display = this.isDisabled ? 'none' : 'block';
        this.update3DEffects();
    }

    /** Toggle 3D tilt CSS class based on is3DEffectEnabled. / is3DEffectEnabled에 따라 3D 틸트 CSS 클래스 토글. */
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

    /** Calculate 3D tilt angles from cursor position for perspective effect. / 원근 효과를 위한 커서 위치 기반 3D 틸트 각도 계산. */
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

    /** Begin auto-fire interval based on weapon type fire rate. / 무기 유형 발사 속도에 따른 자동 발사 인터벌 시작. */
    startShooting(e) {
        if (this.shootInterval) return;
        this.fireWeapon();
        const rate = (this.weaponType === 'machinegun') ? 100 : ((this.weaponType === 'flamethrower') ? 80 : 0);
        if (rate > 0) this.shootInterval = setInterval(() => this.fireWeapon(), rate);
    }

    /** Clear auto-fire interval. / 자동 발사 인터벌 해제. */
    stopShooting() {
        if (this.shootInterval) {
            clearInterval(this.shootInterval);
            this.shootInterval = null;
        }
    }

    /**
     * Toggle action/weapon mode. Updates weapon selection UI visibility.
     * 액션/무기 모드 토글. 무기 선택 UI 가시성 업데이트.
     * @param {boolean} enabled
     */
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

    /**
     * Change weapon type. Restarts shooting if currently active.
     * 무기 유형 변경. 현재 발사 중이면 재시작.
     * @param {'machinegun'|'shotgun'|'flamethrower'|'grenade'|'missile'} type
     */
    setWeaponType(type) {
        const wasShooting = !!this.shootInterval;
        if (wasShooting) this.stopShooting();
        this.weaponType = type;
        if (wasShooting) this.startShooting();
    }

    /**
     * Set AI behavior personality.
     * AI 행동 성격 설정.
     * @param {'neutral'|'curious'|'shy'|'aggressive'} type
     */
    setAIType(type) {
        this.aiType = type;
    }

    /** Dispatch to specific fire method based on current weaponType. / 현재 weaponType에 따라 해당 발사 메서드 호출. */
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

    /**
     * Fire a single bullet with optional angle offset (used by shotgun spread).
     * 선택적 각도 오프셋으로 단발 총알 발사 (산탄총 확산에 사용).
     * @param {number} x - Origin X / 발사 원점 X
     * @param {number} y - Origin Y / 발사 원점 Y
     * @param {number} [angleOffset=0] - Radians offset from vertical / 수직 기준 라디안 오프셋
     */
    fireBullet(x, y, angleOffset = 0) {
        const angle = (Math.random() - 0.5) * 0.1 + angleOffset;
        const vx = Math.cos(angle - Math.PI / 2) * 15;
        const vy = Math.sin(angle - Math.PI / 2) * 15;
        projectiles.push(new Projectile(x, y, vx, vy, 'bullet'));
        soundManager.playSpatialSound('bullet', x);
        if (fxSettings.particles && Math.random() > 0.5) {
            particles.push(new Particle(x, y, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, null, 'spark'));
        }
    }

    /** Fire a flame projectile (short range, 30 frame lifetime). / 화염 투사체 발사 (근거리, 30프레임 수명). */
    fireFlame(x, y) {
        const angle = (Math.random() - 0.5) * 0.5 - Math.PI / 2;
        const speed = 5 + Math.random() * 5;
        projectiles.push(new Projectile(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 'flame'));
        soundManager.playSpatialSound('flame', x);
    }

    /** Fire a grenade (explodes on contact, 100px blast radius). / 수류탄 발사 (접촉 폭발, 100px 반경). */
    fireGrenade(x, y) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.2;
        projectiles.push(new Projectile(x, y, Math.cos(angle) * 8, Math.sin(angle) * 8, 'grenade'));
    }

    /** Fire a homing missile targeting a random other mascot. / 무작위 다른 마스코트를 추적하는 유도 미사일 발사. */
    fireMissile(x, y) {
        const others = mascots.filter(m => m !== this && !m.isDisabled);
        const target = others.length > 0 ? others[Math.floor(Math.random() * others.length)] : null;
        projectiles.push(new Projectile(x, y, 0, -5, 'missile', target));
    }

    /**
     * Add a visual impact mark to the mascot element.
     * 마스코트 요소에 시각적 타격 자국 추가.
     * @param {'hole'|'scorch'} type - Impact visual type / 타격 시각 유형
     * @param {number} x - X offset within mascot / 마스코트 내 X 오프셋
     * @param {number} y - Y offset within mascot / 마스코트 내 Y 오프셋
     */
    createImpact(type, x, y) {
        if (!this.element) return;
        const mark = document.createElement('div');
        mark.className = `impact-mark impact-${type}`;
        mark.style.left = x + 'px';
        mark.style.top = y + 'px';
        this.element.appendChild(mark);
        setTimeout(() => { if (mark.parentElement) mark.remove(); }, 3000);
    }

    /**
     * Display a speech bubble above the mascot for 3 seconds with fade-out.
     * 마스코트 위에 3초간 말풍선 표시 (페이드아웃).
     * @param {string} message - Text to display / 표시할 텍스트
     */
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

    /**
     * Change mascot image. Updates DOM and triggers auto-save.
     * 마스코트 이미지 변경. DOM 업데이트 및 자동 저장 트리거.
     * @param {string} src - Image URL or data URI / 이미지 URL 또는 data URI
     * @param {boolean} isCustom - Whether this is a user-uploaded image / 사용자 업로드 이미지 여부
     */
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

    /**
     * Update mascot pixel size.
     * 마스코트 픽셀 크기 업데이트.
     * @param {number} size - New size in pixels / 새 크기 (픽셀)
     */
    setSize(size) {
        this.size = parseInt(size);
        if (this.element) {
            this.element.style.width = `${this.size}px`;
            this.element.style.height = this.isCustom ? 'auto' : `${this.size}px`;
        }
    }

    /**
     * Main per-frame update: execute AI logic, apply velocity, handle boundary collisions, flip direction.
     * 메인 프레임별 업데이트: AI 로직 실행, 속도 적용, 경계 충돌 처리, 방향 전환.
     */
    updatePosition() {
        if (!this.element) return;

        // --- Behavioral AI ---
        const now = Date.now();
        if (this.isActionModeEnabled || this.isRunning) {
            // Manual control or fleeing from click overrides AI
        } else if (now - this.lastAIUpdate > 100) {
            this.lastAIUpdate = now;
            const distToMouse = Math.sqrt((mouseX - this.x) ** 2 + (mouseY - this.y) ** 2);

            if (this.aiType === 'curious' && distToMouse < 400 && distToMouse > 50) {
                const ang = Math.atan2(mouseY - this.y, mouseX - this.x);
                this.vx += Math.cos(ang) * 0.1;
                this.vy += Math.sin(ang) * 0.1;
            } else if (this.aiType === 'shy' && distToMouse < 200) {
                const ang = Math.atan2(this.y - mouseY, this.x - mouseX);
                this.vx += Math.cos(ang) * 0.2;
                this.vy += Math.sin(ang) * 0.2;
            } else if (this.aiType === 'aggressive' && distToMouse < 500) {
                const ang = Math.atan2(mouseY - this.y, mouseX - this.x);
                this.vx += Math.cos(ang) * 0.3;
                this.vy += Math.sin(ang) * 0.3;
            }
        }

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

    /** @returns {{x: number, y: number}} Center coordinates of the mascot / 마스코트 중심 좌표 */
    getCenter() {
        const w = (this.element ? this.element.offsetWidth : this.size) || this.size;
        const h = (this.element ? this.element.offsetHeight : this.size) || this.size;
        return { x: this.x + w / 2, y: this.y + h / 2 };
    }

    /** @returns {number} Collision radius (average of width and height / 4) / 충돌 반경 */
    getRadius() {
        const w = (this.element ? this.element.offsetWidth : this.size) || this.size;
        const h = (this.element ? this.element.offsetHeight : this.size) || this.size;
        return (w + h) / 4;
    }

    /**
     * Circle-based collision detection with another mascot.
     * 다른 마스코트와의 원형 기반 충돌 감지.
     * @param {Mascot} other - Other mascot to check / 검사 대상 마스코트
     * @returns {boolean} true if colliding / 충돌 시 true
     */
    checkCollisionWith(other) {
        if (!other || other.id === this.id || this.isDisabled || other.isDisabled) return false;
        const c1 = this.getCenter(), c2 = other.getCenter();
        const dist = Math.sqrt((c2.x - c1.x) ** 2 + (c2.y - c1.y) ** 2);
        return dist < (this.getRadius() + other.getRadius());
    }

    /**
     * Elastic collision response with mass proportional to size.
     * 크기에 비례하는 질량의 탄성 충돌 응답.
     * @param {Mascot} other - Colliding mascot / 충돌 마스코트
     */
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

/**
 * Initialize the settings modal UI: tabs, controls, event bindings, mascot list.
 * 설정 모달 UI 초기화: 탭, 컨트롤, 이벤트 바인딩, 마스코트 목록.
 */
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

        const aiSel = document.getElementById('mascot-ai-type');
        if (aiSel) aiSel.value = m.aiType;

        const shakeCheck = document.getElementById('fx-screen-shake');
        const particleCheck = document.getElementById('fx-particles');
        const soundCheck = document.getElementById('fx-sound');

        if (shakeCheck) shakeCheck.checked = fxSettings.screenShake;
        if (particleCheck) particleCheck.checked = fxSettings.particles;
        if (soundCheck) soundCheck.checked = fxSettings.sound;
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

    // Helper: Bind checkbox/select to mascot property with auto-save
    const bindMascotControl = (elementId, handler) => {
        const el = document.getElementById(elementId);
        if (el) el.addEventListener('change', (e) => {
            const m = getMascotById(selectedMascotId);
            if (m) {
                handler(m, e);
                saveMascotsToStorage();
            }
        });
    };

    // Mascot property bindings (refactored from duplicate patterns)
    bindMascotControl('mascot-disable', (m, e) => { m.isDisabled = e.target.checked; m.updateVisibility(); });
    bindMascotControl('mascot-no-float', (m, e) => { m.isFloatDisabled = e.target.checked; m.updateAnimation(); });
    bindMascotControl('mascot-effect-3d', (m, e) => { m.is3DEffectEnabled = e.target.checked; m.update3DEffects(); });
    bindMascotControl('mascot-action-mode', (m, e) => m.setActionMode(e.target.checked));
    bindMascotControl('mascot-weapon', (m, e) => m.setWeaponType(e.target.value));
    bindMascotControl('mascot-ai-type', (m, e) => m.setAIType(e.target.value));

    // FX settings (no mascot dependency)
    const bindFxControl = (elementId, prop) => {
        const el = document.getElementById(elementId);
        if (el) el.addEventListener('change', (e) => { fxSettings[prop] = e.target.checked; });
    };

    bindFxControl('fx-screen-shake', 'screenShake');
    bindFxControl('fx-particles', 'particles');
    bindFxControl('fx-sound', 'sound');

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

/** Generate unique mascot ID: "mascot_" + timestamp + random. / 고유 마스코트 ID 생성. @returns {string} */
function generateMascotId() { return 'mascot_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9); }
/** Find mascot by ID. / ID로 마스코트 검색. @param {string} id @returns {Mascot|undefined} */
function getMascotById(id) { return mascots.find(m => m.id === id); }

/**
 * Grid-based spatial partitioning for O(N) collision detection.
 * O(N) 충돌 감지를 위한 그리드 기반 공간 분할.
 *
 * Divides screen into 150px cells. Only checks collisions between
 * mascots in the same or adjacent cells (3x3 neighborhood).
 * 화면을 150px 셀로 분할. 같은 셀 또는 인접 셀(3x3 이웃)의 마스코트 간 충돌만 검사.
 *
 * @namespace SpatialGrid
 */
const SpatialGrid = {
    cellSize: 150, // Cell size in pixels (should be >= max mascot size)
    grid: new Map(),

    clear() {
        this.grid.clear();
    },

    getCellKey(x, y) {
        const cellX = Math.floor(x / this.cellSize);
        const cellY = Math.floor(y / this.cellSize);
        return `${cellX},${cellY}`;
    },

    insert(mascot) {
        if (mascot.isDisabled) return;
        const key = this.getCellKey(mascot.x, mascot.y);
        if (!this.grid.has(key)) {
            this.grid.set(key, []);
        }
        this.grid.get(key).push(mascot);
    },

    getNearby(mascot) {
        const nearby = [];
        const cellX = Math.floor(mascot.x / this.cellSize);
        const cellY = Math.floor(mascot.y / this.cellSize);

        // Check current cell and 8 adjacent cells
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const key = `${cellX + dx},${cellY + dy}`;
                if (this.grid.has(key)) {
                    nearby.push(...this.grid.get(key));
                }
            }
        }
        return nearby;
    }
};

/**
 * Run spatial grid collision detection for all active mascots.
 * 모든 활성 마스코트에 대한 공간 그리드 충돌 감지 실행.
 */
function checkAllCollisions() {
    if (!collisionSettings.enabled || mascots.length < 2) return;

    // Use spatial partitioning for better performance
    SpatialGrid.clear();

    // Insert all mascots into grid
    for (const m of mascots) {
        SpatialGrid.insert(m);
    }

    // Check collisions only with nearby mascots
    const checked = new Set();
    for (const m of mascots) {
        if (m.isDisabled) continue;

        const nearby = SpatialGrid.getNearby(m);
        for (const other of nearby) {
            if (other === m || other.isDisabled) continue;

            // Avoid checking same pair twice
            const pairKey = m.id < other.id ? `${m.id}-${other.id}` : `${other.id}-${m.id}`;
            if (checked.has(pairKey)) continue;
            checked.add(pairKey);

            if (m.checkCollisionWith(other)) {
                m.handleCollision(other);
            }
        }
    }
}

/**
 * Create, register, and optionally persist a new mascot.
 * 새 마스코트 생성, 등록, 선택적 영속화.
 * @param {Object} config - Mascot configuration (see Mascot constructor) / 마스코트 설정
 * @param {boolean} [skipSave=false] - Skip auto-save (used during bulk load) / 자동 저장 건너뛰기
 * @returns {Mascot} The created mascot instance / 생성된 마스코트 인스턴스
 */
function addMascot(config = {}, skipSave = false) {
    const m = new Mascot(config.id || generateMascotId(), config);
    mascots.push(m);
    if (!skipSave && !isLoadingMascots) saveMascotsToStorage();
    return m;
}

/**
 * Destroy and remove a mascot by ID.
 * ID로 마스코트 파괴 및 제거.
 * @param {string} id - Mascot ID to remove / 제거할 마스코트 ID
 * @returns {boolean} true if found and removed / 찾아서 제거했으면 true
 */
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

/** Serialize all mascots and save to IndexedDB asynchronously. / 모든 마스코트를 직렬화하여 IndexedDB에 비동기 저장. */
function saveMascotsToStorage() {
    const data = mascots.map(m => ({
        id: m.id, image: m.currentImage, isCustom: m.isCustom, size: m.size,
        x: m.x, y: m.y, vx: m.vx, vy: m.vy, disabled: m.isDisabled,
        noFloat: m.isFloatDisabled, effect3d: m.is3DEffectEnabled,
        actionMode: m.isActionModeEnabled, weaponType: m.weaponType,
        aiType: m.aiType
    }));
    // Save asynchronously to IndexedDB
    MascotDB.save(data).catch(e => console.error('Failed to save mascots:', e));
}

/**
 * Load mascots from IndexedDB (with localStorage migration fallback).
 * Clears existing mascots and creates fresh instances.
 * IndexedDB에서 마스코트 로드 (localStorage 마이그레이션 폴백 포함).
 * 기존 마스코트를 제거하고 새 인스턴스 생성.
 * @returns {Promise<void>}
 */
async function loadMascotsFromStorage() {
    isLoadingMascots = true;
    // Clear existing
    mascots.forEach(m => m.destroy());
    mascots = [];

    try {
        // Try IndexedDB first
        let data = await MascotDB.load();

        // If IndexedDB is empty, try migrating from LocalStorage
        if (!data || data.length === 0) {
            data = await MascotDB.migrateFromLocalStorage();
        }

        if (data && Array.isArray(data) && data.length > 0) {
            data.forEach(d => addMascot(d, true));
        } else {
            addMascot({});
        }
    } catch (e) {
        console.error('Mascot load error:', e);
        addMascot({});
    }

    if (mascots.length > 0) selectedMascotId = mascots[0].id;
    isLoadingMascots = false;
}

/** @type {boolean} Page visibility state (false when tab is hidden) / 페이지 가시성 상태 */
let isPageVisible = true;
/** @type {number|null} Current animation frame request ID / 현재 애니메이션 프레임 요청 ID */
let animationFrameId = null;

/**
 * Main animation frame loop: update projectiles → particles → mascots → collisions.
 * Skips updates when page is hidden (saves CPU/battery).
 * 메인 애니메이션 프레임 루프: 투사체 → 파티클 → 마스코트 → 충돌 업데이트.
 * 페이지가 숨겨지면 업데이트 건너뜀 (CPU/배터리 절약).
 */
function globalUpdate() {
    // Skip updates when page is not visible (saves CPU/battery)
    if (!isPageVisible) {
        animationFrameId = requestAnimationFrame(globalUpdate);
        return;
    }

    if (projectiles.length > MAX_PROJECTILES) {
        const toRemove = projectiles.length - MAX_PROJECTILES;
        for (let i = 0; i < toRemove; i++) {
            if (projectiles[0]) projectiles[0].destroy();
        }
    }
    projectiles.forEach(p => p.update());

    if (particles.length > MAX_PARTICLES) {
        const toRemove = particles.length - MAX_PARTICLES;
        for (let i = 0; i < toRemove; i++) {
            if (particles[0]) particles[0].destroy();
        }
    }
    particles.forEach(p => p.update());

    mascots.forEach(m => {
        if (!m.isDisabled) m.updatePosition();
    });
    checkAllCollisions();
    animationFrameId = requestAnimationFrame(globalUpdate);
}

// Pause animations when page is hidden (tab switch, minimize)
document.addEventListener('visibilitychange', () => {
    isPageVisible = !document.hidden;
    // Notify Matrix Rain (if exists) via custom event
    window.dispatchEvent(new CustomEvent('pageVisibilityChange', { detail: { visible: isPageVisible } }));
});

/** @type {number} Current mouse X position (used by AI behaviors) / 현재 마우스 X 위치 (AI 행동에 사용) */
let mouseX = window.innerWidth / 2;
/** @type {number} Current mouse Y position / 현재 마우스 Y 위치 */
let mouseY = window.innerHeight / 2;
window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

/**
 * Bootstrap the mascot system: load persisted data, setup UI, start animation loop.
 * 마스코트 시스템 부트스트랩: 저장된 데이터 로드, UI 설정, 애니메이션 루프 시작.
 * @returns {Promise<void>}
 */
async function initMascotSystem() {
    await loadMascotsFromStorage();
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
