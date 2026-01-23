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

let mediaSource = null; // Image or Video element
let isSourceLoaded = false;
let isVideo = false;
let time = 0;
let animationId = null;

// FFmpeg Instance
const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({
    log: true,
    corePath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js'
});

// Settings
let state = {
    anim: 'breath',
    speed: 1.0,
    intensity: 1.0,
    format: 'webp'
};

// --- Source Loading ---
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

    // Simple heuristic extension check, but browser load will be definitive
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
    const maxDim = 512;
    // Keep aspect ratio logic if needed in future
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
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Critical for transparency

    if (isSourceLoaded && mediaSource) {
        const t = time * state.speed;
        const amp = state.intensity;

        ctx.save();
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        ctx.translate(cx, cy);

        // --- PROC ANIMS ---
        // Apply animations to both Image and Video
        switch (state.anim) {
            case 'breath':
                const scaleB = 1 + Math.sin(t * 0.05) * 0.05 * amp;
                ctx.scale(1, scaleB);
                // Center based on source height
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

    time++;
    animationId = requestAnimationFrame(animate);
}
animate();

// --- Recorder Logic ---
let mediaRecorder;
let recordedChunks = [];

recordBtn.addEventListener('click', async () => {
    if (!isSourceLoaded) return alert('Please load an image or video first!');

    // Load FFmpeg if needed (WebP or GIF)
    if (state.format !== 'webm') {
        if (!ffmpeg.isLoaded()) {
            recordingStatus.textContent = 'Loading FFmpeg Core...';
            try {
                await ffmpeg.load();
            } catch (e) {
                alert('FFmpeg Failed to load! Falling back to WebM.');
                console.error(e);
                state.format = 'webm';
                exportSelect.value = 'webm';
            }
        }
    }

    startRecording();
    recordBtn.disabled = true;
    recordBtn.textContent = 'Recording...';
    recordBtn.classList.add('recording');
    recordingStatus.textContent = 'Capturing 3 seconds...';

    setTimeout(() => { stopRecording(); }, 3000);
});

function startRecording() {
    const stream = canvas.captureStream(60);
    const types = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    let options = { mimeType: '' };
    for (let t of types) {
        if (MediaRecorder.isTypeSupported(t)) { options.mimeType = t; break; }
    }

    mediaRecorder = new MediaRecorder(stream, options);
    recordedChunks = [];
    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
    mediaRecorder.onstop = async () => {
        const webmBlob = new Blob(recordedChunks, { type: 'video/webm' });

        previewVideo.src = URL.createObjectURL(webmBlob);

        if (state.format === 'webm') {
            downloadLink.href = URL.createObjectURL(webmBlob);
            downloadLink.download = `mascot_${state.anim}.webm`;
            downloadLink.textContent = '⬇️ Download WebM';
            downloadSection.style.display = 'block';
            resetBtn();
        } else {
            recordingStatus.textContent = `Converting to ${state.format.toUpperCase()}...`;
            try {
                await convertFormat(webmBlob, state.format);
                resetBtn();
                recordingStatus.textContent = 'Done!';
            } catch (e) {
                console.error(e);
                recordingStatus.textContent = 'Conversion failed.';
                resetBtn();
            }
        }
    };
    mediaRecorder.start();
}

function stopRecording() {
    mediaRecorder.stop();
}

function resetBtn() {
    recordBtn.disabled = false;
    recordBtn.textContent = '🔴 Record (3s)';
    recordBtn.classList.remove('recording');
}

async function convertFormat(webmBlob, format) {
    if (!ffmpeg.isLoaded()) throw new Error('FFmpeg not loaded');

    ffmpeg.FS('writeFile', 'input.webm', await fetchFile(webmBlob));

    if (format === 'webp') {
        // WebP Conversion
        await ffmpeg.run('-i', 'input.webm', '-vcodec', 'libwebp', '-lossless', '1', '-loop', '0', '-preset', 'default', '-an', '-vsync', '0', 'output.webp');
        const data = ffmpeg.FS('readFile', 'output.webp');
        const blob = new Blob([data.buffer], { type: 'image/webp' });
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = `mascot_${state.anim}.webp`;
        downloadLink.textContent = '⬇️ Download Animated WebP';
    } else if (format === 'gif') {
        // GIF Conversion (Palette generation for transparency)
        await ffmpeg.run('-i', 'input.webm', '-vf', 'palettegen=reserve_transparent=1', 'palette.png');
        await ffmpeg.run('-i', 'input.webm', '-i', 'palette.png', '-lavfi', 'paletteuse=alpha_threshold=128', '-gifflags', '-offsetting', 'output.gif');

        const data = ffmpeg.FS('readFile', 'output.gif');
        const blob = new Blob([data.buffer], { type: 'image/gif' });
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = `mascot_${state.anim}.gif`;
        downloadLink.textContent = '⬇️ Download Animated GIF';
    }

    downloadSection.style.display = 'block';
}
