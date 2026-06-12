// LocalStorage Keys
const KEYS = {
    PROFILE: 'focusShieldUserProfile',
    USAGE: 'focusShieldTodayUsage',
    LINK_SCANS: 'focusShieldFraudLinkScans'
};

// State
let userProfile = JSON.parse(localStorage.getItem(KEYS.PROFILE)) || null;
let appUsageTimer;
let sessionTime = 0; // seconds

// DOM Elements
const setupOverlay = document.getElementById('setup-overlay');
const navItems = document.querySelectorAll('#nav-menu li');
const pages = document.querySelectorAll('.page');

// --- Initialization ---
function initApp() {
    if (!userProfile) {
        setupOverlay.classList.remove('hidden');
    } else {
        document.getElementById('display-name').innerText = userProfile.name;
        updateDashboard();
        startUsageTracking();
        renderAIPrompts();
    }
}

// --- Navigation ---
navItems.forEach(item => {
    item.addEventListener('click', () => {
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        const targetId = item.getAttribute('data-target');
        pages.forEach(page => {
            page.classList.add('hidden');
            if(page.id === targetId) page.classList.remove('hidden');
        });
    });
});

// --- Profile Setup ---
document.getElementById('setup-profession').addEventListener('change', (e) => {
    document.getElementById('setup-other-prof').classList.toggle('hidden', e.target.value !== 'Other');
});

document.getElementById('btn-save-profile').addEventListener('click', () => {
    const name = document.getElementById('setup-name').value;
    const profession = document.getElementById('setup-profession').value;
    const goal = document.getElementById('setup-goal').value;

    if (!name || !profession) return alert("Please fill details.");

    userProfile = { name, profession, goal, setupDate: new Date().toISOString() };
    localStorage.setItem(KEYS.PROFILE, JSON.stringify(userProfile));
    
    setupOverlay.classList.add('hidden');
    initApp();
});

// --- Dashboard Logic ---
function updateDashboard() {
    const rules = {
        'Student': 'Focus: 3 hours | Entertainment Limit: 1 hour',
        'Private job': 'Focus: 45 mins | Entertainment Limit: 1 hour',
        'Business owner': 'Focus: 3 hours | Entertainment Limit: 1 hour'
    };
    const plan = rules[userProfile.profession] || 'Custom limits based on goal.';
    document.getElementById('daily-plan-text').innerText = plan;
    
    let scans = JSON.parse(localStorage.getItem('focusShieldFileScans') || '[]');
    document.getElementById('file-scan-count').innerText = scans.length;
}

// --- Usage Tracking (Visibility API) ---
function startUsageTracking() {
    setInterval(() => {
        if (!document.hidden) {
            sessionTime++;
            if (sessionTime % 60 === 0) {
                document.getElementById('today-usage').innerText = `${Math.floor(sessionTime / 60)} mins`;
            }
        }
    }, 1000);
}

// --- AI Prompts ---
function renderAIPrompts() {
    const container = document.getElementById('prompt-container');
    const prompts = [
        { title: "Daily Schedule", text: `Main ${userProfile.profession} hoon. Mera main goal ${userProfile.goal} hai. Mujhe distraction-free daily plan do.` },
        { title: "Fraud Link Check", text: "Mujhe ek suspicious link mila hai. Iska cyber safety analysis karo aur risk batao." },
        { title: "Hidden App Safety", text: "Mere phone mein hidden/suspicious app hone ka shaq hai. Android/iPhone checking guide do." }
    ];

    container.innerHTML = prompts.map(p => `
        <div class="glass-card">
            <h3>${p.title}</h3>
            <p style="font-size: 0.9rem; margin-bottom: 1rem;">"${p.text}"</p>
            <button class="btn-outline" onclick="navigator.clipboard.writeText('${p.text}'); alert('Copied!')">Copy Prompt</button>
        </div>
    `).join('');
}

