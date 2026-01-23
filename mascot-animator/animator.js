const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const imgInput = document.getElementById('imageInput');
const animSelect = document.getElementById('animType');
const speedRange = document.getElementById('speedRange');
const ampRange = document.getElementById('ampRange');
const recordBtn = document.getElementById('recordBtn');
const recordingStatus = document.getElementById('recordingStatus');
const previewVideo = document.getElementById('previewVideo');
const downloadLink = document.getElementById('downloadLink');
const downloadSection = document.getElementById('downloadSection');

let img = new Image();
let isImgLoaded = false;
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
    intensity: 1.0
};

// --- Initialization ---
imgInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            img.src = event.target.result;
            img.onload = () => {
                isImgLoaded = true;
                fitCanvasToImage();
            };
        };
        reader.readAsDataURL(file);
    }
});

function fitCanvasToImage() {
    const maxDim = 512;
    const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
    canvas.width = 512;
    canvas.height = 512;
}

// --- Updates ---
animSelect.addEventListener('change', (e) => state.anim = e.target.value);
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
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (isImgLoaded) {
        const t = time * state.speed;
        const amp = state.intensity;

        ctx.save();
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        ctx.translate(cx, cy);

        // --- PROC ANIMS ---
        switch (state.anim) {
            case 'breath':
                const scaleB = 1 + Math.sin(t * 0.05) * 0.05 * amp;
                ctx.scale(1, scaleB);
                ctx.translate(0, (1 - scaleB) * (img.height / 2));
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

        const maxW = canvas.width * 0.6;
        const ratio = Math.min(maxW / img.width, maxW / img.height);
        const drawW = img.width * ratio;
        const drawH = img.height * ratio;
        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
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
    if (!isImgLoaded) return alert('Please upload an image first!');

    // Load FFmpeg if not loaded
    if (!ffmpeg.isLoaded()) {
        recordingStatus.textContent = 'Loading FFmpeg Core (might take 10s)...';
        try {
            await ffmpeg.load();
        } catch (e) {
            alert('FFmpeg Failed to load! Falling back to WebM only.');
            console.error(e);
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
    // Use codecs=vp9 for best WebM quality which FFmpeg reads easily
    const types = ['video/webm;codecs=vp9', 'video/webm'];
    let options = { mimeType: '' };
    for (let t of types) {
        if (MediaRecorder.isTypeSupported(t)) { options.mimeType = t; break; }
    }

    mediaRecorder = new MediaRecorder(stream, options);
    recordedChunks = [];
    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
    mediaRecorder.onstop = async () => {
        const webmBlob = new Blob(recordedChunks, { type: 'video/webm' });

        // Show WebM preview first
        previewVideo.src = URL.createObjectURL(webmBlob);
        recordingStatus.textContent = 'converting to WebP...';

        try {
            await convertToWebP(webmBlob);
            recordBtn.disabled = false;
            recordBtn.textContent = '🔴 Record (3s)';
            recordBtn.classList.remove('recording');
            recordingStatus.textContent = 'Done!';
        } catch (e) {
            console.error(e);
            recordingStatus.textContent = 'Conversion failed. WebM valid.';
            recordBtn.disabled = false;
            recordBtn.classList.remove('recording');
            // Fallback download for WebM
            downloadLink.href = URL.createObjectURL(webmBlob);
            downloadLink.download = `mascot_${state.anim}.webm`;
            downloadLink.textContent = '⬇️ Download WebM (Fallback)';
            downloadSection.style.display = 'block';
        }
    };
    mediaRecorder.start();
}

function stopRecording() {
    mediaRecorder.stop();
}

async function convertToWebP(webmBlob) {
    if (!ffmpeg.isLoaded()) throw new Error('FFmpeg not loaded');

    // Write WebM to file system
    ffmpeg.FS('writeFile', 'input.webm', await fetchFile(webmBlob));

    // Run FFmpeg: WebM -> WebP (Loop infinite -loop 0)
    // -vcodec libwebp -lossless 1 (optional) or -q:v 80
    // -loop 0 for infinite loop
    await ffmpeg.run('-i', 'input.webm', '-vcodec', 'libwebp', '-lossless', '1', '-loop', '0', '-preset', 'default', '-an', '-vsync', '0', 'output.webp');

    // Read result
    const data = ffmpeg.FS('readFile', 'output.webp');

    // Create URL
    const webpBlob = new Blob([data.buffer], { type: 'image/webp' });
    const url = URL.createObjectURL(webmBlob);

    // Update Download Link
    downloadLink.href = url;
    downloadLink.download = `mascot_${state.anim}.webp`;
    downloadLink.textContent = '⬇️ Download Animated WebP';
    downloadSection.style.display = 'block';
}
