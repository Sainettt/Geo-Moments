
import { getMomentsFromDB, deleteMomentFromDB } from './db.js';
import { escapeHtml } from './utils.js';
import { initMap } from './map.js';

// Redner the gallery of moments
export async function renderGallery() {
    const list = document.getElementById('moments-list');
    let data = [];
    
    try {
        data = await getMomentsFromDB();
    } catch (e) {
        console.error("UI Error:", e);
        list.innerHTML = '<p class="empty-state">Błąd bazy danych.</p>';
        return;
    }

    if (data.length === 0) {
        list.innerHTML = '<p class="empty-state">Brak zapisanych momentów. Dodaj pierwszy!</p>';
        return;
    }

    list.innerHTML = data.map(item => `
        <div class="card" data-id="${item.id}">
            <img src="${item.image}" alt="Moment" loading="lazy">
            <div class="card-content">
                <h3>${escapeHtml(item.desc)}</h3>
                <p class="date"><small>📅 ${item.date}</small></p>
                
                ${item.audio ? `<audio controls src="${item.audio}" style="width:100%; margin:10px 0;" onclick="event.stopPropagation()"></audio>` : ''}
                
                ${item.geo ? `<p class="geo-link">📍 <a href="https://www.google.com/maps?q=${item.geo.lat},${item.geo.lng}" target="_blank" rel="noopener" onclick="event.stopPropagation()">Zobacz na mapie</a></p>` : ''}
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('click', () => openDetails(parseInt(card.dataset.id)));
    });
}

// Delete moment logic
async function openDetails(id) {
    if(confirm("Czy chcesz usunąć ten moment? 🗑️")) {
        try {
            await deleteMomentFromDB(id);
            await renderGallery();
            // Update map markers
            initMap(); 
        } catch(e) {
            alert("Błąd podczas usuwania: " + e);
        }
    }
}

// State internet status
export function updateOnlineStatus() {
    const status = navigator.onLine ? "Online 🟢" : "Offline 🔴";
    const el = document.getElementById('network-status');
    if(el) el.innerText = status;
    
    const banner = document.getElementById('offline-banner');
    if(banner) navigator.onLine ? banner.classList.add('hidden') : banner.classList.remove('hidden');
}