// --- Fraud Link Scanner ---
document.getElementById('btn-scan-link').addEventListener('click', () => {
    const url = document.getElementById('link-input').value.toLowerCase();
    const resultBox = document.getElementById('link-result');
    if (!url) return;

    let riskScore = 0;
    let reasons = [];

    if (!url.startsWith('https://')) { riskScore += 40; reasons.push('Missing HTTPS (Not Secure)'); }
    if (url.match(/(free|kyc|update|win|reward|apk)/)) { riskScore += 30; reasons.push('Suspicious keywords found'); }
    if (url.match(/bit\.ly|tinyurl/)) { riskScore += 20; reasons.push('URL Shortener used (Hides destination)'); }
    
    resultBox.classList.remove('hidden');
    if (riskScore >= 60) {
        resultBox.innerHTML = `<h3 class="danger-text">High Risk! (${riskScore}%)</h3><p>${reasons.join(', ')}</p><p><b>Advice:</b> Do not enter OTP or passwords.</p>`;
    } else {
        resultBox.innerHTML = `<h3 class="safe-text">Low Risk</h3><p>Seems relatively safe, but always verify the domain manually.</p>`;
    }
});

// --- OTP Emergency ---
document.getElementById('btn-emergency-otp').addEventListener('click', () => {
    document.getElementById('otp-steps').classList.remove('hidden');
});

// --- App Scanner (Manual Logic) ---
document.getElementById('btn-scan-app').addEventListener('click', () => {
    const chkUnknown = document.getElementById('chk-unknown').checked;
    const chkSms = document.getElementById('chk-sms').checked;
    const chkAdmin = document.getElementById('chk-admin').checked;
    const resBox = document.getElementById('app-result');

    let risk = 0;
    if(chkUnknown) risk += 40;
    if(chkSms) risk += 30;
    if(chkAdmin) risk += 30;

    resBox.classList.remove('hidden');
    if(risk >= 70) resBox.innerHTML = `<h3 class="danger-text">Dangerous App!</h3><p>Uninstall immediately. It has excessive permissions.</p>`;
    else if(risk >= 40) resBox.innerHTML = `<h3 style="color:orange;">Medium Risk</h3><p>Check app settings and revoke SMS/Admin permissions.</p>`;
    else resBox.innerHTML = `<h3 class="safe-text">Low Risk</h3><p>App appears standard. Monitor battery usage.</p>`;
});

// --- File Scanner (Web Crypto Hash) ---
const fileInput = document.getElementById('file-input');
const btnScanFile = document.getElementById('btn-scan-file');

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if(file) {
        document.getElementById('file-details').innerText = `Selected: ${file.name} (${(file.size/1024/1024).toFixed(2)} MB)`;
        btnScanFile.classList.remove('hidden');
    }
});

btnScanFile.addEventListener('click', async () => {
    const file = fileInput.files[0];
    if(!file) return;

    // Generate SHA-256 Hash
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const res = document.getElementById('file-result');
    res.classList.remove('hidden');
    
    let danger = file.name.endsWith('.apk') || file.name.endsWith('.exe') || file.name.match(/\.[a-zA-Z0-9]+\.[a-zA-Z0-9]+$/);
    
    res.innerHTML = `
        <h3>${danger ? '<span class="danger-text">High Risk File Warning!</span>' : '<span class="safe-text">File Analysis Complete</span>'}</h3>
        <p><b>Extension Risk:</b> ${danger ? 'Executable/Double Extension found' : 'Standard Format'}</p>
        <p style="font-size: 0.8em; word-break: break-all; margin-top: 5px;"><b>SHA-256:</b> ${hashHex}</p>
    `;
    
    let scans = JSON.parse(localStorage.getItem('focusShieldFileScans') || '[]');
    scans.push({ name: file.name, date: new Date() });
    localStorage.setItem('focusShieldFileScans', JSON.stringify(scans));
    updateDashboard();
});

