const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const imgInput = document.getElementById('imageInput');
const urlInput = document.getElementById('urlInput');
const loadUrlBtn = document.getElementById('loadUrlBtn');
const animSelect = document.getElementById('animType');
const speedRange = document.getElementById('speedRange');
const ampRange = document.getElementById('ampRange');
const exportSelect = document.getElementById('exportFormat');
const recordBtn = document.getElementById('recordBtn');
const recordingStatus = document.getElementById('recordingStatus');
const previewVideo = document.getElementById('previewVideo');
const downloadLink = document.getElementById('downloadLink');
const downloadSection = document.getElementById('downloadSection');

let mediaSource = null;
let isSourceLoaded = false;
let isVideo = false;
let time = 0;
let animationId = null;
let isRecording = false; // Moved here to fix scoping issue

// Settings
let state = {
    anim: 'breath',
    speed: 1.0,
    intensity: 1.0,
    format: 'webp'
};

// Allowed animation types (whitelist for CSS injection prevention)
const ALLOWED_ANIMS = ['breath', 'float', 'jump', 'shake', 'squash', 'spin'];
const ALLOWED_FORMATS = ['webp', 'gif', 'webm', 'webm_hq', 'sprite'];

// Sanitize animation name for safe CSS output
function sanitizeAnimName(name) {
    if (ALLOWED_ANIMS.includes(name)) return name;
    return 'breath'; // fallback
}

// Validate numeric value
function sanitizeNumber(val) {
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
}

// Check for file:// protocol
const isFileProtocol = window.location.protocol === 'file:';

// FFmpeg Instance
const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({
    log: true,
    corePath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js'
});

// --- Initialization ---
imgInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        if (file.type.startsWith('video/')) {
            loadVideo(url);
        } else {
            loadImage(url);
        }
    }
});

loadUrlBtn.addEventListener('click', () => {
    const url = urlInput.value.trim();
    if (!url) return;
    if (url.match(/\.(mp4|webm|mov)$/i)) {
        loadVideo(url);
    } else {
        loadImage(url);
    }
});

function loadImage(src) {
    if (mediaSource && isVideo) { mediaSource.pause(); mediaSource.remove(); }
    mediaSource = new Image();
    mediaSource.crossOrigin = "anonymous";
    mediaSource.src = src;
    mediaSource.onload = () => {
        isSourceLoaded = true;
        isVideo = false;
        fitCanvasToSource();
        recordingStatus.textContent = "Image loaded!";
    };
    mediaSource.onerror = () => {
        recordingStatus.textContent = "⚠️ Failed to load image. Check URL or CORS policy.";
        recordingStatus.style.color = '#ff6b6b';
    };
}

function loadVideo(src) {
    if (mediaSource && isVideo) { mediaSource.pause(); mediaSource.remove(); }
    mediaSource = document.createElement('video');
    mediaSource.crossOrigin = "anonymous";
    mediaSource.src = src;
    mediaSource.loop = true;
    mediaSource.muted = true;
    mediaSource.autoplay = true;
    mediaSource.playsInline = true;
    mediaSource.onloadedmetadata = () => {
        isSourceLoaded = true;
        isVideo = true;
        mediaSource.play();
        fitCanvasToSource();
        recordingStatus.textContent = "Video loaded!";
    };
    mediaSource.onerror = () => {
        recordingStatus.textContent = "⚠️ Failed to load video. Check URL or CORS policy.";
        recordingStatus.style.color = '#ff6b6b';
    };
}

function fitCanvasToSource() {
    canvas.width = 512;
    canvas.height = 512;
}

// --- Updates ---
animSelect.addEventListener('change', (e) => state.anim = sanitizeAnimName(e.target.value));
exportSelect.addEventListener('change', (e) => {
    state.format = ALLOWED_FORMATS.includes(e.target.value) ? e.target.value : 'webp';
});
speedRange.addEventListener('input', (e) => {
    state.speed = parseFloat(e.target.value);
    document.getElementById('speedVal').textContent = state.speed.toFixed(1) + 'x';
});
ampRange.addEventListener('input', (e) => {
    state.intensity = parseInt(e.target.value) / 100;
    document.getElementById('ampVal').textContent = e.target.value + '%';
});

