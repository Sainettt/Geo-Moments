/**
 * Compresses an image file using the Canvas API.
 * This is crucial for performance and ensuring data fits in IndexedDB.
 * * @param {File} file - The original image file
 * @returns {Promise<string>} - Base64 string of the resized image
 */
export function resizeImage(file) {
    const maxWidth = 1024;
    const quality = 0.7; // 70% JPEG quality

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                // Calculate new dimensions keeping aspect ratio
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height = Math.round(height * (maxWidth / width));
                    width = maxWidth;
                }
                
                // Draw to canvas and export as Data URL
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

/**
 * Escapes special characters to prevent Cross-Site Scripting (XSS) attacks.
 * Should be used whenever displaying user-generated text.
 */
export function escapeHtml(unsafe) {
    if (!unsafe) return "";
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

/**
 * Detects the best supported audio MIME type for the current browser.
 * Needed because iOS supports different formats than Chrome/Android.
 */
export function getSupportedMimeType() {
    const types = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'];
    for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return '';
}