// ui.js
window.autoTranslateToArabic = function(text) {
    if (!text) return '';
    return text;
};

window.showCustomModal = function(title, message, customButtonsHTML = null) {
    const titleEl = document.getElementById('modal-title');
    const msgEl = document.getElementById('modal-message');
    const actionsEl = document.getElementById('modal-actions');

    if (titleEl) titleEl.innerText = title;
    if (msgEl) msgEl.innerHTML = message;
    
    if (actionsEl) {
        if (customButtonsHTML) {
            actionsEl.innerHTML = customButtonsHTML;
        } else {
            actionsEl.innerHTML = `<button onclick="closeCustomModal()" class="btn btn-primary">OK</button>`;
        }
    }

    const modal = document.getElementById('custom-modal');
    if (modal) modal.style.display = 'flex';
};

window.closeCustomModal = function() {
    const modal = document.getElementById('custom-modal');
    if (modal) modal.style.display = 'none';
};