// --- Render Loop ---
function drawScene() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (isSourceLoaded && mediaSource) {
        const t = time * state.speed;
        const amp = state.intensity;

        ctx.save();
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        ctx.translate(cx, cy);

        switch (state.anim) {
            case 'breath':
                const scaleB = 1 + Math.sin(t * 0.05) * 0.05 * amp;
                ctx.scale(1, scaleB);
                const h = isVideo ? mediaSource.videoHeight : mediaSource.height;
                ctx.translate(0, (1 - scaleB) * (h / 2 * (canvas.width * 0.6 / (isVideo ? mediaSource.videoWidth : mediaSource.width))));
                break;
            case 'float':
                const yFloat = Math.sin(t * 0.05) * 15 * amp;
                ctx.translate(0, yFloat);
                break;
            case 'jump':
                const jumpPhase = (t * 0.1) % (Math.PI * 2);
                let yJump = 0, scaleY = 1, scaleX = 1;
                if (jumpPhase < Math.PI) {
                    yJump = -Math.sin(jumpPhase) * 50 * amp;
                } else {
                    const landPhase = jumpPhase - Math.PI;
                    if (landPhase < 0.5) {
                        const sq = Math.sin(landPhase * Math.PI * 2) * 0.2 * amp;
                        scaleY = 1 - sq; scaleX = 1 + sq;
                    }
                }
                ctx.translate(0, yJump);
                ctx.scale(scaleX, scaleY);
                break;
            case 'shake':
                const rotS = Math.sin(t * 0.5) * 0.1 * amp;
                ctx.rotate(rotS);
                break;
            case 'squash':
                const sqJ = Math.sin(t * 0.1) * 0.15 * amp;
                ctx.scale(1 + sqJ, 1 - sqJ);
                break;
            case 'spin':
                const spinW = Math.cos(t * 0.05);
                ctx.scale(spinW, 1);
                break;
        }

        const srcW = isVideo ? mediaSource.videoWidth : mediaSource.width;
        const srcH = isVideo ? mediaSource.videoHeight : mediaSource.height;
        const maxW = canvas.width * 0.6;
        const ratio = Math.min(maxW / srcW, maxW / srcH);
        const drawW = srcW * ratio;
        const drawH = srcH * ratio;

        ctx.drawImage(mediaSource, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
    }
}

function animate() {
    if (!isRecording) {
        drawScene();
        time++;
    }
    animationId = requestAnimationFrame(animate);
}
animate();

// --- Recorder Logic ---
let mediaRecorder;
let recordedChunks = [];

recordBtn.addEventListener('click', async () => {
    if (!isSourceLoaded) {
        recordingStatus.textContent = "⚠️ Please load an image or video first!";
        recordingStatus.style.color = '#ff6b6b';
        return;
    }

    // Security Check for FFmpeg (WebP/GIF)
    if (state.format !== 'webm') {
        if (isFileProtocol) {
            recordingStatus.textContent = "⚠️ Security: file:// protocol blocked. Use localhost for WebP/GIF. Falling back to WebM.";
            recordingStatus.style.color = '#ffaa00';
            state.format = 'webm';
            exportSelect.value = 'webm';
        } else if (!ffmpeg.isLoaded()) {
            recordingStatus.textContent = 'Loading FFmpeg Core...';
            try {
                await ffmpeg.load();
            } catch (e) {
                console.error(e);
                recordingStatus.textContent = "⚠️ FFmpeg failed. Run 'python server.py' and reload. Falling back to WebM.";
                recordingStatus.style.color = '#ffaa00';
                state.format = 'webm';
                exportSelect.value = 'webm';
            }
        }
    }

    startRecording();
});

async function startRecording() {
    isRecording = true;
    toggleControls(false);

    if (state.format === 'webm') {
        recordWebM(); // Fast native recording
    } else {
        await recordFrameSequence(); // High quality frame-by-frame (WebP, GIF, WebM HQ)
    }
}

function toggleControls(enabled) {
    document.querySelectorAll('button, input, select').forEach(el => el.disabled = !enabled);
    if (!enabled) {
        recordBtn.textContent = 'Recording...';
        recordBtn.classList.add('recording');
    } else {
        recordBtn.textContent = '🔴 Record (3s)';
        recordBtn.classList.remove('recording');
    }
}

// Method 1: Fast WebM Recording (Standard)
function recordWebM() {
    const stream = canvas.captureStream(60);
    // Try VP9 for better alpha support in some browsers
    const types = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    let options = { mimeType: '' };
    for (let t of types) {
        if (MediaRecorder.isTypeSupported(t)) { options.mimeType = t; break; }
    }

    mediaRecorder = new MediaRecorder(stream, options);
    recordedChunks = [];

    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        previewVideo.src = URL.createObjectURL(blob);
        finishRecording(blob);
    };

    recordingStatus.textContent = "Recording WebM...";
    mediaRecorder.start();

    setTimeout(() => {
        if (mediaRecorder.state === 'recording') mediaRecorder.stop();
    }, 3000);
}