// --- PDF Tools (pdf-lib & jsPDF) ---
document.getElementById('btn-merge-pdf').addEventListener('click', async () => {
    const files = document.getElementById('merge-pdf-inputs').files;
    if (files.length < 2) return alert('Select at least 2 PDFs');
    
    const { PDFDocument } = PDFLib;
    const mergedPdf = await PDFDocument.create();

    for (let file of files) {
        const bytes = await file.arrayBuffer();
        const pdf = await PDFDocument.load(bytes);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    const mergedBytes = await mergedPdf.save();
    downloadBlob(mergedBytes, 'Merged_FocusShield.pdf', 'application/pdf');
});

document.getElementById('btn-img-to-pdf').addEventListener('click', async () => {
    const files = document.getElementById('img-to-pdf-input').files;
    if (files.length === 0) return alert('Select images first');

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    for (let i = 0; i < files.length; i++) {
        if (i > 0) doc.addPage();
        const imgData = await toBase64(files[i]);
        doc.addImage(imgData, 'JPEG', 10, 10, 190, 0); // basic fit
    }
    doc.save('Images_FocusShield.pdf');
});

// --- Document Scanner (Camera) ---
const camInput = document.getElementById('camera-input');
const docCanvas = document.getElementById('doc-canvas');
const ctx = docCanvas.getContext('2d');
let currentImgData = null;

camInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if(!file) return;
    
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
        docCanvas.width = img.width;
        docCanvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        document.getElementById('btn-doc-grayscale').classList.remove('hidden');
        document.getElementById('btn-save-doc').classList.remove('hidden');
    }
});

document.getElementById('btn-doc-grayscale').addEventListener('click', () => {
    const imgData = ctx.getImageData(0, 0, docCanvas.width, docCanvas.height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i+1] + data[i+2]) / 3;
        data[i] = data[i+1] = data[i+2] = avg; // Apply B&W
    }
    ctx.putImageData(imgData, 0, 0);
});

// --- Image Compressor ---
const imgCompInput = document.getElementById('img-compress-input');
const qualitySlider = document.getElementById('img-quality');
let compImage = new Image();

imgCompInput.addEventListener('change', (e) => {
    if(e.target.files[0]) {
        compImage.src = URL.createObjectURL(e.target.files[0]);
        document.getElementById('btn-compress-img').classList.remove('hidden');
    }
});

qualitySlider.addEventListener('input', (e) => {
    document.getElementById('quality-val').innerText = `${Math.floor(e.target.value * 100)}%`;
});

document.getElementById('btn-compress-img').addEventListener('click', () => {
    const cvs = document.createElement('canvas');
    cvs.width = compImage.width; cvs.height = compImage.height;
    cvs.getContext('2d').drawImage(compImage, 0, 0);
    
    cvs.toBlob((blob) => {
        downloadBlob(blob, 'Compressed_FocusShield.jpg', 'image/jpeg');
    }, 'image/jpeg', parseFloat(qualitySlider.value));
});

// --- Focus Timer ---
let focusTimer;
let timeLeft = 25 * 60;
document.getElementById('btn-start-timer').addEventListener('click', () => {
    clearInterval(focusTimer);
    focusTimer = setInterval(() => {
        timeLeft--;
        let m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
        let s = (timeLeft % 60).toString().padStart(2, '0');
        document.getElementById('timer-display').innerText = `${m}:${s}`;
        if(timeLeft <= 0) clearInterval(focusTimer);
    }, 1000);
});
document.getElementById('btn-reset-timer').addEventListener('click', () => {
    clearInterval(focusTimer);
    timeLeft = 25 * 60;
    document.getElementById('timer-display').innerText = `25:00`;
});

// --- Helper Functions ---
function downloadBlob(data, filename, type) {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// --- PWA Installation ---
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('install-pwa-btn').classList.remove('hidden');
});

document.getElementById('install-pwa-btn').addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            document.getElementById('install-pwa-btn').classList.add('hidden');
        }
        deferredPrompt = null;
    }
});

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(() => console.log("SW Registered"));
}

window.onload = initApp;
