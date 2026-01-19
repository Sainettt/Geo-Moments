const DB_NAME = 'GeoMomentsDB';
const DB_VERSION = 1;
const STORE_NAME = 'moments';
let db = null;

/**
 * Opens the IndexedDB connection.
 * Handles the 'onupgradeneeded' event to create the Object Store (table)
 * if it doesn't exist (first run or version change).
 */
export function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            // Create store only if it doesn't exist yet
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

/**
 * Saves a moment object to the database.
 * Uses a 'readwrite' transaction.
 */
export function addMomentToDB(moment) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(moment);
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
    });
}

/**
 * Retrieves all moments from the database.
 * * NOTE: Includes a safety check. If 'db' is null (connection lost or not init),
 * it recursively calls initDB() first to ensure the operation succeeds.
 */
export function getMomentsFromDB() {
    return new Promise((resolve, reject) => {
        if (!db) {
            initDB().then(() => getMomentsFromDB().then(resolve).catch(reject));
            return;
        }
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            // Sort results by ID (timestamp) descending -> newest first
            const result = request.result.sort((a, b) => b.id - a.id);
            resolve(result);
        };
        request.onerror = (e) => reject(e.target.error);
    });
}

/**
 * Deletes a specific moment by its ID.
 */
export function deleteMomentFromDB(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
    });
}

/**
 * Wipes all data from the Object Store.
 */
export function clearDB() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
    });
}