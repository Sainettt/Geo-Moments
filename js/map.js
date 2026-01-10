
import { escapeHtml } from './utils.js';
import { getMomentsFromDB } from './db.js';

let mapInstance = null;
let mapMarkers = [];

export async function initMap() {

    if (mapInstance) {
        setTimeout(() => mapInstance.invalidateSize(), 100);
        await loadMapMarkers();
        return;
    }

    // Check if Leaflet is loaded and map container exists
    if (typeof L === 'undefined' || !document.getElementById('map-container')) return;

    // Центрируем на Польше (Варшава)
    mapInstance = L.map('map-container').setView([52.2297, 21.0122], 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(mapInstance);

    await loadMapMarkers();
}

async function loadMapMarkers() {
    if (!mapInstance) return;
    
    // Clear existing markers
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