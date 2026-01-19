import { getMomentsFromDB, deleteMomentFromDB } from './db.js';
import { escapeHtml } from './utils.js';
import { initMap } from './map.js';

/**
 * Renders the list of moments in the 'home' view.
 * Dynamically creates HTML string and injects into DOM.
 */
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

    // NOTE: onclick="event.stopPropagation()" is used on Audio and Link elements.
    // This prevents the click from bubbling up to the card, which would trigger the delete dialog.
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

    // Attach click listeners to cards for the delete action
    document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('click', () => openDetails(parseInt(card.dataset.id)));
    });
}

/**
 * Triggered when a card is clicked. Asks for confirmation before deleting.
 */
async function openDetails(id) {
    if(confirm("Czy chcesz usunąć ten moment? 🗑️")) {
        try {
            await deleteMomentFromDB(id);
            await renderGallery();
            // Update map markers if map exists
            initMap(); 
        } catch(e) {
            alert("Błąd podczas usuwania: " + e);
        }
    }
}

/**
 * Updates the network status text and the offline banner visibility.
 */
export function updateOnlineStatus() {
    const status = navigator.onLine ? "Online 🟢" : "Offline 🔴";
    const el = document.getElementById('network-status');
    if(el) el.innerText = status;
    
    const banner = document.getElementById('offline-banner');
    if(banner) navigator.onLine ? banner.classList.add('hidden') : banner.classList.remove('hidden');
}