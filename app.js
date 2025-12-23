console.log("App loaded");
// 1. Service Worker Registration
// Rejestracja Service Workera do działania offline (kr3)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('SW Registered!', reg))
            .catch(err => console.log('SW Failed', err));
    });
}

// 2. State & Variables
let currentImageBase64 = null;
let currentGeo = null;
const STORAGE_KEY = 'geo_moments_data_v2'; // Zmieniamy klucz, żeby nie kolidował starymi danymi

// helper: Image Resizer
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

                // Rysowanie na canvas
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                console.log(`Zdjęcie zmniejszone. Oryginał: ${file.size}, Po kompresji: ~${Math.round(dataUrl.length * 0.75)} bajtów`);
                resolve(dataUrl);
            };
            img.onerror = err => reject(err);
        };
        reader.onerror = err => reject(err);
    });
}


// 3. Navigation Logic
function router(viewId) {
    // Hide all views
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active-view'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));

    // Show target view
    document.getElementById(viewId).classList.add('active-view');
    document.querySelector(`button[data-target="${viewId}"]`).classList.add('active');

    if(viewId === 'home') renderGallery();
    if(viewId === 'add') resetForm();
}

// 4. Native Feature: Camera Handling (z kompresją) 
// Wykorzystanie natywnej kamery (kr2.1)
const cameraInput = document.getElementById('cameraInput');
const previewArea = document.getElementById('preview-area');

cameraInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    previewArea.innerHTML = '<p>Przetwarzanie zdjęcia... ⏳</p>';

    resizeImage(file)
        .then(resizedBase64 => {
            currentImageBase64 = resizedBase64;
            previewArea.innerHTML = `<img src="${currentImageBase64}" alt="Preview">`;
        })
        .catch(err => {
            console.error("Błąd przetwarzania obrazu:", err);
            previewArea.innerHTML = '<p style="color:red;">Nie udało się przetworzyć zdjęcia.</p>';
            alert('Błąd: Nie udało się załadować zdjęcia. Spróbuj inne.');
        });
});

// --- 5. Native Feature: Geolocation ---
// Wykorzystanie natywnej geolokalizacji (kr2.2)
const geoBtn = document.getElementById('geoBtn');
const geoStatus = document.getElementById('geoStatus');

geoBtn.addEventListener('click', () => {
    if (!('geolocation' in navigator)) {
        geoStatus.innerText = 'Geolokalizacja niedostępna na tym urządzeniu.';
        return;
    }

    geoStatus.innerText = 'Pobieranie... 🛰️';
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            currentGeo = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            geoStatus.innerText = `✅ Lokalizacja: ${currentGeo.lat.toFixed(4)}, ${currentGeo.lng.toFixed(4)}`;
        },
        (error) => {
            let errorMsg = 'Błąd lokalizacji.';
            switch(error.code) {
                case error.PERMISSION_DENIED: errorMsg = 'Odmowa dostępu do lokalizacji.'; break;
                case error.POSITION_UNAVAILABLE: errorMsg = 'Sygnał GPS niedostępny.'; break;
                case error.TIMEOUT: errorMsg = 'Przekroczono czas oczekiwania na GPS.'; break;
            }
            geoStatus.innerText = `❌ ${errorMsg}`;
            console.error('Geo error:', error);
        },
        { timeout: 10000, enableHighAccuracy: true }
    );
});

// --- 6. Form Logic & Saving ---
const saveBtn = document.getElementById('saveBtn');
const descInput = document.getElementById('descInput');

saveBtn.addEventListener('click', () => {
    alert("Button Pressed!");
    console.log("Próba zapisu...");

    if (!currentImageBase64) {
        alert("Najpierw zrób zdjęcie! 📸");
        return;
    }
    if (!descInput.value.trim()) {
        alert("Dodaj opis! 📝");
        descInput.focus();
        return;
    }

    const newMoment = {
        id: Date.now(),
        image: currentImageBase64,
        geo: currentGeo,
        desc: descInput.value.trim(),
        date: new Date().toLocaleString('pl-PL')
    };

    try {
        saveData(newMoment);
        
        if(navigator.vibrate) navigator.vibrate([200]);
        alert("Moment zapisany! 🎉");
        router('home');

    } catch (error) {
        console.error("Critical Save Error:", error);

        if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
            alert("BŁĄD ZAPISU: Brak miejsca w pamięci przeglądarki. Spróbuj usunąć stare wpisy w zakładce Info.");
        } else {
            alert("Wystąpił nieoczekiwany błąd podczas zapisywania. Zobacz konsolę.");
        }
    }
});

function resetForm() {
    currentImageBase64 = null;
    currentGeo = null;
    descInput.value = '';
    previewArea.innerHTML = '';
    geoStatus.innerText = 'Lokalizacja nieznana';

    cameraInput.value = '';
}

// --- 7. Data Storage (LocalStorage) ---
function saveData(moment) {

    let existing = [];
    try {
        existing = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
        console.warn("Data corrupted, resetting list", e);
        existing = [];
    }
    
    existing.unshift(moment);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

function renderGallery() {
    const list = document.getElementById('moments-list');
    let data = [];
    try {
        data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
         console.error("Error reading storage for gallery", e);
         list.innerHTML = '<p class="empty-state error">Błąd odczytu danych.</p>';
         return;
    }

    if (data.length === 0) {
        list.innerHTML = '<p class="empty-state">Brak zapisanych momentów. Dodaj pierwszy!</p>';
        return;
    }

    // Generowanie HTML kart
    list.innerHTML = data.map(item => `
        <div class="card">
            <img src="${item.image}" alt="Moment" loading="lazy">
            <div class="card-content">
                <h3>${escapeHtml(item.desc)}</h3>
                <p class="date"><small>📅 ${item.date}</small></p>
                ${item.geo ? `<p class="geo-link">📍 <a href="https://www.google.com/maps/search/?api=1&query=${item.geo.lat},${item.geo.lng}" target="_blank" rel="noopener">Zobacz na mapie</a></p>` : ''}
            </div>
        </div>
    `).join('');
}

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// --- 8. Network Status Monitoring ---
// Informowanie o trybie offline (kr3)
function updateOnlineStatus() {
    const statusElem = document.getElementById('network-status');
    const banner = document.getElementById('offline-banner');
    
    if(navigator.onLine) {
        statusElem.innerText = "Online 🟢";
        statusElem.style.color = "green";
        banner.classList.add('hidden');
    } else {
        statusElem.innerText = "Offline 🔴";
        statusElem.style.color = "red";
        banner.classList.remove('hidden');
    }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();

// Clear data logic
document.getElementById('clearData').addEventListener('click', () => {
    if(confirm("Czy na pewno chcesz usunąć WSZYSTKIE zapisane momenty? Tej operacji nie można cofnąć.")) {
        localStorage.removeItem(STORAGE_KEY);
        alert('Dane wyczyszczone!');
        renderGallery();
    }
});

// Init
document.addEventListener('DOMContentLoaded', () => {
    router('home');
});