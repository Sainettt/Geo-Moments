// --- 1. Service Worker Registration ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('SW Registered!', reg))
            .catch(err => console.log('SW Failed', err));
    });
}

// --- 2. State & Variables ---
let currentImageBase64 = null;
let currentGeo = null;
const STORAGE_KEY = 'geo_moments_data';

// --- 3. Navigation Logic ---
function router(viewId) {
    // Hide all views
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active-view'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));

    // Show target view
    document.getElementById(viewId).classList.add('active-view');
    document.querySelector(`button[data-target="${viewId}"]`).classList.add('active');

    if(viewId === 'home') renderGallery();
}

// --- 4. Native Feature: Camera Handling ---
const cameraInput = document.getElementById('cameraInput');
const previewArea = document.getElementById('preview-area');

cameraInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (readerEvent) => {
            currentImageBase64 = readerEvent.target.result;
            previewArea.innerHTML = `<img src="${currentImageBase64}" alt="Preview">`;
            validateForm();
        };
        reader.readAsDataURL(file);
    }
});

// --- 5. Native Feature: Geolocation ---
const geoBtn = document.getElementById('geoBtn');
const geoStatus = document.getElementById('geoStatus');

geoBtn.addEventListener('click', () => {
    if (!('geolocation' in navigator)) {
        geoStatus.innerText = 'Geolokalizacja niedostępna';
        return;
    }

    geoStatus.innerText = 'Pobieranie...';
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            currentGeo = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            geoStatus.innerText = `Lokalizacja: ${currentGeo.lat.toFixed(4)}, ${currentGeo.lng.toFixed(4)}`;
            validateForm();
        },
        (error) => {
            geoStatus.innerText = 'Błąd pobierania lokalizacji.';
            console.error(error);
        }
    );
});

// --- 6. Form Logic ---
const saveBtn = document.getElementById('saveBtn');
const descInput = document.getElementById('descInput');

descInput.addEventListener('input', validateForm);

function validateForm() {
    // Aktywuj przycisk tylko jeśli mamy zdjęcie i opis
    if (currentImageBase64 && descInput.value.length > 0) {
        saveBtn.disabled = false;
    } else {
        saveBtn.disabled = true;
    }
}

saveBtn.addEventListener('click', () => {
    const newMoment = {
        id: Date.now(),
        image: currentImageBase64,
        geo: currentGeo,
        desc: descInput.value,
        date: new Date().toLocaleDateString()
    };

    saveData(newMoment);
    
    // Native Feature: Vibration (Haptic feedback)
    if(navigator.vibrate) navigator.vibrate(200);

    // Reset form
    currentImageBase64 = null;
    currentGeo = null;
    descInput.value = '';
    previewArea.innerHTML = '';
    geoStatus.innerText = 'Lokalizacja nieznana';
    saveBtn.disabled = true;

    // Go home
    router('home');
});

// --- 7. Data Storage (LocalStorage) ---
function saveData(moment) {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    existing.unshift(moment);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

function renderGallery() {
    const list = document.getElementById('moments-list');
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

    if (data.length === 0) {
        list.innerHTML = '<p class="empty-state">Brak zapisanych momentów.</p>';
        return;
    }

    list.innerHTML = data.map(item => `
        <div class="card">
            <img src="${item.image}" alt="Moment">
            <h3>${item.desc}</h3>
            <p><small>${item.date}</small></p>
            ${item.geo ? `<p>📍 <a href="https://www.google.com/maps?q=${item.geo.lat},${item.geo.lng}" target="_blank">Zobacz na mapie</a></p>` : ''}
        </div>
    `).join('');
}

// --- 8. Network Status Monitoring ---
function updateOnlineStatus() {
    const status = navigator.onLine ? "Online" : "Offline";
    document.getElementById('network-status').innerText = status;
    const banner = document.getElementById('offline-banner');
    
    if(!navigator.onLine) {
        banner.classList.remove('hidden');
    } else {
        banner.classList.add('hidden');
    }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus(); // Check on load

// Clear data logic
document.getElementById('clearData').addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    alert('Dane wyczyszczone!');
    renderGallery();
});

// Init
router('home');