// Method 2: High-Quality Frame Capture (WebP/GIF)
async function recordFrameSequence() {
    recordingStatus.textContent = "Capturing Frames...";

    const frames = [];
    const fps = 30; // 30fps is standard for GIF/WebP export
    const duration = 3;
    const totalFrames = fps * duration;

    const originalTime = time;
    time = 0; // Reset animation for clean loop

    try {
        for (let i = 0; i < totalFrames; i++) {
            // 1. Draw Frame
            drawScene();

            // 2. Capture Blob (PNG preserves full transparency)
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            frames.push(blob);

            // 3. Advance Logic
            // Advance by 2 units per frame (since native is ~60hz, and export is 30hz)
            time += 2;

            if (i % 5 === 0) {
                recordingStatus.textContent = `Capturing: ${Math.round((i / totalFrames) * 100)}%`;
                await new Promise(r => setTimeout(r, 0)); // Yield UI
            }
        }

        recordingStatus.textContent = "Encoding...";
        await convertFramesToOutput(frames, state.format, fps);

    } catch (e) {
        console.error(e);
        recordingStatus.textContent = "⚠️ Recording failed: " + e.message;
        recordingStatus.style.color = '#ff6b6b';
    } finally {
        time = originalTime; // Restore
        isRecording = false;
        toggleControls(true);
        recordingStatus.textContent = "Done!";
    }
}

