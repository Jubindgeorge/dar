// translator.js
import { GoogleGenAI } from "@google/genai";

window.translateCompanyName = async function(englishName) {
    if (!englishName || !englishName.trim()) return '';

    // Fixed: Look up the storage key properly (or fallback to your key if needed)
    const apiKey = localStorage.getItem('gemini_api_key') || 'AQ.Ab8RN6JkRhWjGB2-AxyzJIS_4HadUntkx8ksOcbi9biG7IcdiQ';
    if (!apiKey) {
        console.error("Gemini API key is missing. Please set 'gemini_api_key' in localStorage.");
        return '';
    }

    try {
        const ai = new GoogleGenAI({ apiKey: apiKey });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Translate the following company or client name into official, professional Arabic business terminology used in UAE commercial registries. Return ONLY the translated Arabic text with no extra conversational remarks, explanations, or quotes: "${englishName}"`
        });
        const translated = response.text ? response.text.trim() : '';
        return translated;
    } catch (error) {
        console.error("Gemini Translation Error:", error);
        return '';
    }
};

// Bridge for ui.js autoTranslateToArabic compatibility
window._geminiTranslate = window.translateCompanyName;

window.batchUpdateAllArabicNames = async function() {
    if (!state.clients || state.clients.length === 0) return;
    for (let client of state.clients) {
        if (client.companyName && (!client.nameAr || client.nameAr === '')) {
            client.nameAr = await window.translateCompanyName(client.companyName);
        }
    }
    if (typeof saveStateToFirebase === 'function') saveStateToFirebase();
    if (typeof renderClientsTable === 'function') renderClientsTable();
};
