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
        alert("Failed to load Image! Check URL or CORS policy.");
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
        alert("Failed to load Video! Check URL or CORS policy.");
    };
}

function fitCanvasToSource() {
    canvas.width = 512;
    canvas.height = 512;
}

// --- Updates ---
animSelect.addEventListener('change', (e) => state.anim = e.target.value);
exportSelect.addEventListener('change', (e) => state.format = e.target.value);
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
    if (!isSourceLoaded) return alert('Please load an image or video first!');

    // Security Check for FFmpeg (WebP/GIF)
    if (state.format !== 'webm') {
        if (isFileProtocol) {
            alert('⚠️ Security Restriction:\nFFmpeg cannot run on file:// protocol because SharedArrayBuffer is blocked.\nRun on localhost to use WebP/GIF export.\n\nFalling back to WebM.');
            state.format = 'webm';
            exportSelect.value = 'webm';
        } else if (!ffmpeg.isLoaded()) {
            recordingStatus.textContent = 'Loading FFmpeg Core...';
            try {
                await ffmpeg.load();
            } catch (e) {
                console.error(e);
                alert('⚠️ FFmpeg Load Failed!\n\nReason: SharedArrayBuffer is likely blocked.\n\nSolution:\n1. Run "python server.py" (included in repo).\n2. Reload this page.\n\nFalling back to WebM (Black background in some players).');
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
        recordWebM();
    } else {
        await recordFrameSequence();
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
        alert("Recording Failed: " + e.message);
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
        // PNG Sequence -> Animated WebP (Lossless, Transparent)
        await ffmpeg.run(
            '-framerate', `${fps}`,
            '-i', 'frame_%03d.png',
            '-vcodec', 'libwebp',
            '-lossless', '1',
            '-loop', '0',
            '-preset', 'default',
            '-an',
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
    }

    // Cleanup
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
