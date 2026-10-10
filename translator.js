// translator.js — browser client for the server-side translation endpoint.
// Keep the public function names used by the existing UI.
(function () {
    const translationEndpoint = '/api/translate-company-name';

    function fallbackArabic(companyName) {
        const words = String(companyName || '').trim().split(/\s+/).filter(Boolean);
        if (!words.length) return '';
        return words.map(word => {
            const key = word.toLowerCase().replace(/[^a-z]/g, '');
            if (translationGlossary && translationGlossary[key]) return translationGlossary[key];
            return word.split('').map(ch => (phoneticMap && phoneticMap[ch.toLowerCase()]) || ch).join('');
        }).join(' ');
    }

    window.translateCompanyName = async function (englishName) {
        const cleanName = String(englishName || '').trim();
        if (!cleanName) return '';
        try {
            const response = await fetch(translationEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ companyName: cleanName })
            });
            if (!response.ok) throw new Error(`Translation endpoint returned ${response.status}`);
            const data = await response.json();
            const translated = String(data.translation || '').trim();
            return translated || fallbackArabic(cleanName);
        } catch (error) {
            console.warn('Arabic translation endpoint unavailable; using local phonetic fallback.', error);
            return fallbackArabic(cleanName);
        }
    };

    window._geminiTranslate = window.translateCompanyName;

    window.batchUpdateAllArabicNames = async function () {
        if (!Array.isArray(state.clients) || state.clients.length === 0) return;
        let changed = 0;
        for (const client of state.clients) {
            if (client.companyName && !String(client.nameAr || '').trim()) {
                client.nameAr = await window.translateCompanyName(client.companyName);
                if (client.nameAr) changed++;
            }
        }
        if (changed && typeof saveStateToFirebase === 'function') await saveStateToFirebase();
        if (typeof renderClientsTable === 'function') renderClientsTable();
        if (typeof showCustomModal === 'function') showCustomModal('Arabic names updated', `${changed} client name(s) processed. Please review phonetic fallback results before official use.`);
    };
})();