async function convertFramesToOutput(frames, format, fps) {
    if (!ffmpeg.isLoaded()) await ffmpeg.load();

    // Clear FS
    try {
        const potentialFiles = ffmpeg.FS('readdir', '/');
        for (const f of potentialFiles) {
            if (f.startsWith('frame_')) ffmpeg.FS('unlink', f);
        }
    } catch (e) { }

    // Write Frames
    recordingStatus.textContent = "Writing frames...";
    for (let i = 0; i < frames.length; i++) {
        const name = `frame_${i.toString().padStart(3, '0')}.png`;
        ffmpeg.FS('writeFile', name, await fetchFile(frames[i]));
    }

    recordingStatus.textContent = "Encoding (please wait)...";

    if (format === 'webp') {
        // PNG Sequence -> Animated WebP
        // STRATEGY: "Fresh Canvas" method.
        // We use a complex filter to generate a transparent black background for every frame
        // and overlay the image on top. This forces the encoder to see the full alpha context.
        // Combined with -g 1 (All Intra), this disables inter-frame blending optimization.

        // Ensure dimensions match canvas (512x512)
        const w = canvas.width;
        const h = canvas.height;

        // PNG Sequence -> Animated WebP
        // NOTE: Ghosting/Transparency issues are a known limitation.
        await ffmpeg.run(
            '-framerate', `${fps}`,
            '-i', 'frame_%03d.png',
            '-vcodec', 'libwebp',
            '-lossless', '0',
            '-q:v', '90',
            '-loop', '0',
            '-preset', 'default',
            '-an',
            '-vsync', '0',
            '-vf', 'format=rgba',
            'output.webp'
        );

        const data = ffmpeg.FS('readFile', 'output.webp');
        const blob = new Blob([data.buffer], { type: 'image/webp' });

        // Show Image Preview instead of Video for WebP
        previewVideo.style.display = 'none';

        // Remove existing img preview if any
        const existingImg = downloadSection.querySelector('img');
        if (existingImg) existingImg.remove();

        const img = document.createElement('img');
        img.src = URL.createObjectURL(blob);
        img.style.maxWidth = '100%';
        img.style.maxHeight = '300px';
        img.style.display = 'block';
        img.style.margin = '0 auto';
        downloadSection.insertBefore(img, downloadLink);

        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = `mascot_${state.anim}.webp`;
        downloadLink.textContent = '⬇️ Download Animated WebP';

    } else if (format === 'gif') {
        // PNG Sequence -> Palette -> GIF (Transparent)
        // 1. Generate Palette
        await ffmpeg.run(
            '-framerate', `${fps}`,
            '-i', 'frame_%03d.png',
            '-vf', 'palettegen=reserve_transparent=1',
            '-update', '1',
            'palette.png'
        );
        // 2. Encode GIF
        await ffmpeg.run(
            '-framerate', `${fps}`,
            '-i', 'frame_%03d.png',
            '-i', 'palette.png',
            '-lavfi', 'paletteuse=alpha_threshold=128',
            '-gifflags', '-offsetting',
            'output.gif'
        );

        const data = ffmpeg.FS('readFile', 'output.gif');
        const blob = new Blob([data.buffer], { type: 'image/gif' });

        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = `mascot_${state.anim}.gif`;
        downloadLink.textContent = '⬇️ Download Animated GIF';

    } else if (format === 'webm_hq') {
        // PNG Sequence -> WebM (VP9)
        // VP9 supports transparency natively and handles alpha much better than WebP animation in ffmpeg.wasm
        await ffmpeg.run(
            '-framerate', `${fps}`,
            '-i', 'frame_%03d.png',
            '-c:v', 'libvpx-vp9', // VP9 codec
            '-b:v', '0',          // Constant quality mode
            '-crf', '30',         // Quality (lower is better, 30 is balanced)
            '-pix_fmt', 'yuva420p', // Important for alpha
            '-an',
            'output.webm'
        );

        const data = ffmpeg.FS('readFile', 'output.webm');
        const blob = new Blob([data.buffer], { type: 'video/webm' });

        previewVideo.src = URL.createObjectURL(blob);
        previewVideo.style.display = 'block';

        // Cleanup img preview
        const existingImg = downloadSection.querySelector('img');
        if (existingImg) existingImg.remove();

        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = `mascot_${state.anim}.webm`;
        downloadLink.textContent = '⬇️ Download High-Quality WebM';
    } else if (format === 'sprite') {
        // Sprite Sheet Generation (No FFmpeg)
        // 1. Calculate dimensions
        const width = 512;
        const height = 512;
        const totalWidth = width * frames.length;

        // 2. Create Strip Canvas
        const stripCanvas = document.createElement('canvas');
        stripCanvas.width = totalWidth;
        stripCanvas.height = height;
        const stripCtx = stripCanvas.getContext('2d');

        // 3. Draw frames
        for (let i = 0; i < frames.length; i++) {
            const imgBitmap = await createImageBitmap(frames[i]);
            stripCtx.drawImage(imgBitmap, i * width, 0, width, height);
        }

        // 4. Export PNG
        stripCanvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);

            // Preview: Render actual CSS animation in the preview box
            const previewContainer = document.getElementById('spritePreviewContainer');
            const previewDiv = document.getElementById('spritePreview');

            previewVideo.style.display = 'none';
            const existingImg = downloadSection.querySelector('img');
            if (existingImg) existingImg.remove();

            // Show new preview container
            previewContainer.style.display = 'flex';

            // Apply Dynamic Styles to preview div
            const duration = (frames.length / 30).toFixed(1); // 30fps assumption
            previewDiv.style.width = '512px';
            previewDiv.style.height = '512px';
            previewDiv.style.backgroundImage = `url('${url}')`;
            previewDiv.style.backgroundRepeat = 'no-repeat';

            // We need to inject the keyframes into the document to animate firmly
            // Calculate step distance (sanitized for safety)
            const finalPos = sanitizeNumber(-totalWidth);
            const safeFrameCount = sanitizeNumber(frames.length);
            const safeDuration = sanitizeNumber(duration);
            const safeAnim = sanitizeAnimName(state.anim);

            // Create a unique name for this animation run (only alphanumeric + underscore)
            const animName = `play_${Date.now()}`;
            const styleEl = document.createElement('style');
            styleEl.textContent = `@keyframes ${animName} { 100% { background-position: ${finalPos}px 0; } }`;
            document.head.appendChild(styleEl);

            previewDiv.style.animation = `${animName} ${safeDuration}s steps(${safeFrameCount}) infinite`;

            // Scale down preview if too big
            const scale = Math.min(300 / 512, 1);
            previewDiv.style.transform = `scale(${scale})`;

            // 5. Generate CSS (with sanitized values)
            const safeTotalWidth = sanitizeNumber(totalWidth);
            const cssCode = `.mascot {
    width: 512px;
    height: 512px;
    background: url('mascot_${safeAnim}.png') no-repeat;
    animation: play_${safeAnim} ${safeDuration}s steps(${safeFrameCount}) infinite;
}

@keyframes play_${safeAnim} {
    100% { background-position: -${safeTotalWidth}px 0; }
}`;
            document.getElementById('cssOutput').value = cssCode;
            document.getElementById('cssOutputContainer').style.display = 'block';

            // Download Link
            downloadLink.href = url;
            downloadLink.download = `mascot_${safeAnim}.png`;
            downloadLink.textContent = '⬇️ Download Sprite PNG';

        }, 'image/png');

        return; // Skip FFmpeg cleanup
    }

    // Cleanup FFmpeg files
    for (let i = 0; i < frames.length; i++) {
        ffmpeg.FS('unlink', `frame_${i.toString().padStart(3, '0')}.png`);
    }

    downloadSection.style.display = 'block';
}

function finishRecording(blob) {
    toggleControls(true);
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = `mascot_${state.anim}.webm`;
    downloadLink.textContent = '⬇️ Download WebM';
    downloadSection.style.display = 'block';
    recordingStatus.textContent = "Done!";
}
