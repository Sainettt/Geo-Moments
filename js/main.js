
import { initDB, addMomentToDB, clearDB } from './db.js';
import { resizeImage, getSupportedMimeType } from './utils.js';
import { initMap } from './map.js';
import { renderGallery, updateOnlineStatus } from './ui.js';

// --- State ---
let currentImageBase64 = null;
let currentGeo = null;
let currentAudioBase64 = null;

// --- Service Worker ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Путь к sw.js может отличаться, так как main.js в папке js/
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('SW Registered'))
            .catch(err => console.log('SW Failed', err));
    });
}

// --- Router ---
async function router(viewId) {
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active-view'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));

    const target = document.getElementById(viewId);
    if(target) target.classList.add('active-view');
    
    const btn = document.querySelector(`button[data-target="${viewId}"]`);
    if(btn) btn.classList.add('active');

    if(viewId === 'home') await renderGallery();
    if(viewId === 'add') resetForm();
    if(viewId === 'map') await initMap();
}

// Делаем router глобальным, чтобы работал onclick в HTML
window.router = router;

// --- Form Logic: Camera & Image ---
const cameraInput = document.getElementById('cameraInput');
const previewArea = document.getElementById('preview-area');

if(cameraInput) {
    cameraInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        previewArea.innerHTML = '<p>Przetwarzanie... ⏳</p>';
        resizeImage(file).then(base64 => {
            currentImageBase64 = base64;
            previewArea.innerHTML = `<img src="${currentImageBase64}" alt="Preview">`;
        }).catch(err => {
            console.error(err);
            previewArea.innerHTML = '<p style="color:red">Błąd zdjęcia</p>';
        });
    });
}

// --- Form Logic: Geolocation ---
const geoBtn = document.getElementById('geoBtn');
const geoStatus = document.getElementById('geoStatus');

if(geoBtn) {
    geoBtn.addEventListener('click', () => {
        if (!('geolocation' in navigator)) return;
        geoStatus.innerText = 'Pobieranie... 🛰️';
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                currentGeo = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                geoStatus.innerText = `✅ ${currentGeo.lat.toFixed(4)}, ${currentGeo.lng.toFixed(4)}`;
            },
            (err) => { geoStatus.innerText = '❌ Błąd GPS'; }
        );
    });
}

// --- Form Logic: Audio ---
const startRecordBtn = document.getElementById('startRecordBtn');
const stopRecordBtn = document.getElementById('stopRecordBtn');
const audioPreview = document.getElementById('audioPreview');
let mediaRecorder;
let audioChunks = [];

if (startRecordBtn) {
    startRecordBtn.addEventListener('click', async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mimeType = getSupportedMimeType();
            
            mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
            audioChunks = [];

            mediaRecorder.ondataavailable = e => {
                if(e.data.size > 0) audioChunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunks, { type: mimeType || 'audio/webm' });
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = () => {
                    currentAudioBase64 = reader.result;
                    if(audioPreview) {
                        audioPreview.src = currentAudioBase64;
                        audioPreview.classList.remove('hidden');
                    }
                };
            };

            mediaRecorder.start();
            startRecordBtn.classList.add('hidden');
            stopRecordBtn.classList.remove('hidden');
            setTimeout(() => { if(mediaRecorder && mediaRecorder.state==='recording') stopRecordBtn.click(); }, 15000);
        } catch (e) { alert("Brak mikrofonu"); }
    });

    stopRecordBtn.addEventListener('click', () => {
        if(mediaRecorder && mediaRecorder.state === 'recording') { 
            mediaRecorder.stop(); 
            mediaRecorder.stream.getTracks().forEach(t=>t.stop());
        }
        startRecordBtn.classList.remove('hidden');
        stopRecordBtn.classList.add('hidden');
    });
}

// --- Form Logic: Save ---
const saveBtn = document.getElementById('saveBtn');
const descInput = document.getElementById('descInput');

if(saveBtn) {
    saveBtn.addEventListener('click', async () => {
        if (!currentImageBase64) return alert("Zrób zdjęcie! 📸");
        if (!descInput.value.trim()) return alert("Opisz to! 📝");

        const newMoment = {
            id: Date.now(),
            image: currentImageBase64,
            geo: currentGeo,
            audio: currentAudioBase64,
            desc: descInput.value.trim(),
            date: new Date().toLocaleString('pl-PL')
        };

        saveBtn.innerText = "Zapisywanie...";
        saveBtn.disabled = true;

        try {
            await addMomentToDB(newMoment);
            if(navigator.vibrate) navigator.vibrate(200);
            alert("Zapisano! 🎉");
            resetForm();
            router('home');
        } catch (error) {
            alert("Błąd zapisu: " + error.message);
        } finally {
            saveBtn.innerText = "Zapisz Moment";
            saveBtn.disabled = false;
        }
    });
}

function resetForm() {
    currentImageBase64 = null;
    currentGeo = null;
    currentAudioBase64 = null;
    if(descInput) descInput.value = '';
    if(previewArea) previewArea.innerHTML = '';
    if(geoStatus) geoStatus.innerText = 'Lokalizacja nieznana';
    if(audioPreview) {
        audioPreview.src = '';
        audioPreview.classList.add('hidden');
    }
    if(cameraInput) cameraInput.value = '';
}

// --- System ---
const clearBtn = document.getElementById('clearData');
if(clearBtn) {
    clearBtn.addEventListener('click', async () => {
        if(confirm("Usunąć WSZYSTKO?")) {
            await clearDB();
            renderGallery();
            alert("Wyczyszczono.");
        }
    });
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// Init
document.addEventListener('DOMContentLoaded', () => {
    updateOnlineStatus();
    initDB().then(() => {
        console.log("DB Ready");
        router('home');
    });
});