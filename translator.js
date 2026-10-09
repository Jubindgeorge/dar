// translator.js — secure client-side bridge to a server-side translation endpoint.
// Configure /api/translate-company-name on your server; keep Gemini credentials server-side.

window.translateCompanyName = async function translateCompanyName(englishName) {
    const name = String(englishName ?? '').trim();
    if (!name) return '';
    if (name.length > 300) {
        console.warn('Company name is too long to translate.');
        return '';
    }

    try {
        const response = await fetch('/api/translate-company-name', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ companyName: name })
        });
        if (!response.ok) {
            console.error('Translation endpoint returned HTTP', response.status);
            return '';
        }
        const payload = await response.json();
        const translated = typeof payload?.translation === 'string' ? payload.translation.trim() : '';
        return translated.slice(0, 300);
    } catch (error) {
        console.error('Company-name translation failed.', error);
        return '';
    }
};

// Compatibility aliases used by existing UI code.
window._geminiTranslate = window.translateCompanyName;
window.autoTranslateToArabic = window.translateCompanyName;

window.batchUpdateAllArabicNames = async function batchUpdateAllArabicNames() {
    const currentState = (typeof state !== 'undefined' && state && typeof state === 'object') ? state : null;
    if (!currentState || !Array.isArray(currentState.clients) || currentState.clients.length === 0) return;

    let changed = false;
    for (const client of currentState.clients) {
        if (!client?.companyName || String(client.nameAr || '').trim()) continue;
        const translated = await window.translateCompanyName(client.companyName);
        if (translated) { client.nameAr = translated; changed = true; }
    }
    if (changed && typeof saveStateToFirebase === 'function') {
        try { await saveStateToFirebase(); }
        catch (error) { console.error('Unable to save translated company names.', error); }
    }
    if (changed && typeof renderClientsTable === 'function') renderClientsTable();
};
