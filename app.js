console.log("App loaded");

// --- 1. Service Worker & Database Config ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('SW Registered!', reg))
            .catch(err => console.log('SW Failed', err));
    });
}

// Конфигурация IndexedDB
const DB_NAME = 'GeoMomentsDB';
const DB_VERSION = 1;
const STORE_NAME = 'moments';
let db = null;

// --- 2. Database Helper Functions (IndexedDB) ---

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log("DB Open Success");
            resolve(db);
        };

        request.onerror = (event) => {
            console.error("DB Error:", event.target.error);
            reject("Error opening database");
        };
    });
}

function addMomentToDB(moment) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(moment);
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
    });
}

function getMomentsFromDB() {
    return new Promise((resolve, reject) => {
        if (!db) {
            initDB().then(() => getMomentsFromDB().then(resolve).catch(reject));
            return;
        }
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            const result = request.result.sort((a, b) => b.id - a.id);
            resolve(result);
        };
        request.onerror = (e) => reject(e.target.error);
    });
}

function deleteMomentFromDB(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
    });
}

function clearDB() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
    });
}


// --- 3. State & Variables ---
let currentImageBase64 = null;
let currentGeo = null;
let currentAudioBase64 = null;
let mapInstance = null;
let mapMarkers = [];

// --- 4. Image Resizer ---
function resizeImage(file) {
    const maxWidth = 1024;
    const quality = 0.7;

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height = Math.round(height * (maxWidth / width));
                    width = maxWidth;
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(dataUrl);
            };
            img.onerror = err => reject(err);
        };
        reader.onerror = err => reject(err);
    });
}

// --- 5. Navigation Logic ---
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

// --- 6. Map Logic ---
async function initMap() {
    if (mapInstance) {
        setTimeout(() => mapInstance.invalidateSize(), 100);
        await loadMapMarkers();
        return;
    }

    if (typeof L === 'undefined' || !document.getElementById('map-container')) return;

    mapInstance = L.map('map-container').setView([52.0, 19.0], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(mapInstance);

    await loadMapMarkers();
}

async function loadMapMarkers() {
    if (!mapInstance) return;
    mapMarkers.forEach(m => mapInstance.removeLayer(m));
    mapMarkers = [];

    const data = await getMomentsFromDB();

    data.forEach(item => {
        if (item.geo && item.geo.lat) {
            const marker = L.marker([item.geo.lat, item.geo.lng])
                .addTo(mapInstance)
                .bindPopup(`
                    <b>${escapeHtml(item.desc)}</b><br>
                    <img src="${item.image}" style="width:100px; margin-top:5px; border-radius:4px;">
                    <br><small>${item.date}</small>
                `);
            mapMarkers.push(marker);
        }
    });
}

// --- 7. Gallery & Details ---
async function renderGallery() {
    const list = document.getElementById('moments-list');
    
    let data = [];
    try {
        data = await getMomentsFromDB();
    } catch (e) {
        console.error("Error reading DB", e);
        list.innerHTML = '<p class="empty-state">Błąd bazy danych.</p>';
        return;
    }

    if (data.length === 0) {
        list.innerHTML = '<p class="empty-state">Brak zapisanych momentów. Dodaj pierwszy!</p>';
        return;
    }

    list.innerHTML = data.map(item => `
        <div class="card" onclick="openDetails(${item.id})">
            <img src="${item.image}" alt="Moment" loading="lazy">
            <div class="card-content">
                <h3>${escapeHtml(item.desc)}</h3>
                <p class="date"><small>📅 ${item.date}</small></p>
                
                ${item.audio ? `<audio controls src="${item.audio}" style="width:100%; margin:10px 0;" onclick="event.stopPropagation()"></audio>` : ''}
                
                ${item.geo ? `<p class="geo-link">📍 <a href="https://www.google.com/maps?q=${item.geo.lat},${item.geo.lng}" target="_blank" rel="noopener" onclick="event.stopPropagation()">Zobacz na mapie</a></p>` : ''}
            </div>
        </div>
    `).join('');
}

async function openDetails(id) {
    if(confirm("Czy chcesz usunąć ten moment? 🗑️")) {
        try {
            await deleteMomentFromDB(id);
            await renderGallery();
            await loadMapMarkers();
        } catch(e) {
            alert("Błąd podczas usuwania: " + e);
        }
    }
}

// --- 8. Add Moment Logic ---
const cameraInput = document.getElementById('cameraInput');
const previewArea = document.getElementById('preview-area');

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

const geoBtn = document.getElementById('geoBtn');
const geoStatus = document.getElementById('geoStatus');

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

// --- AUDIO FIX (iOS SUPPORT) ---
const startRecordBtn = document.getElementById('startRecordBtn');
const stopRecordBtn = document.getElementById('stopRecordBtn');
const audioPreview = document.getElementById('audioPreview');
let mediaRecorder;
let audioChunks = [];

// Функция для определения поддерживаемого типа аудио
function getSupportedMimeType() {
    const types = [
        'audio/webm', // Android, Chrome, FF
        'audio/mp4',  // iOS Safari
        'audio/ogg',
        'audio/wav'
    ];
    for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) {
            return type;
        }
    }
    return ''; // Браузер выберет дефолтный
}

if (startRecordBtn) {
    startRecordBtn.addEventListener('click', async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Определяем формат
            const mimeType = getSupportedMimeType();
            const options = mimeType ? { mimeType } : {};
            
            console.log("Nagrywanie w formacie:", mimeType); // Для отладки

            mediaRecorder = new MediaRecorder(stream, options);
            audioChunks = [];

            mediaRecorder.ondataavailable = e => {
                if(e.data.size > 0) audioChunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                // Используем тот же формат при создании файла
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

        } catch (e) { 
            console.error(e);
            alert("Brak dostępu do mikrofonu lub błąd nagrywania."); 
        }
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
// ------------------------------

const saveBtn = document.getElementById('saveBtn');
const descInput = document.getElementById('descInput');

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
        console.error(error);
        alert("Błąd zapisu: " + error.message);
    } finally {
        saveBtn.innerText = "Zapisz Moment";
        saveBtn.disabled = false;
    }
});

function resetForm() {
    currentImageBase64 = null;
    currentGeo = null;
    currentAudioBase64 = null;
    descInput.value = '';
    previewArea.innerHTML = '';
    geoStatus.innerText = 'Lokalizacja nieznana';
    if(audioPreview) {
        audioPreview.src = '';
        audioPreview.classList.add('hidden');
    }
    cameraInput.value = '';
}

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

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

function updateOnlineStatus() {
    const status = navigator.onLine ? "Online 🟢" : "Offline 🔴";
    const el = document.getElementById('network-status');
    if(el) el.innerText = status;
    const banner = document.getElementById('offline-banner');
    if(banner) navigator.onLine ? banner.classList.add('hidden') : banner.classList.remove('hidden');
}
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// --- Init App ---
document.addEventListener('DOMContentLoaded', () => {
    updateOnlineStatus();
    initDB()
        .then(() => {
            console.log("DB Ready");
            router('home');
        })
        .catch(e => console.error("DB Init Failed", e));
});