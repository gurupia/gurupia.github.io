// UMD Load: imglyRemoveBackground is available globally from script tag in index.html

// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const processBtn = document.getElementById('processBtn');
const statusBar = document.getElementById('statusBar');
const resultArea = document.getElementById('resultArea');
const originalImg = document.getElementById('originalImg');
const resultImg = document.getElementById('resultImg');
const downloadBtn = document.getElementById('downloadBtn');

let currentFile = null;

// --- Drag & Drop Logic ---
dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        alert("Please upload an image file (PNG, JPG)");
        return;
    }

    currentFile = file;
    processBtn.disabled = false;
    statusBar.textContent = `Selected: ${file.name}`;

    // Show preview
    const url = URL.createObjectURL(file);
    document.querySelector('.drop-content p').textContent = file.name;
}

// --- Processing Logic ---
processBtn.addEventListener('click', async () => {
    if (!currentFile) return;

    // UI Updates
    processBtn.disabled = true;
    processBtn.classList.add('processing');
    processBtn.textContent = "Removing Background... (First run downloads models)";
    statusBar.textContent = "Initializing AI Model...";
    resultArea.style.display = 'none';

    try {
        // Config: Explicitly point to the asset CDN to avoid local resolution errors.
        const config = {
            publicPath: "https://static.img.ly/background-removal-data/",
            debug: true, // Enable debug logs
            progress: (key, current, total) => {
                const percent = Math.round((current / total) * 100);
                statusBar.textContent = `Loading Model (${key}): ${percent}%`;
            }
        };

        // Run AI
        const blob = await imglyRemoveBackground(currentFile, config);

        // Success
        const url = URL.createObjectURL(blob);
        resultImg.src = url;
        originalImg.src = URL.createObjectURL(currentFile);

        downloadBtn.href = url;
        downloadBtn.download = `transparent_${currentFile.name.split('.')[0]}.png`;

        resultArea.style.display = 'block';
        statusBar.textContent = "Done! ✨";

    } catch (error) {
        console.error(error);
        statusBar.textContent = `Error: ${error.message}`;
        alert("Background removal failed. See console for details.");
    } finally {
        processBtn.disabled = false;
        processBtn.classList.remove('processing');
        processBtn.textContent = "✨ Remove Background";
    }
});
