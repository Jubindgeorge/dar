// ui.js - Custom Modals & Translation Utilities
function showCustomModal(title, message, customActionsHTML = '') {
    const modal = document.getElementById('custom-modal');
    if (!modal) return;

    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-message').innerHTML = message;
    
    const actionsContainer = document.getElementById('modal-actions');
    if (actionsContainer) {
        if (customActionsHTML) {
            actionsContainer.innerHTML = customActionsHTML;
        } else {
            actionsContainer.innerHTML = `<button onclick="closeCustomModal()" class="btn btn-primary">OK</button>`;
        }
    }
    modal.style.display = 'flex';
}

function closeCustomModal() {
    const modal = document.getElementById('custom-modal');
    if (modal) modal.style.display = 'none';
}

// Asynchronous Arabic translation handler with Gemini fallback
async function autoTranslateToArabic(text) {
    if (!text) return '';
    if (window._geminiTranslate && typeof window._geminiTranslate === 'function') {
        return await window._geminiTranslate(text);
    }
    return text;
}